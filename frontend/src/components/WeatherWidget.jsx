import React, { useState, useEffect } from 'react';
import { CloudRain, Sun, Cloud, Wind, Droplets, RefreshCw, MapPin, AlertCircle } from 'lucide-react';
import { api } from '../services/api';

export default function WeatherWidget({ city }) {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchCity, setSearchCity] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  const fetchWeatherData = async (targetCity) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getWeather(targetCity);
      setWeather(data);
    } catch (err) {
      setError('Could not load weather data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWeatherData(city);
  }, [city]);

  const handleRefresh = () => {
    fetchWeatherData(weather ? weather.city : city);
  };

  const handleCitySearch = (e) => {
    e.preventDefault();
    if (searchCity.trim()) {
      fetchWeatherData(searchCity);
      setShowSearch(false);
    }
  };

  const getWeatherIcon = (iconCode, description = '') => {
    const desc = description.toLowerCase();
    if (desc.includes('rain')) return <CloudRain className="w-12 h-12 text-blue-400" />;
    if (desc.includes('cloud')) return <Cloud className="w-12 h-12 text-gray-400" />;
    if (desc.includes('clear')) return <Sun className="w-12 h-12 text-yellow-400" />;
    
    // Default fallback using standard OpenWeather icon if available
    if (iconCode) {
      return (
        <img 
          src={`https://openweathermap.org/img/wn/${iconCode}@2x.png`} 
          alt={description}
          className="w-16 h-16 -my-2"
        />
      );
    }
    return <Sun className="w-12 h-12 text-yellow-400" />;
  };

  return (
    <div className="glass-card rounded-2xl p-6 flex flex-col justify-between min-h-[200px] relative overflow-hidden transition">
      {/* Background Glow */}
      <div className="absolute -right-10 -top-10 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl"></div>

      {/* Header */}
      <div className="flex items-center justify-between z-10 mb-4">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-indigo-400" />
          {!showSearch ? (
            <button 
              onClick={() => { setSearchCity(weather?.city || city); setShowSearch(true); }}
              className="text-sm font-semibold text-white hover:text-indigo-400 transition"
              title="Click to change city"
            >
              {weather ? weather.city : city}
            </button>
          ) : (
            <form onSubmit={handleCitySearch} className="flex gap-2">
              <input 
                type="text" 
                value={searchCity}
                onChange={e => setSearchCity(e.target.value)}
                className="bg-darkbg text-xs border border-gray-700 rounded px-2 py-1 text-white w-24 focus:outline-none focus:border-indigo-500"
                placeholder="City name"
                autoFocus
              />
              <button type="submit" className="text-xxs bg-indigo-600 px-1.5 py-0.5 rounded text-white hover:bg-indigo-500">Go</button>
              <button type="button" onClick={() => setShowSearch(false)} className="text-xxs text-gray-400 hover:text-white">Cancel</button>
            </form>
          )}
        </div>
        <div className="flex items-center gap-2">
          {weather?.isMock && <span className="text-[10px] bg-darkaccent text-gray-400 px-2 py-0.5 rounded-full border border-gray-800">Simulated</span>}
          <button 
            onClick={handleRefresh}
            className="text-gray-400 hover:text-white transition p-1 hover:bg-gray-800 rounded-lg"
            disabled={loading}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-indigo-500' : ''}`} />
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center py-4">
          <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : error ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center py-4 gap-2 text-gray-400">
          <AlertCircle className="w-6 h-6 text-red-500/80" />
          <p className="text-xs">{error}</p>
          <button onClick={handleRefresh} className="text-xxs text-indigo-400 underline hover:text-indigo-300">Try again</button>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-between z-10">
          <div className="space-y-1">
            <div className="flex items-start">
              <span className="text-4xl font-extrabold text-white tracking-tight">{Math.round(weather.temp)}</span>
              <span className="text-lg font-bold text-indigo-400">°C</span>
            </div>
            <p className="text-xs font-medium text-gray-400 capitalize">{weather.description}</p>
          </div>
          <div>
            {getWeatherIcon(weather.icon, weather.description)}
          </div>
        </div>
      )}

      {/* Stats Footer */}
      {!loading && !error && weather && (
        <div className="grid grid-cols-2 gap-4 pt-4 mt-4 border-t border-gray-800/80 text-xxs text-gray-400 z-10">
          <div className="flex items-center gap-1.5">
            <Droplets className="w-3.5 h-3.5 text-blue-400/80" />
            <div>
              <span className="block text-gray-500">HUMIDITY</span>
              <span className="font-semibold text-gray-200">{weather.humidity}%</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Wind className="w-3.5 h-3.5 text-teal-400/80" />
            <div>
              <span className="block text-gray-500">WIND SPEED</span>
              <span className="font-semibold text-gray-200">{weather.windSpeed} m/s</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
