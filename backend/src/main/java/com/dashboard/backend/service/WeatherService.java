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
import java.util.HashMap;
import java.util.Map;
import java.util.Random;

@Service
public class WeatherService {

    @Value("${weather.api.key}")
    private String apiKey;

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(5))
            .build();

    private final ObjectMapper objectMapper = new ObjectMapper();

    public Map<String, Object> getWeather(String city) {
        if (city == null || city.trim().isEmpty()) {
            city = "San Francisco";
        }

        if (apiKey != null && !apiKey.trim().isEmpty() && !apiKey.equals("mock_key")) {
            try {
                String encodedCity = URLEncoder.encode(city.trim(), StandardCharsets.UTF_8);
                String url = String.format("https://api.openweathermap.org/data/2.5/weather?q=%s&appid=%s&units=metric",
                        encodedCity, apiKey);

                HttpRequest request = HttpRequest.newBuilder()
                        .uri(URI.create(url))
                        .GET()
                        .build();

                HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

                if (response.statusCode() == 200) {
                    JsonNode root = objectMapper.readTree(response.body());
                    Map<String, Object> result = new HashMap<>();
                    result.put("city", root.path("name").asText(city));
                    result.put("temp", root.path("main").path("temp").asDouble());
                    result.put("feelsLike", root.path("main").path("feels_like").asDouble());
                    result.put("humidity", root.path("main").path("humidity").asInt());
                    result.put("windSpeed", root.path("wind").path("speed").asDouble());
                    
                    JsonNode weatherArray = root.path("weather");
                    if (weatherArray.isArray() && !weatherArray.isEmpty()) {
                        result.put("description", weatherArray.get(0).path("description").asText());
                        result.put("icon", weatherArray.get(0).path("icon").asText());
                    } else {
                        result.put("description", "Clear");
                        result.put("icon", "01d");
                    }
                    result.put("isMock", false);
                    return result;
                }
            } catch (Exception e) {
                System.err.println("Error fetching weather from OpenWeatherMap API: " + e.getMessage());
                // Fall back to mock
            }
        }

        return getMockWeather(city);
    }

    private Map<String, Object> getMockWeather(String city) {
        Map<String, Object> mock = new HashMap<>();
        mock.put("city", city);
        mock.put("isMock", true);

        // Deterministic random based on city name to keep it consistent
        long seed = city.toLowerCase().hashCode();
        Random rand = new Random(seed);

        double temp;
        String desc;
        String icon;
        int humidity = 40 + rand.nextInt(50);
        double wind = Math.round((2.0 + rand.nextDouble() * 10) * 10.0) / 10.0;

        String lowerCity = city.toLowerCase();
        if (lowerCity.contains("london") || lowerCity.contains("seattle")) {
            temp = Math.round((8.0 + rand.nextDouble() * 10) * 10.0) / 10.0;
            desc = rand.nextBoolean() ? "light rain" : "overcast clouds";
            icon = "09d";
        } else if (lowerCity.contains("tokyo") || lowerCity.contains("new york")) {
            temp = Math.round((12.0 + rand.nextDouble() * 15) * 10.0) / 10.0;
            desc = rand.nextBoolean() ? "scattered clouds" : "clear sky";
            icon = "02d";
        } else if (lowerCity.contains("singapore") || lowerCity.contains("mumbai") || lowerCity.contains("tokyo")) {
            temp = Math.round((26.0 + rand.nextDouble() * 8) * 10.0) / 10.0;
            desc = rand.nextBoolean() ? "moderate rain" : "broken clouds";
            icon = "10d";
            humidity = 70 + rand.nextInt(25);
        } else {
            temp = Math.round((15.0 + rand.nextDouble() * 15) * 10.0) / 10.0;
            desc = rand.nextBoolean() ? "clear sky" : "few clouds";
            icon = "01d";
        }

        mock.put("temp", temp);
        mock.put("feelsLike", Math.round((temp + (rand.nextDouble() * 2 - 1)) * 10.0) / 10.0);
        mock.put("humidity", humidity);
        mock.put("windSpeed", wind);
        mock.put("description", desc);
        mock.put("icon", icon);

        return mock;
    }
}
