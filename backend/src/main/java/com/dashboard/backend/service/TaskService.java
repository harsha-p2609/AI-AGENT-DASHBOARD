package com.dashboard.backend.service;

import com.dashboard.backend.model.Task;
import com.dashboard.backend.repository.TaskRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class TaskService {

    @Autowired
    private TaskRepository taskRepository;

    public List<Task> getAllTasks() {
        return taskRepository.findAllByOrderByCreatedAtDesc();
    }

    public Optional<Task> getTaskById(Long id) {
        return taskRepository.findById(id);
    }

    public Task createTask(Task task) {
        return taskRepository.save(task);
    }

    public Optional<Task> updateTask(Long id, Task taskDetails) {
        return taskRepository.findById(id).map(existingTask -> {
            if (taskDetails.getTitle() != null) {
                existingTask.setTitle(taskDetails.getTitle());
            }
            if (taskDetails.getDescription() != null) {
                existingTask.setDescription(taskDetails.getDescription());
            }
            if (taskDetails.getStatus() != null) {
                existingTask.setStatus(taskDetails.getStatus());
            }
            if (taskDetails.getPriority() != null) {
                existingTask.setPriority(taskDetails.getPriority());
            }
            if (taskDetails.getDueDate() != null) {
                existingTask.setDueDate(taskDetails.getDueDate());
            }
            return taskRepository.save(existingTask);
        });
    }

    public boolean deleteTask(Long id) {
        return taskRepository.findById(id).map(task -> {
            taskRepository.delete(task);
            return true;
        }).orElse(false);
    }
}
