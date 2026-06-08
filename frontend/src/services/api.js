const BASE_URL = 'http://localhost:8080/api/v1';

export const api = {
  // Tasks CRUD
  async getTasks() {
    const res = await fetch(`${BASE_URL}/tasks`);
    if (!res.ok) throw new Error('Failed to fetch tasks');
    return res.json();
  },

  async createTask(task) {
    const res = await fetch(`${BASE_URL}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(task),
    });
    if (!res.ok) throw new Error('Failed to create task');
    return res.json();
  },

  async updateTask(id, task) {
    const res = await fetch(`${BASE_URL}/tasks/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(task),
    });
    if (!res.ok) throw new Error('Failed to update task');
    return res.json();
  },

  async deleteTask(id) {
    const res = await fetch(`${BASE_URL}/tasks/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete task');
    return true;
  },

  // User Preferences
  async getPreferences() {
    const res = await fetch(`${BASE_URL}/preferences`);
    if (!res.ok) throw new Error('Failed to fetch preferences');
    return res.json();
  },

  async updatePreferences(pref) {
    const res = await fetch(`${BASE_URL}/preferences`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pref),
    });
    if (!res.ok) throw new Error('Failed to update preferences');
    return res.json();
  },

  // Proxied external endpoints
  async getWeather(city) {
    const res = await fetch(`${BASE_URL}/proxy/weather?city=${encodeURIComponent(city)}`);
    if (!res.ok) throw new Error('Failed to fetch weather');
    return res.json();
  },

  async getNews(query) {
    const res = await fetch(`${BASE_URL}/proxy/news?query=${encodeURIComponent(query)}`);
    if (!res.ok) throw new Error('Failed to fetch news');
    return res.json();
  },

  async getGitHubActivity(username) {
    const res = await fetch(`${BASE_URL}/proxy/github?username=${encodeURIComponent(username)}`);
    if (!res.ok) throw new Error('Failed to fetch GitHub activity');
    return res.json();
  },

  // AI Agent Chat SSE Streaming via POST
  async streamAgentChat(message, history, callbacks) {
    const { onStatus, onToolCall, onToolResult, onChunk, onError, onDone } = callbacks;

    try {
      const response = await fetch(`${BASE_URL}/agent/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, history }),
      });

      if (!response.ok) {
        throw new Error(`Chat API error: ${response.statusText}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Parse SSE protocol format
        // In SSE:
        // event: <event-name>
        // data: <data-content>
        // followed by a blank line
        
        let lines = buffer.split('\n');
        // Keep the last incomplete line in the buffer
        buffer = lines.pop() || '';

        let currentEvent = null;

        for (let line of lines) {
          if (line.endsWith('\r')) {
            line = line.slice(0, -1);
          }
          if (!line.trim()) continue;

          if (line.startsWith('event:')) {
            currentEvent = line.substring(6).trim();
          } else if (line.startsWith('data:')) {
            let dataStr = line.substring(5);
            if (dataStr.startsWith(' ')) {
              dataStr = dataStr.substring(1);
            }
            let data = dataStr;
            try {
              if (dataStr.trim().startsWith('{') || dataStr.trim().startsWith('[')) {
                data = JSON.parse(dataStr);
              }
            } catch (e) {
              // Keep as string
            }

            // Dispatch based on event type
            if (currentEvent === 'status' && onStatus) {
              onStatus(data.message || data);
            } else if (currentEvent === 'tool-call' && onToolCall) {
              onToolCall(data.tool, data.arguments);
            } else if (currentEvent === 'tool-result' && onToolResult) {
              onToolResult(data.tool, data.result);
            } else if (currentEvent === 'chunk' && onChunk) {
              onChunk(data);
            } else if (currentEvent === 'error' && onError) {
              onError(data.message || data);
            } else if (currentEvent === 'done' && onDone) {
              onDone();
            }
          }
        }
      }
      
      // End of stream
      if (onDone) onDone();

    } catch (err) {
      if (onError) onError(err.message);
    }
  }
};
