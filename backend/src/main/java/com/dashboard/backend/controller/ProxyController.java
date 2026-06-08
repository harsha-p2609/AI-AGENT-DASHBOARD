package com.dashboard.backend.controller;

import com.dashboard.backend.service.GitHubService;
import com.dashboard.backend.service.NewsService;
import com.dashboard.backend.service.WeatherService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/proxy")
public class ProxyController {

    @Autowired
    private WeatherService weatherService;

    @Autowired
    private NewsService newsService;

    @Autowired
    private GitHubService gitHubService;

    @GetMapping("/weather")
    public Map<String, Object> getWeather(@RequestParam(required = false, defaultValue = "San Francisco") String city) {
        return weatherService.getWeather(city);
    }

    @GetMapping("/news")
    public List<Map<String, Object>> getNews(@RequestParam(required = false, defaultValue = "technology") String query) {
        return newsService.getTechNews(query);
    }

    @GetMapping("/github")
    public Map<String, Object> getGitHubActivity(@RequestParam(required = false, defaultValue = "octocat") String username) {
        return gitHubService.getGitHubActivity(username);
    }
}
