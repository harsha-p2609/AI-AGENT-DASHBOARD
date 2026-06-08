package com.dashboard.backend.controller;

import com.dashboard.backend.service.GeminiService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@RestController
@RequestMapping("/api/v1/agent")
public class AgentController {

    @Autowired
    private GeminiService geminiService;

    private final ExecutorService executor = Executors.newCachedThreadPool();
    private final ObjectMapper objectMapper = new ObjectMapper();

    public static class ChatRequest {
        private String message;
        private List<Map<String, String>> history;

        public String getMessage() { return message; }
        public void setMessage(String message) { this.message = message; }
        public List<Map<String, String>> getHistory() { return history; }
        public void setHistory(List<Map<String, String>> history) { this.history = history; }
    }

    @PostMapping(value = "/chat", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter chat(@RequestBody ChatRequest request) {
        SseEmitter emitter = new SseEmitter(180000L); // 3 minutes timeout

        executor.execute(() -> {
            try {
                geminiService.processAgentChat(
                    request.getMessage(),
                    request.getHistory() != null ? request.getHistory() : List.of(),
                    new GeminiService.SseReporter() {
                        
                        private void sendEvent(String name, Object data) {
                            try {
                                SseEmitter.SseEventBuilder event = SseEmitter.event()
                                        .name(name)
                                        .data(data instanceof String ? data : objectMapper.writeValueAsString(data));
                                emitter.send(event);
                            } catch (IOException e) {
                                // Emitter was probably closed by client
                                System.err.println("SSE Send Error: " + e.getMessage());
                            }
                        }

                        @Override
                        public void sendStatus(String message) {
                            sendEvent("status", Map.of("message", message));
                        }

                        @Override
                        public void sendToolCall(String name, String arguments) {
                            sendEvent("tool-call", Map.of("tool", name, "arguments", arguments));
                        }

                        @Override
                        public void sendToolResult(String name, String result) {
                            sendEvent("tool-result", Map.of("tool", name, "result", result));
                        }

                        @Override
                        public void sendTextChunk(String chunk) {
                            sendEvent("chunk", chunk);
                        }

                        @Override
                        public void sendError(String error) {
                            sendEvent("error", Map.of("message", error));
                            emitter.completeWithError(new RuntimeException(error));
                        }

                        @Override
                        public void sendDone() {
                            sendEvent("done", "");
                            emitter.complete();
                        }
                    }
                );
            } catch (Exception e) {
                try {
                    emitter.send(SseEmitter.event().name("error").data(Map.of("message", e.getMessage())));
                    emitter.completeWithError(e);
                } catch (IOException ignored) {}
            }
        });

        return emitter;
    }
}
