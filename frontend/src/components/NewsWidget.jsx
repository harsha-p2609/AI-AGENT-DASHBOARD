import React, { useState, useEffect } from 'react';
import { Newspaper, Search, RefreshCw, AlertCircle, ExternalLink } from 'lucide-react';
import { api } from '../services/api';

export default function NewsWidget({ query }) {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchNewsData = async (searchQ) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getNews(searchQ);
      setArticles(data);
    } catch (err) {
      setError('Could not fetch technology news');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNewsData(query);
  }, [query]);

  const handleRefresh = () => {
    fetchNewsData(searchQuery || query);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      fetchNewsData(searchQuery);
    }
  };

  const formatPublishDate = (dateStr) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <div className="glass-card rounded-2xl p-6 flex flex-col h-[380px]">
      {/* Widget Header */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div className="flex items-center gap-2">
          <Newspaper className="w-4 h-4 text-violet-400" />
          <h2 className="text-sm font-semibold text-white">Tech News Feed</h2>
        </div>
        <div className="flex items-center gap-2">
          {/* Simple search bar inside widget */}
          <form onSubmit={handleSearchSubmit} className="relative w-40 group">
            <input 
              type="text" 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search news..."
              className="w-full bg-darkbg border border-gray-800 rounded-lg pl-3 pr-7 py-1 text-xxs text-gray-300 focus:outline-none focus:border-violet-500"
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
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-violet-500' : ''}`} />
          </button>
        </div>
      </div>

      {/* Widget Content */}
      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : error ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center gap-2 text-gray-400">
          <AlertCircle className="w-6 h-6 text-red-500/80" />
          <p className="text-xs">{error}</p>
          <button onClick={handleRefresh} className="text-xxs text-violet-400 underline hover:text-violet-300">Try again</button>
        </div>
      ) : articles.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-xs text-gray-500">
          No articles found for "{searchQuery || query}".
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto pr-1 space-y-3">
          {articles.map((art, idx) => (
            <div 
              key={idx} 
              className="flex gap-3 bg-darkbg/40 p-2.5 rounded-xl border border-gray-800/60 hover:border-gray-700/80 transition group"
            >
              {art.urlToImage && art.urlToImage.startsWith('http') && (
                <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0 bg-gray-800">
                  <img 
                    src={art.urlToImage} 
                    alt="Article image" 
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                </div>
              )}
              <div className="flex-1 min-w-0 flex flex-col justify-between">
                <div>
                  <a 
                    href={art.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="block text-xs font-semibold text-gray-200 hover:text-violet-400 transition line-clamp-2 pr-4 relative"
                  >
                    {art.title}
                    <ExternalLink className="w-2.5 h-2.5 absolute right-0 top-0.5 text-gray-600 group-hover:text-violet-400 transition" />
                  </a>
                  <p className="text-[10px] text-gray-400 line-clamp-1 mt-1">{art.description}</p>
                </div>
                <div className="flex items-center gap-2 text-[9px] text-gray-500 mt-1.5 font-medium">
                  <span className="text-violet-400/90">{art.source}</span>
                  <span>•</span>
                  <span>{formatPublishDate(art.publishedAt)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
