import React, { useState, useEffect } from 'react';
import { Search, Clock, Calendar, Database, RefreshCw, Cpu } from 'lucide-react';

export default function Header({ searchVal, onSearchChange, onGlobalSearch, onRefreshAll }) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatDate = (date) => {
    const options = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (onGlobalSearch) {
      onGlobalSearch(searchVal);
    }
  };

  return (
    <header className="bg-darkcard border-b border-gray-800 px-8 py-4 flex items-center justify-between sticky top-0 z-10 w-full">
      {/* Search Bar */}
      <form onSubmit={handleSearchSubmit} className="relative w-96 group">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-indigo-400 transition" />
        <input 
          type="text" 
          value={searchVal}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search technologies, news, or triggers..."
          className="w-full pl-10 pr-4 py-2 bg-darkbg border border-gray-800 rounded-xl text-sm text-gray-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition placeholder-gray-500"
        />
        <button type="submit" className="hidden" />
      </form>

      {/* Clock & Status Panel */}
      <div className="flex items-center gap-6">
        {/* PostgreSQL Database Indicator */}
        <div className="flex items-center gap-2 bg-darkbg/80 border border-gray-800 px-3 py-1.5 rounded-xl text-xs text-gray-400">
          <Database className="w-3.5 h-3.5 text-indigo-500" />
          <span className="font-semibold text-gray-300">PostgreSQL</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
        </div>

        {/* Global Refresh Button */}
        <button 
          onClick={onRefreshAll}
          className="p-2 bg-darkbg hover:bg-gray-800 border border-gray-800 rounded-xl text-gray-400 hover:text-white transition"
          title="Refresh All Widgets"
        >
          <RefreshCw className="w-4 h-4" />
        </button>

        {/* Clock & Date Widget */}
        <div className="flex items-center gap-4 bg-gradient-to-r from-indigo-950/40 to-violet-950/20 border border-indigo-900/30 px-4 py-1.5 rounded-xl">
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-400">
            <Calendar className="w-4 h-4" />
            <span>{formatDate(time)}</span>
          </div>
          <div className="h-4 w-px bg-gray-800"></div>
          <div className="flex items-center gap-2 text-sm font-bold text-gray-100 tracking-wider">
            <Clock className="w-4 h-4 text-violet-400" />
            <span>{formatTime(time)}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
