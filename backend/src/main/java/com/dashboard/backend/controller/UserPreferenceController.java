package com.dashboard.backend.controller;

import com.dashboard.backend.model.UserPreference;
import com.dashboard.backend.service.UserPreferenceService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/preferences")
public class UserPreferenceController {

    @Autowired
    private UserPreferenceService userPreferenceService;

    @GetMapping
    public UserPreference getPreferences() {
        return userPreferenceService.getPreferences();
    }

    @PutMapping
    public UserPreference updatePreferences(@RequestBody UserPreference preferences) {
        return userPreferenceService.updatePreferences(preferences);
    }
}
