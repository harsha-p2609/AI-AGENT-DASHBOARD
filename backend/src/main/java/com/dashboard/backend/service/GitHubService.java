package com.dashboard.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.Instant;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class GitHubService {

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(5))
            .build();

    private final ObjectMapper objectMapper = new ObjectMapper();

    public Map<String, Object> getGitHubActivity(String username) {
        if (username == null || username.trim().isEmpty()) {
            username = "octocat";
        }
        username = username.trim();

        Map<String, Object> result = new HashMap<>();
        result.put("username", username);

        try {
            // Fetch User Profile
            HttpRequest userReq = HttpRequest.newBuilder()
                    .uri(URI.create("https://api.github.com/users/" + username))
                    .header("User-Agent", "Dashboard-App")
                    .GET()
                    .build();
            HttpResponse<String> userRes = httpClient.send(userReq, HttpResponse.BodyHandlers.ofString());

            if (userRes.statusCode() == 200) {
                JsonNode userNode = objectMapper.readTree(userRes.body());
                result.put("name", userNode.path("name").asText(username));
                result.put("avatarUrl", userNode.path("avatar_url").asText());
                result.put("publicRepos", userNode.path("public_repos").asInt());
                result.put("followers", userNode.path("followers").asInt());
                result.put("following", userNode.path("following").asInt());
                result.put("bio", userNode.path("bio").asText("No bio available"));
            } else if (userRes.statusCode() == 403) {
                // Rate limited
                return getMockGitHubActivity(username, true);
            } else {
                throw new Exception("GitHub returned status code: " + userRes.statusCode());
            }

            // Fetch Repos
            HttpRequest repoReq = HttpRequest.newBuilder()
                    .uri(URI.create("https://api.github.com/users/" + username + "/repos?sort=updated&per_page=5"))
                    .header("User-Agent", "Dashboard-App")
                    .GET()
                    .build();
            HttpResponse<String> repoRes = httpClient.send(repoReq, HttpResponse.BodyHandlers.ofString());
            List<Map<String, Object>> reposList = new ArrayList<>();
            if (repoRes.statusCode() == 200) {
                JsonNode reposNode = objectMapper.readTree(repoRes.body());
                if (reposNode.isArray()) {
                    for (JsonNode repo : reposNode) {
                        Map<String, Object> repoMap = new HashMap<>();
                        repoMap.put("name", repo.path("name").asText());
                        repoMap.put("description", repo.path("description").asText("No description"));
                        repoMap.put("stars", repo.path("stargazers_count").asInt());
                        repoMap.put("forks", repo.path("forks_count").asInt());
                        repoMap.put("language", repo.path("language").asText("Misc"));
                        repoMap.put("url", repo.path("html_url").asText());
                        reposList.add(repoMap);
                    }
                }
            }
            result.put("repositories", reposList);

            // Fetch Recent Events (Commits, PRs, etc.)
            HttpRequest eventReq = HttpRequest.newBuilder()
                    .uri(URI.create("https://api.github.com/users/" + username + "/events?per_page=10"))
                    .header("User-Agent", "Dashboard-App")
                    .GET()
                    .build();
            HttpResponse<String> eventRes = httpClient.send(eventReq, HttpResponse.BodyHandlers.ofString());
            List<Map<String, Object>> eventsList = new ArrayList<>();
            if (eventRes.statusCode() == 200) {
                JsonNode eventsNode = objectMapper.readTree(eventRes.body());
                if (eventsNode.isArray()) {
                    for (JsonNode event : eventsNode) {
                        String type = event.path("type").asText();
                        String repoName = event.path("repo").path("name").asText();
                        String date = event.path("created_at").asText();

                        Map<String, Object> ev = new HashMap<>();
                        ev.put("repo", repoName);
                        ev.put("date", date);

                        if ("PushEvent".equals(type)) {
                            ev.put("type", "COMMIT");
                            JsonNode commits = event.path("payload").path("commits");
                            String message = commits.isArray() && !commits.isEmpty() ? 
                                    commits.get(0).path("message").asText() : "Pushed commits";
                            ev.put("message", message);
                            eventsList.add(ev);
                        } else if ("PullRequestEvent".equals(type)) {
                            ev.put("type", "PR");
                            String action = event.path("payload").path("action").asText();
                            String title = event.path("payload").path("pull_request").path("title").asText();
                            ev.put("message", action.substring(0, 1).toUpperCase() + action.substring(1) + " PR: " + title);
                            eventsList.add(ev);
                        } else if ("IssuesEvent".equals(type)) {
                            ev.put("type", "ISSUE");
                            String action = event.path("payload").path("action").asText();
                            String title = event.path("payload").path("issue").path("title").asText();
                            ev.put("message", action.substring(0, 1).toUpperCase() + action.substring(1) + " issue: " + title);
                            eventsList.add(ev);
                        } else if ("CreateEvent".equals(type)) {
                            ev.put("type", "CREATE");
                            String refType = event.path("payload").path("ref_type").asText();
                            ev.put("message", "Created " + refType + " in " + repoName);
                            eventsList.add(ev);
                        }
                    }
                }
            }
            // If events list is empty, put a default event
            if (eventsList.isEmpty()) {
                Map<String, Object> defaultEv = new HashMap<>();
                defaultEv.put("type", "CREATE");
                defaultEv.put("repo", username + "/productivity-dashboard");
                defaultEv.put("message", "Initialized repository configurations");
                defaultEv.put("date", DateTimeFormatter.ISO_INSTANT.format(Instant.now()));
                eventsList.add(defaultEv);
            }
            result.put("events", eventsList);
            result.put("isMock", false);

            return result;

        } catch (Exception e) {
            System.err.println("GitHub API Error: " + e.getMessage() + ". Falling back to mock details.");
            return getMockGitHubActivity(username, false);
        }
    }

    private Map<String, Object> getMockGitHubActivity(String username, boolean isRateLimited) {
        Map<String, Object> mock = new HashMap<>();
        mock.put("username", username);
        mock.put("name", username.equals("octocat") ? "The Octocat" : username);
        mock.put("avatarUrl", "https://avatars.githubusercontent.com/u/5832347?v=4");
        mock.put("publicRepos", 12);
        mock.put("followers", 450);
        mock.put("following", 9);
        mock.put("bio", "Mock Bio: Just a busy IT professional writing code and automating systems." + (isRateLimited ? " (GitHub API rate limited)" : ""));
        mock.put("isMock", true);

        // Mock repositories
        List<Map<String, Object>> repos = new ArrayList<>();
        String[] repoNames = {"productivity-dashboard", "kubernetes-configs", "terraform-aws-infra", "react-performance-tips", "spring-boot-starter-pack"};
        String[] repoDescs = {
            "An AI-powered productivity dashboard for developers and system admins.",
            "Collection of production-grade Kubernetes manifest deployments.",
            "Modular Terraform scripts to stand up AWS virtual private clouds.",
            "Quick tips and tricks to optimize complex React application render loops.",
            "Boilerplate code for getting Spring Boot microservices up quickly."
        };
        String[] langs = {"React/Java", "YAML", "HCL", "JavaScript", "Java"};
        int[] stars = {15, 84, 128, 42, 63};
        int[] forks = {3, 12, 34, 5, 8};

        for (int i = 0; i < repoNames.length; i++) {
            Map<String, Object> repo = new HashMap<>();
            repo.put("name", repoNames[i]);
            repo.put("description", repoDescs[i]);
            repo.put("stars", stars[i]);
            repo.put("forks", forks[i]);
            repo.put("language", langs[i]);
            repo.put("url", "https://github.com/" + username + "/" + repoNames[i]);
            repos.add(repo);
        }
        mock.put("repositories", repos);

        // Mock events
        List<Map<String, Object>> events = new ArrayList<>();
        String nowStr = DateTimeFormatter.ISO_INSTANT.format(Instant.now().minusSeconds(1800));
        String earlierStr = DateTimeFormatter.ISO_INSTANT.format(Instant.now().minusSeconds(7200));
        String yesterdayStr = DateTimeFormatter.ISO_INSTANT.format(Instant.now().minusSeconds(86400));

        Map<String, Object> ev1 = new HashMap<>();
        ev1.put("type", "COMMIT");
        ev1.put("repo", username + "/productivity-dashboard");
        ev1.put("message", "feat: Integrate OpenAI function calling logic on backend");
        ev1.put("date", nowStr);
        events.add(ev1);

        Map<String, Object> ev2 = new HashMap<>();
        ev2.put("type", "PR");
        ev2.put("repo", username + "/kubernetes-configs");
        ev2.put("message", "Merged PR #14: Upgrade nginx ingress controller to v1.10.0");
        ev2.put("date", earlierStr);
        events.add(ev2);

        Map<String, Object> ev3 = new HashMap<>();
        ev3.put("type", "ISSUE");
        ev3.put("repo", username + "/terraform-aws-infra");
        ev3.put("message", "Opened issue #8: Document variable structure for multi-region peer connections");
        ev3.put("date", yesterdayStr);
        events.add(ev3);

        mock.put("events", events);
        return mock;
    }
}
