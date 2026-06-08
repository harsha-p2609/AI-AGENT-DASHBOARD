package com.dashboard.backend.service;

import com.dashboard.backend.model.Task;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.LocalDate;
import java.util.*;

@Service
public class GeminiService {

    @Value("${gemini.api.key}")
    private String apiKey;

    @Value("${gemini.model}")
    private String modelName;

    @Autowired
    private WeatherService weatherService;

    @Autowired
    private NewsService newsService;

    @Autowired
    private GitHubService gitHubService;

    @Autowired
    private TaskService taskService;

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(30))
            .build();

    private final ObjectMapper objectMapper = new ObjectMapper();

    public interface SseReporter {
        void sendStatus(String message);
        void sendToolCall(String name, String arguments);
        void sendToolResult(String name, String result);
        void sendTextChunk(String chunk);
        void sendError(String error);
        void sendDone();
    }

    public void processAgentChat(String userMessage, List<Map<String, String>> history, SseReporter reporter) {
        if (apiKey == null || apiKey.trim().isEmpty() || apiKey.equals("mock_key")) {
            runMockAgent(userMessage, reporter);
            return;
        }

        try {
            reporter.sendStatus("Analyzing your request...");

            List<ObjectNode> messages = new ArrayList<>();

            // Map history
            for (Map<String, String> hist : history) {
                ObjectNode histMsg = objectMapper.createObjectNode();
                String role = hist.get("role");
                histMsg.put("role", "assistant".equals(role) ? "model" : "user");
                ArrayNode parts = histMsg.putArray("parts");
                parts.addObject().put("text", hist.get("content"));
                messages.add(histMsg);
            }

            // Map current message
            ObjectNode userMsg = objectMapper.createObjectNode();
            userMsg.put("role", "user");
            ArrayNode userParts = userMsg.putArray("parts");
            userParts.addObject().put("text", userMessage);
            messages.add(userMsg);

            boolean loop = true;
            int maxIterations = 5;
            int iteration = 0;

            while (loop && iteration < maxIterations) {
                iteration++;

                // Construct Request Body for Gemini
                ObjectNode requestBody = objectMapper.createObjectNode();
                requestBody.set("systemInstruction", getSystemInstructionSchema());

                ArrayNode contentsArray = requestBody.putArray("contents");
                for (ObjectNode node : messages) {
                    contentsArray.add(node);
                }

                requestBody.set("tools", getToolsSchema());

                ObjectNode toolConfig = requestBody.putObject("toolConfig");
                ObjectNode functionCallingConfig = toolConfig.putObject("functionCallingConfig");
                functionCallingConfig.put("mode", "AUTO");

                String url = String.format("https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s",
                        modelName, apiKey);

                HttpRequest request = HttpRequest.newBuilder()
                        .uri(URI.create(url))
                        .header("Content-Type", "application/json")
                        .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(requestBody)))
                        .build();

                reporter.sendStatus("Checking with AI planner...");
                HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

                if (response.statusCode() != 200) {
                    throw new Exception("Gemini API returned error: " + response.body());
                }

                JsonNode root = objectMapper.readTree(response.body());
                
                if (!root.has("candidates") || root.path("candidates").isEmpty()) {
                    throw new Exception("No candidates returned from Gemini API");
                }

                JsonNode candidate = root.path("candidates").get(0);
                JsonNode content = candidate.path("content");
                JsonNode parts = content.path("parts");

                boolean hasToolCall = false;

                if (parts.isArray()) {
                    for (JsonNode part : parts) {
                        if (part.has("functionCall")) {
                            hasToolCall = true;
                            JsonNode functionCall = part.path("functionCall");
                            String toolName = functionCall.path("name").asText();
                            JsonNode argsNode = functionCall.path("args");
                            String arguments = objectMapper.writeValueAsString(argsNode);

                            reporter.sendToolCall(toolName, arguments);
                            reporter.sendStatus("Executing " + toolName + "...");

                            // Execute local tool
                            String result = executeLocalTool(toolName, arguments);
                            reporter.sendToolResult(toolName, result);

                            // Add model message containing the tool call to history
                            ObjectNode modelMsg = objectMapper.createObjectNode();
                            modelMsg.put("role", "model");
                            ArrayNode modelParts = modelMsg.putArray("parts");
                            ObjectNode fnCallPart = modelParts.addObject();
                            fnCallPart.set("functionCall", functionCall);
                            messages.add(modelMsg);

                            // Add function response message to history
                            ObjectNode funcMsg = objectMapper.createObjectNode();
                            funcMsg.put("role", "function");
                            ArrayNode funcParts = funcMsg.putArray("parts");
                            ObjectNode fnResponsePart = funcParts.addObject();
                            ObjectNode fnResponse = fnResponsePart.putObject("functionResponse");
                            fnResponse.put("name", toolName);
                            ObjectNode responseObj = fnResponse.putObject("response");
                            responseObj.put("content", result);
                            messages.add(funcMsg);
                        }
                    }
                }

                if (!hasToolCall) {
                    // No more tool calls, stream final text response
                    loop = false;
                    streamFinalResponse(messages, reporter);
                }
            }

            if (iteration >= maxIterations) {
                reporter.sendError("AI agent reached maximum tool calling loop depth.");
            }

        } catch (Exception e) {
            reporter.sendError(e.getMessage());
        }
    }

    private void streamFinalResponse(List<ObjectNode> messages, SseReporter reporter) throws Exception {
        reporter.sendStatus("Generating final summary...");

        ObjectNode requestBody = objectMapper.createObjectNode();
        requestBody.set("systemInstruction", getSystemInstructionSchema());

        ArrayNode contentsArray = requestBody.putArray("contents");
        for (ObjectNode node : messages) {
            contentsArray.add(node);
        }

        String url = String.format("https://generativelanguage.googleapis.com/v1beta/models/%s:streamGenerateContent?key=%s&alt=sse",
                modelName, apiKey);

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(requestBody)))
                .build();

        HttpResponse<InputStreamReader> response = httpClient.send(request,
                responseInfo -> HttpResponse.BodySubscribers.mapping(
                        HttpResponse.BodySubscribers.ofInputStream(),
                        is -> new InputStreamReader(is, StandardCharsets.UTF_8)
                ));

        if (response.statusCode() != 200) {
            throw new Exception("Error during streaming setup. Status code: " + response.statusCode());
        }

        try (BufferedReader reader = new BufferedReader(response.body())) {
            String line;
            while ((line = reader.readLine()) != null) {
                if (line.startsWith("data: ")) {
                    String data = line.substring(6).trim();
                    if (data.isEmpty()) continue;
                    try {
                        JsonNode chunkNode = objectMapper.readTree(data);
                        JsonNode textNode = chunkNode.path("candidates").get(0).path("content").path("parts").get(0).path("text");
                        if (!textNode.isMissingNode() && !textNode.isNull()) {
                            reporter.sendTextChunk(textNode.asText());
                        }
                    } catch (Exception ignored) {
                    }
                }
            }
        }
        reporter.sendDone();
    }

    private String executeLocalTool(String name, String argumentsJson) {
        try {
            JsonNode args = objectMapper.readTree(argumentsJson);
            switch (name) {
                case "fetchWeather": {
                    String city = args.path("city").asText("San Francisco");
                    Map<String, Object> weather = weatherService.getWeather(city);
                    return objectMapper.writeValueAsString(weather);
                }
                case "fetchTechNews": {
                    String query = args.path("query").asText("technology");
                    List<Map<String, Object>> news = newsService.getTechNews(query);
                    return objectMapper.writeValueAsString(news);
                }
                case "fetchGitHubActivity": {
                    String username = args.path("username").asText("octocat");
                    Map<String, Object> activity = gitHubService.getGitHubActivity(username);
                    return objectMapper.writeValueAsString(activity);
                }
                case "createTask": {
                    String title = args.path("title").asText("New Task");
                    String description = args.path("description").asText("");
                    String priority = args.path("priority").asText("MEDIUM");
                    String dueDateStr = args.path("dueDate").asText("");

                    Task task = new Task();
                    task.setTitle(title);
                    task.setDescription(description);
                    task.setPriority(priority.toUpperCase());
                    task.setStatus("TODO");
                    if (!dueDateStr.isEmpty()) {
                        task.setDueDate(LocalDate.parse(dueDateStr));
                    } else {
                        task.setDueDate(LocalDate.now().plusDays(1));
                    }
                    Task created = taskService.createTask(task);
                    return objectMapper.writeValueAsString(created);
                }
                case "getTasks": {
                    List<Task> tasks = taskService.getAllTasks();
                    return objectMapper.writeValueAsString(tasks);
                }
                case "updateTask": {
                    Long id = args.path("id").asLong();
                    Task details = new Task();
                    if (args.has("title")) details.setTitle(args.path("title").asText());
                    if (args.has("description")) details.setDescription(args.path("description").asText());
                    if (args.has("status")) details.setStatus(args.path("status").asText().toUpperCase());
                    if (args.has("priority")) details.setPriority(args.path("priority").asText().toUpperCase());
                    if (args.has("dueDate")) details.setDueDate(LocalDate.parse(args.path("dueDate").asText()));

                    Optional<Task> updated = taskService.updateTask(id, details);
                    if (updated.isPresent()) {
                        return objectMapper.writeValueAsString(updated.get());
                    } else {
                        return "{\"error\": \"Task not found with ID " + id + "\"}";
                    }
                }
                case "deleteTask": {
                    Long id = args.path("id").asLong();
                    boolean deleted = taskService.deleteTask(id);
                    return "{\"success\": " + deleted + ", \"deletedId\": " + id + "}";
                }
                default:
                    return "{\"error\": \"Unknown tool: " + name + "\"}";
            }
        } catch (Exception e) {
            return "{\"error\": \"Tool execution failed: " + e.getMessage() + "\"}";
        }
    }

    private ObjectNode getSystemInstructionSchema() {
        ObjectNode systemInstruction = objectMapper.createObjectNode();
        ArrayNode parts = systemInstruction.putArray("parts");
        parts.addObject().put("text", "You are an intelligent IT Productivity Assistant embedded in a developer dashboard. " +
                "Your role is to help busy IT professionals manage tasks, summarize technology news, search weather info, and query GitHub activities. " +
                "Use the provided tools autonomously whenever a user asks questions that require external data (weather, news, github) or actions (CRUD tasks). " +
                "Always summarize data in a clean, concise, markdown-formatted way. " +
                "If you perform actions like creating or updating tasks, confirm the details to the user.");
        return systemInstruction;
    }

    private ArrayNode getToolsSchema() {
        ArrayNode tools = objectMapper.createArrayNode();
        ObjectNode toolWrapper = tools.addObject();
        ArrayNode declarations = toolWrapper.putArray("functionDeclarations");

        // 1. fetchWeather
        ObjectNode f1 = declarations.addObject();
        f1.put("name", "fetchWeather");
        f1.put("description", "Fetch live weather information for a city");
        ObjectNode p1 = f1.putObject("parameters");
        p1.put("type", "OBJECT");
        ObjectNode prop1 = p1.putObject("properties");
        prop1.putObject("city").put("type", "STRING").put("description", "The city name, e.g., Tokyo");
        p1.putArray("required").add("city");

        // 2. fetchTechNews
        ObjectNode f2 = declarations.addObject();
        f2.put("name", "fetchTechNews");
        f2.put("description", "Summarize latest technology news articles");
        ObjectNode p2 = f2.putObject("parameters");
        p2.put("type", "OBJECT");
        ObjectNode prop2 = p2.putObject("properties");
        prop2.putObject("query").put("type", "STRING").put("description", "The keyword to search for, e.g., databases or OpenAI");

        // 3. fetchGitHubActivity
        ObjectNode f3 = declarations.addObject();
        f3.put("name", "fetchGitHubActivity");
        f3.put("description", "Show recent GitHub commits, repositories, and pull requests for a user");
        ObjectNode p3 = f3.putObject("parameters");
        p3.put("type", "OBJECT");
        ObjectNode prop3 = p3.putObject("properties");
        prop3.putObject("username").put("type", "STRING").put("description", "The GitHub username, e.g., torvalds");
        p3.putArray("required").add("username");

        // 4. createTask
        ObjectNode f4 = declarations.addObject();
        f4.put("name", "createTask");
        f4.put("description", "Create a new productivity task in the manager");
        ObjectNode p4 = f4.putObject("parameters");
        p4.put("type", "OBJECT");
        ObjectNode prop4 = p4.putObject("properties");
        prop4.putObject("title").put("type", "STRING").put("description", "The task title (required)");
        prop4.putObject("description").put("type", "STRING").put("description", "Description details (optional)");
        prop4.putObject("dueDate").put("type", "STRING").put("description", "Due date in YYYY-MM-DD format (optional)");
        prop4.putObject("priority").put("type", "STRING").put("description", "Priority level: LOW, MEDIUM, or HIGH (optional)");
        p4.putArray("required").add("title");

        // 5. getTasks
        ObjectNode f5 = declarations.addObject();
        f5.put("name", "getTasks");
        f5.put("description", "Get all active tasks in the task manager");
        ObjectNode p5 = f5.putObject("parameters");
        p5.put("type", "OBJECT");
        p5.putObject("properties");

        // 6. updateTask
        ObjectNode f6 = declarations.addObject();
        f6.put("name", "updateTask");
        f6.put("description", "Update details of an existing task");
        ObjectNode p6 = f6.putObject("parameters");
        p6.put("type", "OBJECT");
        ObjectNode prop6 = p6.putObject("properties");
        prop6.putObject("id").put("type", "NUMBER").put("description", "The ID of the task to update");
        prop6.putObject("title").put("type", "STRING");
        prop6.putObject("description").put("type", "STRING");
        prop6.putObject("status").put("type", "STRING").put("description", "TODO, IN_PROGRESS, or COMPLETED");
        prop6.putObject("priority").put("type", "STRING").put("description", "LOW, MEDIUM, or HIGH");
        prop6.putObject("dueDate").put("type", "STRING").put("description", "YYYY-MM-DD");
        p6.putArray("required").add("id");

        // 7. deleteTask
        ObjectNode f7 = declarations.addObject();
        f7.put("name", "deleteTask");
        f7.put("description", "Delete a task from the task manager");
        ObjectNode p7 = f7.putObject("parameters");
        p7.put("type", "OBJECT");
        ObjectNode prop7 = p7.putObject("properties");
        prop7.putObject("id").put("type", "NUMBER").put("description", "The task ID to delete");
        p7.putArray("required").add("id");

        return tools;
    }

    private void runMockAgent(String message, SseReporter reporter) {
        try {
            String query = message.toLowerCase();
            reporter.sendStatus("Analyzing query in simulated mode...");
            Thread.sleep(800);

            if (query.contains("weather")) {
                String city = "San Francisco";
                if (query.contains("in ")) {
                    int idx = query.indexOf("in ");
                    city = message.substring(idx + 3).trim().replace("?", "");
                }
                reporter.sendStatus("Simulating AI tool decision...");
                Thread.sleep(600);
                reporter.sendToolCall("fetchWeather", "{\"city\":\"" + city + "\"}");
                reporter.sendStatus("Calling Weather API for " + city + "...");
                Thread.sleep(1000);

                Map<String, Object> weather = weatherService.getWeather(city);
                String result = objectMapper.writeValueAsString(weather);
                reporter.sendToolResult("fetchWeather", result);
                Thread.sleep(500);

                reporter.sendStatus("Generating final summary...");
                Thread.sleep(400);
                String responseText = "### Weather Report for **" + weather.get("city") + "**\n\n" +
                        "Here is the current weather update:\n\n" +
                        "- **Temperature:** " + weather.get("temp") + "°C (Feels like " + weather.get("feelsLike") + "°C)\n" +
                        "- **Condition:** " + weather.get("description") + "\n" +
                        "- **Humidity:** " + weather.get("humidity") + "%\n" +
                        "- **Wind Speed:** " + weather.get("windSpeed") + " m/s\n\n" +
                        "Let me know if you need to create any tasks related to this weather or prepare for your commute!";

                streamStringResponse(responseText, reporter);
            }
            else if (query.contains("news") || query.contains("headline")) {
                String q = "technology";
                if (query.contains("about ")) {
                    int idx = query.indexOf("about ");
                    q = message.substring(idx + 6).trim().replace("?", "");
                }
                reporter.sendStatus("Simulating AI tool decision...");
                Thread.sleep(600);
                reporter.sendToolCall("fetchTechNews", "{\"query\":\"" + q + "\"}");
                reporter.sendStatus("Fetching tech news for '" + q + "'...");
                Thread.sleep(1000);

                List<Map<String, Object>> news = newsService.getTechNews(q);
                String result = objectMapper.writeValueAsString(news);
                reporter.sendToolResult("fetchTechNews", result);
                Thread.sleep(500);

                reporter.sendStatus("Summarizing articles...");
                Thread.sleep(400);

                StringBuilder sb = new StringBuilder("### Latest Tech News Summary\n\n");
                for (int i = 0; i < Math.min(3, news.size()); i++) {
                    Map<String, Object> art = news.get(i);
                    sb.append("#### ").append(i + 1).append(". [").append(art.get("title")).append("](")
                      .append(art.get("url")).append(")\n")
                      .append("*Source: ").append(art.get("source")).append("*\n")
                      .append("> ").append(art.get("description")).append("\n\n");
                }
                sb.append("This summary was curated autonomously based on recent search feeds. Let me know if you would like me to create a task to review any of these articles!");

                streamStringResponse(sb.toString(), reporter);
            }
            else if (query.contains("github") || query.contains("commit") || query.contains("repo")) {
                String username = "octocat";
                if (query.contains("user ")) {
                    int idx = query.indexOf("user ");
                    username = message.substring(idx + 5).trim().replace("?", "");
                } else if (query.contains("for ")) {
                    int idx = query.indexOf("for ");
                    username = message.substring(idx + 4).trim().replace("?", "");
                }
                reporter.sendStatus("Simulating AI tool decision...");
                Thread.sleep(600);
                reporter.sendToolCall("fetchGitHubActivity", "{\"username\":\"" + username + "\"}");
                reporter.sendStatus("Fetching GitHub profile and activity for " + username + "...");
                Thread.sleep(1000);

                Map<String, Object> github = gitHubService.getGitHubActivity(username);
                String result = objectMapper.writeValueAsString(github);
                reporter.sendToolResult("fetchGitHubActivity", result);
                Thread.sleep(500);

                reporter.sendStatus("Drafting developer status summary...");
                Thread.sleep(400);

                StringBuilder sb = new StringBuilder("### GitHub Developer Overview: **" + github.get("name") + "** (@" + github.get("username") + ")\n\n");
                sb.append("*Bio: ").append(github.get("bio")).append("*\n\n");
                sb.append("- **Public Repositories:** ").append(github.get("publicRepos")).append("\n");
                sb.append("- **Followers:** ").append(github.get("followers")).append(" | **Following:** ").append(github.get("following")).append("\n\n");

                sb.append("#### Recent Activity Feed:\n");
                List<Map<String, Object>> events = (List<Map<String, Object>>) github.get("events");
                for (int i = 0; i < Math.min(3, events.size()); i++) {
                    Map<String, Object> ev = events.get(i);
                    sb.append("- [").append(ev.get("type")).append("] in *").append(ev.get("repo")).append("*: ").append(ev.get("message")).append("\n");
                }
                sb.append("\nLet me know if you want me to track any tasks related to your GitHub workspace updates!");

                streamStringResponse(sb.toString(), reporter);
            }
            else if (query.contains("create task") || query.contains("add task") || query.contains("remind me")) {
                reporter.sendStatus("Parsing task title and parameters...");
                Thread.sleep(500);

                String title = "Review server configs";
                String desc = "Created by AI agent";
                String priority = "MEDIUM";

                if (query.contains("task to ")) {
                    int idx = query.indexOf("task to ");
                    title = message.substring(idx + 8).trim().replace("?", "");
                } else if (query.contains("remind me to ")) {
                    int idx = query.indexOf("remind me to ");
                    title = message.substring(idx + 13).trim().replace("?", "");
                }

                if (query.contains("high priority")) {
                    priority = "HIGH";
                } else if (query.contains("low priority")) {
                    priority = "LOW";
                }

                reporter.sendStatus("Simulating AI tool decision...");
                Thread.sleep(600);

                String jsonParams = String.format("{\"title\":\"%s\",\"description\":\"%s\",\"priority\":\"%s\"}", title, desc, priority);
                reporter.sendToolCall("createTask", jsonParams);
                reporter.sendStatus("Creating task in database...");
                Thread.sleep(800);

                Task task = new Task();
                task.setTitle(title);
                task.setDescription(desc);
                task.setPriority(priority);
                task.setStatus("TODO");
                task.setDueDate(LocalDate.now().plusDays(1));
                Task created = taskService.createTask(task);

                reporter.sendToolResult("createTask", objectMapper.writeValueAsString(created));
                Thread.sleep(400);

                reporter.sendStatus("Confirming task placement...");
                Thread.sleep(400);

                String resp = "I have successfully created your task in the database:\n\n" +
                        "- **Title:** " + created.getTitle() + "\n" +
                        "- **Description:** " + created.getDescription() + "\n" +
                        "- **Priority:** `" + created.getPriority() + "`\n" +
                        "- **Due Date:** " + created.getDueDate() + "\n" +
                        "- **Status:** `" + created.getStatus() + "`\n\n" +
                        "The task is now visible in your Task Manager widget. Let me know if you want me to update or delete it!";

                streamStringResponse(resp, reporter);
            }
            else if (query.contains("get tasks") || query.contains("show tasks") || query.contains("todo list")) {
                reporter.sendStatus("Simulating AI tool decision...");
                Thread.sleep(600);
                reporter.sendToolCall("getTasks", "{}");
                reporter.sendStatus("Fetching task records...");
                Thread.sleep(800);

                List<Task> tasks = taskService.getAllTasks();
                reporter.sendToolResult("getTasks", objectMapper.writeValueAsString(tasks));
                Thread.sleep(500);

                reporter.sendStatus("Formatting list...");
                Thread.sleep(400);

                StringBuilder sb = new StringBuilder("### Your Current Task Backlog:\n\n");
                if (tasks.isEmpty()) {
                    sb.append("You currently have no tasks in your queue! Let me know if you would like to create one.");
                } else {
                    for (Task t : tasks) {
                        String statusEmoji = "COMPLETED".equals(t.getStatus()) ? "✅" : "⬜";
                        String priorityBadge = "`" + t.getPriority() + "`";
                        sb.append("- ").append(statusEmoji).append(" **[").append(t.getId()).append("] ").append(t.getTitle()).append("** - Priority: ").append(priorityBadge).append(" | Due: ").append(t.getDueDate()).append("\n");
                    }
                }

                streamStringResponse(sb.toString(), reporter);
            }
            else {
                // Generic response
                reporter.sendStatus("Formulating general response...");
                Thread.sleep(500);
                String resp = "Hello! I am your AI Productivity Agent. I am connected to several tools in this workspace:\n\n" +
                        "1. **Weather Integration** (e.g. ask \"*What is the weather in Paris?*\")\n" +
                        "2. **Technology News** (e.g. ask \"*Tell me the latest news about AI*\")\n" +
                        "3. **GitHub Activity** (e.g. ask \"*Show github commits for torvalds*\")\n" +
                        "4. **Task Management** (e.g. ask \"*Create a high priority task to debug database connection pool*\")\n\n" +
                        "How can I assist you in your work today?";

                streamStringResponse(resp, reporter);
            }
        } catch (Exception e) {
            reporter.sendError("Simulated chat execution failed: " + e.getMessage());
        }
    }

    private void streamStringResponse(String text, SseReporter reporter) throws InterruptedException {
        String[] words = text.split("(?<=\\s)");
        for (String word : words) {
            reporter.sendTextChunk(word);
            Thread.sleep(20 + new Random().nextInt(30));
        }
        reporter.sendDone();
    }
}
