import React, { useState, useEffect, useRef } from 'react';
import { Bot, User, Send, ChevronDown, ChevronUp, Terminal, Play, CheckCircle, AlertCircle, MessageSquare, Plus } from 'lucide-react';
import { api } from '../services/api';


function parseInline(text) {
  const parts = [];
  const regex = /(\*\*.*?\*\*|\[.*?\]\(.*?\))/g;
  let match;
  let lastIndex = 0;

  while ((match = regex.exec(text)) !== null) {
    const matchText = match[0];
    const matchIndex = match.index;

    if (matchIndex > lastIndex) {
      parts.push(text.substring(lastIndex, matchIndex));
    }

    if (matchText.startsWith('**') && matchText.endsWith('**')) {
      const boldVal = matchText.slice(2, -2);
      parts.push(<strong key={matchIndex} className="font-bold text-white">{boldVal}</strong>);
    } else if (matchText.startsWith('[')) {
      const closeBracket = matchText.indexOf(']');
      const linkText = matchText.slice(1, closeBracket);
      const url = matchText.slice(closeBracket + 2, -1);
      parts.push(
        <a 
          key={matchIndex} 
          href={url} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="text-indigo-400 hover:text-indigo-300 hover:underline font-semibold"
        >
          {linkText}
        </a>
      );
    }

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts.length > 0 ? parts : text;
}

function Markdown({ content }) {
  if (!content) return null;

  const lines = content.split('\n');
  return (
    <div className="space-y-2 font-sans">
      {lines.map((line, idx) => {
        const trimmed = line.trim();

        if (trimmed.startsWith('####')) {
          return <h5 key={idx} className="text-xs font-bold text-indigo-300 mt-2 mb-1 uppercase tracking-wider">{parseInline(trimmed.substring(4).trim())}</h5>;
        }
        if (trimmed.startsWith('###')) {
          return <h4 key={idx} className="text-xs font-bold text-white mt-3 mb-1.5 border-b border-gray-800/80 pb-1">{parseInline(trimmed.substring(3).trim())}</h4>;
        }

        if (trimmed.startsWith('-') || trimmed.startsWith('*')) {
          return (
            <div key={idx} className="flex items-start gap-2 pl-1 my-1">
              <span className="text-indigo-400 font-bold shrink-0 mt-0.5">•</span>
              <span className="text-xs text-gray-300">{parseInline(trimmed.substring(1).trim())}</span>
            </div>
          );
        }

        if (trimmed.startsWith('>')) {
          return (
            <blockquote key={idx} className="border-l-2 border-indigo-500 bg-indigo-950/20 px-3 py-1.5 my-2 text-[11px] text-gray-300 italic rounded-r">
              {parseInline(trimmed.substring(1).trim())}
            </blockquote>
          );
        }

        if (!trimmed) {
          return <div key={idx} className="h-2" />;
        }

        return <p key={idx} className="text-xs text-gray-300 leading-relaxed">{parseInline(line)}</p>;
      })}
    </div>
  );
}

export default function AgentChat({ onTaskCreated }) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hello! I am your AI Productivity Agent. Ask me to fetch the weather, summarize tech news, check github, or create and manage tasks.' }
  ]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [history, setHistory] = useState([]); // Past conversations history list

  // Agent thoughts & tool execution state
  const [reasoningLogs, setReasoningLogs] = useState([]);
  const [showReasoning, setShowReasoning] = useState(false);

  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, reasoningLogs]);

  // Load chat history from localStorage on mount
  useEffect(() => {
    const cachedHistory = localStorage.getItem('agent_chat_history');
    if (cachedHistory) {
      try {
        setHistory(JSON.parse(cachedHistory));
      } catch (e) {}
    }
  }, []);

  const saveConversationToHistory = (newMessages) => {
    if (newMessages.length <= 1) return;
    const title = newMessages[1]?.content?.substring(0, 30) + '...' || 'Conversation';
    const updatedHistory = [{ title, messages: newMessages }, ...history.slice(0, 9)];
    setHistory(updatedHistory);
    localStorage.setItem('agent_chat_history', JSON.stringify(updatedHistory));
  };

  const loadPastConversation = (pastConv) => {
    setMessages(pastConv.messages);
    setReasoningLogs([]);
    setShowReasoning(false);
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('agent_chat_history');
  };

  const handleSuggest = (text) => {
    setInput(text);
    handleSubmit(null, text);
  };

  const handleSubmit = async (e, forcedInput = '') => {
    if (e) e.preventDefault();
    const prompt = forcedInput || input;
    if (!prompt.trim() || isGenerating) return;

    setInput('');
    setIsGenerating(true);
    setReasoningLogs([]);
    setShowReasoning(true);

    const userMessage = { role: 'user', content: prompt };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);

    // Map conversation context for backend (limit to last 6 messages to stay lightweight)
    const contextHistory = messages.slice(-6).map(m => ({
      role: m.role,
      content: m.content
    }));

    // Add empty assistant placeholder for streaming text
    setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

    let assistantText = '';

    await api.streamAgentChat(prompt, contextHistory, {
      onStatus: (statusMsg) => {
        setReasoningLogs(prev => [...prev, { type: 'status', message: statusMsg }]);
      },
      onToolCall: (toolName, args) => {
        setReasoningLogs(prev => [...prev, { 
          type: 'tool-call', 
          message: `Invoking tool ${toolName}`, 
          detail: args 
        }]);
      },
      onToolResult: (toolName, result) => {
        setReasoningLogs(prev => [...prev, { 
          type: 'tool-result', 
          message: `Tool ${toolName} execution successful`, 
          detail: result 
        }]);
        // If task was created, notify dashboard to refresh the task widget!
        if (toolName === 'createTask' || toolName === 'updateTask' || toolName === 'deleteTask') {
          if (onTaskCreated) {
            onTaskCreated();
          }
        }
      },
      onChunk: (chunk) => {
        assistantText += chunk;
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: 'assistant', content: assistantText };
          return updated;
        });
      },
      onError: (err) => {
        setReasoningLogs(prev => [...prev, { type: 'error', message: `Execution error: ${err}` }]);
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: 'assistant', content: `Sorry, I encountered an error: ${err}` };
          return updated;
        });
        setIsGenerating(false);
      },
      onDone: () => {
        setIsGenerating(false);
        // Save to cache
        saveConversationToHistory([...newMessages, { role: 'assistant', content: assistantText }]);
      }
    });
  };

  const suggestions = [
    "What's the weather in Seattle?",
    "Show github activity for torvalds",
    "Tell me the latest news about OpenAI",
    "Create a high priority task to prepare deployment scripts"
  ];

  return (
    <div className={`fixed bottom-6 right-6 z-50 flex flex-col transition-all duration-300 ${
      isOpen ? 'w-[520px] h-[720px] max-h-[85vh] max-w-[90vw]' : 'w-48 h-12'
    }`}>
      {/* Closed Button */}
      {!isOpen ? (
        <button 
          onClick={() => setIsOpen(true)}
          className="w-full h-full bg-gradient-to-tr from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-2xl shadow-xl shadow-indigo-900/50 flex items-center justify-center gap-2 font-semibold text-sm transition-all hover:scale-105 active:scale-95"
        >
          <Bot className="w-5 h-5 animate-pulse" />
          <span>Ask AI Agent</span>
        </button>
      ) : (
        <div className="w-full h-full glass-card rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-indigo-500/20">
          {/* Active Chat Header */}
          <div className="bg-gradient-to-r from-indigo-900/60 to-violet-900/40 p-4 border-b border-gray-800 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center text-white">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white tracking-wide">APEX ASSISTANT</h3>
                <span className="text-[9px] text-indigo-300 font-medium tracking-wide">Orchestrated Tool Calling</span>
              </div>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-white p-1 hover:bg-gray-800/80 rounded"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>

          {/* Chat Body & History Panel Toggle */}
          <div className="flex-1 flex overflow-hidden min-h-0 relative">
            {/* Main Chat Flow */}
            <div className="flex-1 flex flex-col min-h-0 bg-darkcard/50">
              
              {/* Message History Scroller */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
                {messages.map((m, idx) => (
                  <div key={idx} className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {m.role !== 'user' && (
                      <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-white shrink-0 text-xs">
                        AI
                      </div>
                    )}
                    <div className={`p-3 rounded-2xl max-w-[80%] text-xs leading-relaxed ${
                      m.role === 'user'
                        ? 'bg-indigo-600 text-white rounded-tr-none'
                        : 'bg-darkbg text-gray-200 border border-gray-800 rounded-tl-none markdown-container'
                    }`}>
                      {m.content ? (
                        <Markdown content={m.content} />
                      ) : (
                        <div className="flex gap-1 py-1">
                          <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '0ms' }}></span>
                          <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '150ms' }}></span>
                          <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '300ms' }}></span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {/* Reasoning Logs Panel inside Stream */}
                {reasoningLogs.length > 0 && (
                  <div className="border border-indigo-900/30 rounded-xl overflow-hidden bg-darkbg/80">
                    <button 
                      onClick={() => setShowReasoning(!showReasoning)}
                      className="w-full flex items-center justify-between px-3 py-2 bg-indigo-950/20 text-xxs text-indigo-400 font-bold tracking-wider hover:bg-indigo-950/40 transition uppercase"
                    >
                      <span className="flex items-center gap-1.5"><Terminal className="w-3.5 h-3.5" /> Agent Execution Console</span>
                      {showReasoning ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                    {showReasoning && (
                      <div className="p-3 font-mono text-[9px] text-gray-400 space-y-2 border-t border-indigo-900/20 max-h-40 overflow-y-auto">
                        {reasoningLogs.map((log, lidx) => (
                          <div key={lidx} className="flex gap-1.5 items-start">
                            {log.type === 'status' && <Terminal className="w-3 h-3 text-gray-500 shrink-0 mt-0.5" />}
                            {log.type === 'tool-call' && <Play className="w-3 h-3 text-violet-400 shrink-0 mt-0.5" />}
                            {log.type === 'tool-result' && <CheckCircle className="w-3 h-3 text-emerald-400 shrink-0 mt-0.5" />}
                            {log.type === 'error' && <AlertCircle className="w-3 h-3 text-red-400 shrink-0 mt-0.5" />}
                            <div>
                              <span className="text-gray-300 font-semibold">{log.message}</span>
                              {log.detail && (
                                <pre className="text-gray-500 whitespace-pre-wrap leading-relaxed mt-1 text-[8px] bg-darkcard/50 p-1.5 rounded border border-gray-800">
                                  {log.detail}
                                </pre>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Suggestions Panel */}
              {messages.length <= 1 && (
                <div className="px-4 py-2 space-y-1.5 shrink-0 bg-darkbg/10 border-t border-gray-800/40">
                  <span className="block text-[9px] text-gray-500 font-bold uppercase tracking-wider">Try asking:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {suggestions.map((s, i) => (
                      <button 
                        key={i} 
                        onClick={() => handleSuggest(s)}
                        className="text-[10px] text-indigo-400 hover:text-white bg-indigo-950/20 hover:bg-indigo-600/20 border border-indigo-900/30 hover:border-indigo-500/40 rounded-lg px-2.5 py-1 text-left line-clamp-1 transition duration-150"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Chat Input Footer */}
              <form onSubmit={handleSubmit} className="p-4 border-t border-gray-800 flex gap-2 bg-darkcard shrink-0">
                <input 
                  type="text" 
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder="Ask agent to call APIs or add tasks..."
                  className="flex-1 text-sm bg-darkbg border border-gray-800 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-indigo-500"
                  disabled={isGenerating}
                />
                <button 
                  type="submit" 
                  className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition disabled:opacity-50"
                  disabled={!input.trim() || isGenerating}
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>

            {/* Conversation History Drawer Component */}
            {history.length > 0 && (
              <div className="absolute top-0 right-0 h-full w-48 bg-darkbg border-l border-gray-800 translate-x-full hover:translate-x-0 focus-within:translate-x-0 transition duration-300 z-20 flex flex-col justify-between p-3 select-none">
                <div className="space-y-3 flex-1 min-h-0 overflow-y-auto">
                  <div className="flex items-center justify-between text-xxs font-bold text-gray-500 uppercase tracking-wider pb-1.5 border-b border-gray-800">
                    <span className="flex items-center gap-1"><MessageSquare className="w-3.5 h-3.5" /> Past Chats</span>
                  </div>
                  <div className="space-y-2">
                    {history.map((h, i) => (
                      <button 
                        key={i} 
                        onClick={() => loadPastConversation(h)}
                        className="w-full text-left text-[10px] text-gray-400 hover:text-indigo-400 hover:bg-darkcard p-2 rounded border border-transparent hover:border-gray-800 transition truncate"
                      >
                        {h.title}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="pt-2 border-t border-gray-800">
                  <button 
                    onClick={clearHistory}
                    className="w-full text-center text-[9px] font-bold text-red-500 hover:text-red-400 transition"
                  >
                    Clear History
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
