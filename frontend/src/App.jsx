import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import WeatherWidget from './components/WeatherWidget';
import NewsWidget from './components/NewsWidget';
import GitHubWidget from './components/GitHubWidget';
import TaskManagerWidget from './components/TaskManagerWidget';
import AgentChat from './components/AgentChat';
import { api } from './services/api';
import { AlertCircle, User, CheckSquare, Newspaper } from 'lucide-react';

export default function App() {
  const [preferences, setPreferences] = useState({
    profileName: 'IT Professional',
    profileRole: 'Systems Architect',
    githubUsername: 'octocat',
    weatherCity: 'San Francisco',
    newsQuery: 'technology'
  });
  const [tasks, setTasks] = useState([]);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchVal, setSearchVal] = useState('');
  
  // Triggers to refresh widgets
  const [weatherCity, setWeatherCity] = useState('San Francisco');
  const [newsQuery, setNewsQuery] = useState('technology');
  const [githubUser, setGithubUser] = useState('octocat');
  const [refreshKey, setRefreshKey] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Load user preferences
      const prefData = await api.getPreferences();
      setPreferences(prefData);
      setWeatherCity(prefData.weatherCity || 'San Francisco');
      setNewsQuery(prefData.newsQuery || 'technology');
      setGithubUser(prefData.githubUsername || 'octocat');

      // Load tasks
      const taskData = await api.getTasks();
      setTasks(taskData);
    } catch (err) {
      console.error(err);
      setError('Could not establish database connection. Running with default configurations.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const handleUpdatePreferences = async (updatedPref) => {
    try {
      const data = await api.updatePreferences(updatedPref);
      setPreferences(data);
      setWeatherCity(data.weatherCity);
      setNewsQuery(data.newsQuery);
      setGithubUser(data.githubUsername);
    } catch (err) {
      setError('Failed to update dashboard settings');
    }
  };

  const handleGlobalSearch = (val) => {
    if (!val.trim()) return;
    // Update news query to search news
    setNewsQuery(val);
    setSearchVal('');
  };

  const handleRefreshAll = () => {
    setRefreshKey(prev => prev + 1);
    loadDashboardData();
  };

  const handleTaskUpdate = () => {
    // Reload task list from backend
    api.getTasks().then(setTasks).catch(err => console.error(err));
  };

  if (loading && !preferences) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-darkbg text-indigo-400">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-sm font-semibold tracking-wider animate-pulse">Initializing Dashboard Core...</p>
      </div>
    );
  }

  return (
    <div className="flex bg-darkbg min-h-screen font-sans text-gray-200">
      
      {/* Sidebar Panel */}
      <Sidebar 
        preferences={preferences} 
        onUpdatePreferences={handleUpdatePreferences}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Main Workspace Frame */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        
        {/* Top Header */}
        <Header 
          searchVal={searchVal}
          onSearchChange={setSearchVal}
          onGlobalSearch={handleSearchSubmit => handleGlobalSearch(searchVal)}
          onRefreshAll={handleRefreshAll}
        />

        {/* Dynamic Content Panel */}
        <main className="flex-1 overflow-y-auto p-8">
          
          {/* Error Banner Alert */}
          {error && (
            <div className="mb-6 bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center gap-3 text-red-400 text-xs font-semibold">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {activeTab === 'dashboard' ? (
            <div className="space-y-6">
              {/* Profile Intro Banner */}
              <div className="relative overflow-hidden bg-gradient-to-r from-indigo-950/40 via-violet-950/20 to-transparent border border-indigo-900/30 p-6 rounded-2xl flex items-center justify-between">
                <div className="absolute right-0 top-0 w-80 h-full bg-gradient-to-l from-indigo-500/5 to-transparent blur-3xl pointer-events-none"></div>
                <div>
                  <h2 className="text-2xl font-bold text-white tracking-tight">
                    Welcome back, <span className="gradient-text">{preferences.profileName}</span>
                  </h2>
                  <p className="text-xs text-indigo-400 mt-1 font-semibold uppercase tracking-wider">
                    {preferences.profileRole}
                  </p>
                </div>
                <div className="text-right text-xs text-gray-400 space-y-1">
                  <div>🌍 Connected to: <span className="text-white font-medium">{weatherCity}</span></div>
                  <div>🐙 GitHub target: <span className="text-white font-medium">@{githubUser}</span></div>
                </div>
              </div>

              {/* Widgets Dashboard Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                
                {/* Weather widget */}
                <div key={`weather-${weatherCity}-${refreshKey}`} className="col-span-1">
                  <WeatherWidget city={weatherCity} />
                </div>

                {/* GitHub widget */}
                <div key={`github-${githubUser}-${refreshKey}`} className="col-span-1 md:col-span-1 lg:col-span-2 row-span-1">
                  <GitHubWidget username={githubUser} />
                </div>

                {/* News widget */}
                <div key={`news-${newsQuery}-${refreshKey}`} className="col-span-1 md:col-span-2 lg:col-span-2">
                  <NewsWidget query={newsQuery} />
                </div>

                {/* Task widget */}
                <div key={`tasks-${refreshKey}`} className="col-span-1 md:col-span-2 lg:col-span-2">
                  <TaskManagerWidget tasks={tasks} onTasksUpdated={setTasks} />
                </div>
              </div>
            </div>
          ) : (
            // Full Backlog View
            <div className="space-y-6 max-w-5xl mx-auto">
              <div className="flex items-center gap-2 mb-2">
                <CheckSquare className="w-5 h-5 text-indigo-400" />
                <h2 className="text-xl font-bold text-white">Consolidated Task Backlog</h2>
              </div>
              <TaskManagerWidget tasks={tasks} onTasksUpdated={setTasks} />
            </div>
          )}
        </main>
      </div>

      {/* Embedded Autonomous AI Agent */}
      <AgentChat onTaskCreated={handleTaskUpdate} />
    </div>
  );
}
