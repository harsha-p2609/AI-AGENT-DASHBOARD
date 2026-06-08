package com.dashboard.backend.service;

import com.dashboard.backend.model.UserPreference;
import com.dashboard.backend.repository.UserPreferenceRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class UserPreferenceService {

    @Autowired
    private UserPreferenceRepository userPreferenceRepository;

    public UserPreference getPreferences() {
        return userPreferenceRepository.findById(1L).orElseGet(() -> {
            UserPreference defaultPref = new UserPreference();
            // id is 1L by default
            return userPreferenceRepository.save(defaultPref);
        });
    }

    public UserPreference updatePreferences(UserPreference prefDetails) {
        UserPreference existing = getPreferences();
        if (prefDetails.getProfileName() != null) {
            existing.setProfileName(prefDetails.getProfileName());
        }
        if (prefDetails.getProfileRole() != null) {
            existing.setProfileRole(prefDetails.getProfileRole());
        }
        if (prefDetails.getGithubUsername() != null) {
            existing.setGithubUsername(prefDetails.getGithubUsername());
        }
        if (prefDetails.getWeatherCity() != null) {
            existing.setWeatherCity(prefDetails.getWeatherCity());
        }
        if (prefDetails.getNewsQuery() != null) {
            existing.setNewsQuery(prefDetails.getNewsQuery());
        }
        return userPreferenceRepository.save(existing);
    }
}
