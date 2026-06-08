package com.dashboard.backend.model;

import jakarta.persistence.*;

@Entity
@Table(name = "user_preferences")
public class UserPreference {

    @Id
    private Long id = 1L; // Hardcoded to 1 for single-user dashboard settings

    private String profileName;
    private String profileRole;
    private String githubUsername;
    private String weatherCity;
    private String newsQuery;

    public UserPreference() {}

    public UserPreference(Long id, String profileName, String profileRole, String githubUsername, String weatherCity, String newsQuery) {
        this.id = id;
        this.profileName = profileName;
        this.profileRole = profileRole;
        this.githubUsername = githubUsername;
        this.weatherCity = weatherCity;
        this.newsQuery = newsQuery;
    }

    @PrePersist
    protected void initDefaults() {
        if (profileName == null) profileName = "IT Professional";
        if (profileRole == null) profileRole = "Senior Systems Administrator";
        if (githubUsername == null) githubUsername = "octocat";
        if (weatherCity == null) weatherCity = "San Francisco";
        if (newsQuery == null) newsQuery = "technology";
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getProfileName() { return profileName; }
    public void setProfileName(String profileName) { this.profileName = profileName; }

    public String getProfileRole() { return profileRole; }
    public void setProfileRole(String profileRole) { this.profileRole = profileRole; }

    public String getGithubUsername() { return githubUsername; }
    public void setGithubUsername(String githubUsername) { this.githubUsername = githubUsername; }

    public String getWeatherCity() { return weatherCity; }
    public void setWeatherCity(String weatherCity) { this.weatherCity = weatherCity; }

    public String getNewsQuery() { return newsQuery; }
    public void setNewsQuery(String newsQuery) { this.newsQuery = newsQuery; }
}
