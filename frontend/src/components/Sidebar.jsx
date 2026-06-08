import React, { useState } from 'react';
import { LayoutDashboard, CheckSquare, Settings, LogOut, User, RefreshCw, Save } from 'lucide-react';

export default function Sidebar({ preferences, onUpdatePreferences, activeTab, setActiveTab }) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    profileName: '',
    profileRole: '',
    githubUsername: '',
    weatherCity: '',
    newsQuery: ''
  });

  const handleEditClick = () => {
    setFormData({
      profileName: preferences.profileName || '',
      profileRole: preferences.profileRole || '',
      githubUsername: preferences.githubUsername || '',
      weatherCity: preferences.weatherCity || '',
      newsQuery: preferences.newsQuery || ''
    });
    setIsEditing(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    await onUpdatePreferences(formData);
    setIsEditing(false);
  };

  return (
    <aside className="w-80 bg-darkcard border-r border-gray-800 flex flex-col justify-between shrink-0 h-screen sticky top-0">
      {/* Brand Logo */}
      <div className="p-6 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-900/50">
            A
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-wide">APEX DASHBOARD</h1>
            <span className="text-xs text-indigo-400 font-semibold tracking-wider uppercase">AI Productivity Engine</span>
          </div>
        </div>
      </div>

      {/* Profile Section */}
      <div className="p-6 border-b border-gray-800">
        {!isEditing ? (
          <div className="bg-darkbg/50 rounded-xl p-4 border border-gray-800/80 relative group">
            <button 
              onClick={handleEditClick}
              className="absolute top-2 right-2 text-gray-500 hover:text-indigo-400 transition"
              title="Edit Profile Preferences"
            >
              <Settings className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-lg border-2 border-indigo-600/30">
                {preferences.profileName ? preferences.profileName.charAt(0) : 'U'}
              </div>
              <div>
                <h3 className="font-semibold text-white truncate max-w-[150px]">{preferences.profileName || 'IT Professional'}</h3>
                <p className="text-xs text-gray-400 truncate max-w-[150px]">{preferences.profileRole || 'Systems Architect'}</p>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-gray-800/80 grid grid-cols-2 gap-2 text-xxs text-gray-400">
              <div className="truncate">📍 {preferences.weatherCity || 'San Francisco'}</div>
              <div className="truncate">🐙 {preferences.githubUsername || 'octocat'}</div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSave} className="bg-darkbg/80 rounded-xl p-4 border border-indigo-600/30 space-y-3">
            <div>
              <label className="block text-xxs text-gray-400 uppercase font-semibold mb-1">Name</label>
              <input 
                type="text" 
                value={formData.profileName} 
                onChange={e => setFormData({...formData, profileName: e.target.value})}
                className="w-full text-xs bg-darkcard border border-gray-700 rounded px-2 py-1 text-white focus:outline-none focus:border-indigo-500"
                required
              />
            </div>
            <div>
              <label className="block text-xxs text-gray-400 uppercase font-semibold mb-1">Role</label>
              <input 
                type="text" 
                value={formData.profileRole} 
                onChange={e => setFormData({...formData, profileRole: e.target.value})}
                className="w-full text-xs bg-darkcard border border-gray-700 rounded px-2 py-1 text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xxs text-gray-400 uppercase font-semibold mb-1">GitHub User</label>
              <input 
                type="text" 
                value={formData.githubUsername} 
                onChange={e => setFormData({...formData, githubUsername: e.target.value})}
                className="w-full text-xs bg-darkcard border border-gray-700 rounded px-2 py-1 text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xxs text-gray-400 uppercase font-semibold mb-1">Weather City</label>
              <input 
                type="text" 
                value={formData.weatherCity} 
                onChange={e => setFormData({...formData, weatherCity: e.target.value})}
                className="w-full text-xs bg-darkcard border border-gray-700 rounded px-2 py-1 text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xxs text-gray-400 uppercase font-semibold mb-1">News Search</label>
              <input 
                type="text" 
                value={formData.newsQuery} 
                onChange={e => setFormData({...formData, newsQuery: e.target.value})}
                className="w-full text-xs bg-darkcard border border-gray-700 rounded px-2 py-1 text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div className="flex gap-2 pt-1">
              <button 
                type="submit" 
                className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xxs font-semibold py-1 rounded flex items-center justify-center gap-1 transition"
              >
                <Save className="w-3 h-3" /> Save
              </button>
              <button 
                type="button" 
                onClick={() => setIsEditing(false)}
                className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-400 text-xxs font-semibold py-1 rounded transition"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-6 space-y-2">
        <button 
          onClick={() => setActiveTab('dashboard')}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition duration-150 ${
            activeTab === 'dashboard' 
              ? 'bg-gradient-to-r from-indigo-900/40 to-violet-900/20 text-indigo-400 border-l-4 border-indigo-500' 
              : 'text-gray-400 hover:bg-gray-800/50 hover:text-white'
          }`}
        >
          <LayoutDashboard className="w-5 h-5" />
          Dashboard
        </button>

        <button 
          onClick={() => setActiveTab('tasks')}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition duration-150 ${
            activeTab === 'tasks' 
              ? 'bg-gradient-to-r from-indigo-900/40 to-violet-900/20 text-indigo-400 border-l-4 border-indigo-500' 
              : 'text-gray-400 hover:bg-gray-800/50 hover:text-white'
          }`}
        >
          <CheckSquare className="w-5 h-5" />
          Task Backlog
        </button>
      </nav>

      {/* Footer Info */}
      <div className="p-6 border-t border-gray-800 bg-darkbg/30 text-xs text-gray-500">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
          <span className="text-gray-400 font-medium">System Online</span>
        </div>
        <p className="text-[10px]">Connected: localhost:8080</p>
      </div>
    </aside>
  );
}
