import React, { useState, useEffect } from 'react';
import { Search, RefreshCw, Star, GitFork, AlertCircle, GitCommit, GitPullRequest, AlertOctagon } from 'lucide-react';
import { GithubIcon } from './icons';
import { api } from '../services/api';

export default function GitHubWidget({ username }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchUser, setSearchUser] = useState('');
  const [activeSubTab, setActiveSubTab] = useState('repos'); // repos or activity

  const fetchGitHubData = async (user) => {
    setLoading(true);
    setError(null);
    try {
      const gitData = await api.getGitHubActivity(user);
      setData(gitData);
    } catch (err) {
      setError('Could not fetch GitHub activity');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGitHubData(username);
  }, [username]);

  const handleRefresh = () => {
    fetchGitHubData(data ? data.username : username);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchUser.trim()) {
      fetchGitHubData(searchUser);
    }
  };

  const getEventIcon = (type) => {
    switch (type) {
      case 'COMMIT': return <GitCommit className="w-3.5 h-3.5 text-emerald-400 shrink-0" />;
      case 'PR': return <GitPullRequest className="w-3.5 h-3.5 text-purple-400 shrink-0" />;
      case 'ISSUE': return <AlertOctagon className="w-3.5 h-3.5 text-amber-400 shrink-0" />;
      default: return <GitCommit className="w-3.5 h-3.5 text-blue-400 shrink-0" />;
    }
  };

  const getLanguageColor = (lang) => {
    if (!lang) return 'bg-gray-500';
    const l = lang.toLowerCase();
    if (l.contains && l.contains('javascript')) return 'bg-yellow-400';
    if (l.contains && l.contains('typescript')) return 'bg-blue-400';
    if (l.contains && l.contains('java')) return 'bg-orange-500';
    if (l.contains && l.contains('html')) return 'bg-red-500';
    if (l.contains && l.contains('css')) return 'bg-indigo-500';
    if (l.contains && l.contains('hcl')) return 'bg-violet-600';
    if (l.contains && l.contains('yaml')) return 'bg-teal-500';
    return 'bg-indigo-400';
  };

  return (
    <div className="glass-card rounded-2xl p-6 flex flex-col h-[380px]">
      {/* Widget Header */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div className="flex items-center gap-2">
          <GithubIcon className="w-4 h-4 text-emerald-400" />
          <h2 className="text-sm font-semibold text-white">GitHub Activity</h2>
        </div>
        <div className="flex items-center gap-2">
          <form onSubmit={handleSearchSubmit} className="relative w-40 group">
            <input 
              type="text" 
              value={searchUser}
              onChange={e => setSearchUser(e.target.value)}
              placeholder="GitHub user..."
              className="w-full bg-darkbg border border-gray-800 rounded-lg pl-3 pr-7 py-1 text-xxs text-gray-300 focus:outline-none focus:border-emerald-500"
            />
            <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
              <Search className="w-3 h-3" />
            </button>
          </form>
          <button 
            onClick={handleRefresh}
            className="text-gray-400 hover:text-white p-1 hover:bg-gray-800 rounded-lg transition"
            disabled={loading}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-500' : ''}`} />
          </button>
        </div>
      </div>

      {/* Loading & Error States */}
      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : error ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center gap-2 text-gray-400">
          <AlertCircle className="w-6 h-6 text-red-500/80" />
          <p className="text-xs">{error}</p>
          <button onClick={handleRefresh} className="text-xxs text-emerald-400 underline hover:text-emerald-300">Try again</button>
        </div>
      ) : !data ? null : (
        <div className="flex-1 flex flex-col min-h-0">
          {/* Profile Overview Banner */}
          <div className="flex items-center gap-3 bg-darkbg/50 p-3 rounded-xl border border-gray-800/80 shrink-0">
            {data.avatarUrl && (
              <img src={data.avatarUrl} alt="avatar" className="w-10 h-10 rounded-full border border-gray-700/80" />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-white truncate">{data.name}</h3>
                <span className="text-[9px] text-gray-500">@{data.username}</span>
              </div>
              <p className="text-[10px] text-gray-400 truncate mt-0.5">{data.bio}</p>
              <div className="flex gap-3 text-[9px] text-gray-500 mt-1 font-semibold">
                <span>Repos: <strong className="text-gray-300">{data.publicRepos}</strong></span>
                <span>Followers: <strong className="text-gray-300">{data.followers}</strong></span>
              </div>
            </div>
          </div>

          {/* Subtabs selection */}
          <div className="flex gap-4 border-b border-gray-800 mt-3 shrink-0 text-xxs font-semibold">
            <button 
              onClick={() => setActiveSubTab('repos')}
              className={`pb-1.5 uppercase tracking-wide transition ${activeSubTab === 'repos' ? 'text-emerald-400 border-b-2 border-emerald-400' : 'text-gray-500 hover:text-gray-300'}`}
            >
              Repositories
            </button>
            <button 
              onClick={() => setActiveSubTab('activity')}
              className={`pb-1.5 uppercase tracking-wide transition ${activeSubTab === 'activity' ? 'text-emerald-400 border-b-2 border-emerald-400' : 'text-gray-500 hover:text-gray-300'}`}
            >
              Recent Events
            </button>
          </div>

          {/* Subtab Content */}
          <div className="flex-1 overflow-y-auto mt-3 pr-1 min-h-0">
            {activeSubTab === 'repos' ? (
              <div className="space-y-2">
                {data.repositories && data.repositories.length === 0 ? (
                  <p className="text-xxs text-gray-500 text-center py-4">No repositories found.</p>
                ) : (
                  data.repositories.map((repo, i) => (
                    <div key={i} className="bg-darkbg/30 p-2.5 rounded-lg border border-gray-800/80 flex items-center justify-between hover:border-gray-700/60 transition group">
                      <div className="min-w-0 pr-2">
                        <a 
                          href={repo.url} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-xxs font-semibold text-gray-200 hover:text-emerald-400 transition truncate block"
                        >
                          {repo.name}
                        </a>
                        <span className="text-[10px] text-gray-400 line-clamp-1 mt-0.5">{repo.description}</span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0 text-[10px] text-gray-500">
                        <span className="flex items-center gap-1">
                          <span className={`w-2 h-2 rounded-full ${getLanguageColor(repo.language)}`}></span>
                          {repo.language}
                        </span>
                        <span className="flex items-center gap-0.5"><Star className="w-3 h-3 text-amber-500" />{repo.stars}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {data.events && data.events.length === 0 ? (
                  <p className="text-xxs text-gray-500 text-center py-4">No recent events.</p>
                ) : (
                  data.events.map((ev, i) => (
                    <div key={i} className="flex gap-2.5 items-start bg-darkbg/20 p-2.5 rounded-lg border border-gray-800/80">
                      {getEventIcon(ev.type)}
                      <div className="min-w-0 flex-1">
                        <p className="text-xxs text-gray-200 line-clamp-2 leading-relaxed">
                          <strong>{ev.repo.split('/').pop()}:</strong> {ev.message}
                        </p>
                        <span className="text-[9px] text-gray-500 block mt-1">
                          {new Date(ev.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
