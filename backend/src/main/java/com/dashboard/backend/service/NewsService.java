package com.dashboard.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class NewsService {

    @Value("${news.api.key}")
    private String apiKey;

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(5))
            .build();

    private final ObjectMapper objectMapper = new ObjectMapper();

    public List<Map<String, Object>> getTechNews(String query) {
        if (query == null || query.trim().isEmpty()) {
            query = "technology";
        }

        if (apiKey != null && !apiKey.trim().isEmpty() && !apiKey.equals("mock_key")) {
            try {
                String encodedQuery = URLEncoder.encode(query, StandardCharsets.UTF_8);
                // Using newsdata.io API
                String url = String.format("https://newsdata.io/api/1/latest?apikey=%s&q=%s&language=en",
                        apiKey, encodedQuery);

                HttpRequest request = HttpRequest.newBuilder()
                        .uri(URI.create(url))
                        .header("User-Agent", "Mozilla/5.0")
                        .GET()
                        .build();

                HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

                if (response.statusCode() == 200) {
                    JsonNode root = objectMapper.readTree(response.body());
                    // newsdata.io returns "results" array
                    JsonNode articles = root.path("results");
                    
                    List<Map<String, Object>> result = new ArrayList<>();
                    if (articles.isArray()) {
                        for (JsonNode article : articles) {
                            Map<String, Object> artMap = new HashMap<>();
                            artMap.put("title", article.path("title").asText());
                            artMap.put("description", article.path("description").asText());
                            // newsdata.io uses "source_id" and "link" and "image_url"
                            artMap.put("source", article.path("source_id").asText());
                            artMap.put("url", article.path("link").asText());
                            artMap.put("urlToImage", article.path("image_url").asText());
                            artMap.put("publishedAt", article.path("pubDate").asText());
                            artMap.put("author", article.path("creator").asText("Unknown"));
                            result.add(artMap);
                        }
                    }
                    if (!result.isEmpty()) {
                        return result;
                    }
                } else {
                    System.err.println("NewsData.io returned status " + response.statusCode() + ": " + response.body());
                }
            } catch (Exception e) {
                System.err.println("Error fetching news from NewsData.io: " + e.getMessage());
                // Fall back to mock
            }
        }

        return getMockNews(query);
    }

    private List<Map<String, Object>> getMockNews(String query) {
        List<Map<String, Object>> mockArticles = new ArrayList<>();
        String nowStr = DateTimeFormatter.ISO_INSTANT.format(Instant.now());

        // Simple hardcoded mock articles relevant to the query
        String[][] rawArticles = {
            {
                "OpenAI Announces GPT-5: A Leap Towards Superintelligence",
                "OpenAI has officially unveiled its next-generation foundational model, GPT-5, promising major breakthroughs in reasoning, math, and multi-agent coordination.",
                "TechCrunch",
                "https://techcrunch.com",
                "https://images.unsplash.com/photo-1677442136019-21780efad99a?w=500&auto=format&fit=crop&q=60",
                "AI Team"
            },
            {
                "PostgreSQL 18 Released: Query Parallelism & Performance Overhaul",
                "The PostgreSQL Global Development Group today announced the release of PostgreSQL 18, the latest version of the world's most advanced open source database.",
                "Hacker News",
                "https://news.ycombinator.com",
                "https://images.unsplash.com/photo-1544383835-bda2bc66a55d?w=500&auto=format&fit=crop&q=60",
                "DB Admin"
            },
            {
                "React 19 Hooks standard adoption sweeps modern frontend development",
                "Developers are quickly transitioning to React 19's server components and new forms API, changing the way modern single page applications are architected.",
                "Dev.to",
                "https://dev.to",
                "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=500&auto=format&fit=crop&q=60",
                "Frontend Lead"
            },
            {
                "Vite 6 Core updates: Enhancing build speeds for micro-frontends",
                "Vite 6 introduces a new module runner and enhanced bundling algorithms, significantly improving hot module replacement (HMR) for massive codebases.",
                "Medium",
                "https://medium.com",
                "https://images.unsplash.com/photo-1618401471353-b98aedd07871?w=500&auto=format&fit=crop&q=60",
                "Javascript Fan"
            },
            {
                "Microsoft Introduces Copilot Workspace for Enterprise Developers",
                "Microsoft and GitHub are launching Copilot Workspace, a conversational developer environment designed to write, build, and debug projects from scratch.",
                "VentureBeat",
                "https://venturebeat.com",
                "https://images.unsplash.com/photo-1607799279861-4dd421887fb3?w=500&auto=format&fit=crop&q=60",
                "Cloud Correspondent"
            },
            {
                "Docker Desktop Integrates WebAssembly (Wasm) Runtime by Default",
                "Docker continues to embrace WebAssembly as a first-class citizen alongside containers, easing cloud-native microservices orchestration.",
                "InfoQ",
                "https://infoq.com",
                "https://images.unsplash.com/photo-1605810230434-7631ac76ec81?w=500&auto=format&fit=crop&q=60",
                "DevOps Expert"
            }
        };

        for (String[] arr : rawArticles) {
            String title = arr[0];
            String description = arr[1];
            String source = arr[2];
            String url = arr[3];
            String img = arr[4];
            String author = arr[5];

            // simple filter based on query
            if (query.toLowerCase().equals("technology") || title.toLowerCase().contains(query.toLowerCase()) || description.toLowerCase().contains(query.toLowerCase())) {
                Map<String, Object> art = new HashMap<>();
                art.put("title", title);
                art.put("description", description);
                art.put("source", source);
                art.put("url", url);
                art.put("urlToImage", img);
                art.put("publishedAt", nowStr);
                art.put("author", author);
                mockArticles.add(art);
            }
        }

        // If no matches, add all of them
        if (mockArticles.isEmpty()) {
            for (String[] arr : rawArticles) {
                Map<String, Object> art = new HashMap<>();
                art.put("title", arr[0]);
                art.put("description", arr[1]);
                art.put("source", arr[2]);
                art.put("url", arr[3]);
                art.put("urlToImage", arr[4]);
                art.put("publishedAt", nowStr);
                art.put("author", arr[5]);
                mockArticles.add(art);
            }
        }

        return mockArticles;
    }
}
