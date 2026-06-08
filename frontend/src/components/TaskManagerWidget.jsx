import React, { useState, useEffect } from 'react';
import { CheckSquare, Plus, Trash2, Calendar, AlertCircle, RefreshCw, ChevronDown, Check } from 'lucide-react';
import { api } from '../services/api';

export default function TaskManagerWidget({ tasks, onTasksUpdated }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('ALL'); // ALL, PENDING, COMPLETED
  const [showAddForm, setShowAddForm] = useState(false);
  
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('MEDIUM');
  const [dueDate, setDueDate] = useState('');

  const fetchTasks = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getTasks();
      onTasksUpdated(data);
    } catch (err) {
      setError('Failed to fetch tasks');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (task) => {
    const newStatus = task.status === 'COMPLETED' ? 'TODO' : 'COMPLETED';
    try {
      await api.updateTask(task.id, { status: newStatus });
      fetchTasks();
    } catch (err) {
      setError('Failed to update task status');
    }
  };

  const handleDeleteTask = async (id) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    try {
      await api.deleteTask(id);
      fetchTasks();
    } catch (err) {
      setError('Failed to delete task');
    }
  };

  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      const formattedDueDate = dueDate || new Date(Date.now() + 86400000).toISOString().split('T')[0]; // Default tomorrow
      await api.createTask({
        title,
        description,
        priority,
        dueDate: formattedDueDate,
        status: 'TODO'
      });
      setTitle('');
      setDescription('');
      setPriority('MEDIUM');
      setDueDate('');
      setShowAddForm(false);
      fetchTasks();
    } catch (err) {
      setError('Failed to create task');
    }
  };

  const getPriorityStyle = (pri) => {
    switch (pri) {
      case 'HIGH': return 'bg-red-500/10 text-red-400 border border-red-500/20';
      case 'MEDIUM': return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
      case 'LOW': return 'bg-blue-500/10 text-blue-400 border border-blue-500/20';
      default: return 'bg-gray-500/10 text-gray-400 border border-gray-500/20';
    }
  };

  const filteredTasks = tasks.filter(task => {
    if (filter === 'PENDING') return task.status !== 'COMPLETED';
    if (filter === 'COMPLETED') return task.status === 'COMPLETED';
    return true;
  });

  return (
    <div className="glass-card rounded-2xl p-6 flex flex-col h-[380px] relative">
      {/* Widget Header */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div className="flex items-center gap-2">
          <CheckSquare className="w-4 h-4 text-indigo-400" />
          <h2 className="text-sm font-semibold text-white">Task Manager</h2>
          <span className="text-[10px] bg-darkaccent px-2 py-0.5 rounded-full text-indigo-300 font-semibold border border-gray-800">
            {tasks.filter(t => t.status !== 'COMPLETED').length} pending
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowAddForm(!showAddForm)}
            className="p-1 bg-indigo-600/20 hover:bg-indigo-600 border border-indigo-500/30 hover:border-indigo-500 rounded-lg text-indigo-400 hover:text-white transition"
            title="Create Task"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
          <button 
            onClick={fetchTasks}
            className="text-gray-400 hover:text-white p-1 hover:bg-gray-800 rounded-lg transition"
            disabled={loading}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-indigo-500' : ''}`} />
          </button>
        </div>
      </div>

      {/* Inline Form to Add Task */}
      {showAddForm && (
        <form onSubmit={handleAddTask} className="bg-darkbg/90 p-4 rounded-xl border border-indigo-500/30 mb-4 shrink-0 space-y-3 z-10">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] text-gray-400 uppercase font-semibold mb-1">Title</label>
              <input 
                type="text" 
                value={title} 
                onChange={e => setTitle(e.target.value)}
                className="w-full text-xs bg-darkcard border border-gray-700 rounded px-2.5 py-1.5 text-white focus:outline-none focus:border-indigo-500"
                placeholder="Database replication checklist"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] text-gray-400 uppercase font-semibold mb-1">Due Date</label>
              <input 
                type="date" 
                value={dueDate} 
                onChange={e => setDueDate(e.target.value)}
                className="w-full text-xs bg-darkcard border border-gray-700 rounded px-2.5 py-1.5 text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-[10px] text-gray-400 uppercase font-semibold mb-1">Description</label>
            <input 
              type="text" 
              value={description} 
              onChange={e => setDescription(e.target.value)}
              className="w-full text-xs bg-darkcard border border-gray-700 rounded px-2.5 py-1.5 text-white focus:outline-none focus:border-indigo-500"
              placeholder="Verify master-slave synchronization logs"
            />
          </div>
          <div className="flex items-center justify-between pt-1">
            <div className="flex gap-2">
              {['LOW', 'MEDIUM', 'HIGH'].map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  className={`text-[9px] font-semibold px-2 py-1 rounded border transition ${
                    priority === p 
                      ? 'bg-indigo-600 border-indigo-500 text-white' 
                      : 'bg-darkcard border-gray-700 text-gray-400 hover:text-white'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button 
                type="submit" 
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xxs font-semibold px-3 py-1.5 rounded transition"
              >
                Add
              </button>
              <button 
                type="button" 
                onClick={() => setShowAddForm(false)}
                className="bg-gray-800 hover:bg-gray-700 text-gray-400 text-xxs font-semibold px-3 py-1.5 rounded transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Filter Tabs */}
      {!showAddForm && (
        <div className="flex gap-3 text-xxs font-semibold border-b border-gray-800 pb-2.5 mb-3 shrink-0">
          {['ALL', 'PENDING', 'COMPLETED'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`pb-1 uppercase tracking-wider transition ${
                filter === f ? 'text-indigo-400 border-b-2 border-indigo-500 font-bold' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      )}

      {/* Task List */}
      {loading && tasks.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : error ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center gap-2 text-gray-400">
          <AlertCircle className="w-6 h-6 text-red-500/80" />
          <p className="text-xs">{error}</p>
          <button onClick={fetchTasks} className="text-xxs text-indigo-400 underline hover:text-indigo-300">Try again</button>
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-xs text-gray-500 text-center gap-1.5 py-4">
          <CheckSquare className="w-8 h-8 text-gray-700/60" />
          <p>No tasks found in this view</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto pr-1 space-y-2.5">
          {filteredTasks.map((task) => (
            <div 
              key={task.id} 
              className={`flex items-center justify-between p-3 bg-darkbg/40 rounded-xl border border-gray-800/80 hover:border-gray-700/50 transition group ${
                task.status === 'COMPLETED' ? 'opacity-60' : ''
              }`}
            >
              {/* Left Side: Checkbox & Text */}
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <button
                  onClick={() => handleToggleStatus(task)}
                  className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition ${
                    task.status === 'COMPLETED' 
                      ? 'bg-indigo-600 border-indigo-500 text-white' 
                      : 'border-gray-700 bg-darkcard hover:border-indigo-500'
                  }`}
                >
                  {task.status === 'COMPLETED' && <Check className="w-3 h-3 stroke-[3]" />}
                </button>
                <div className="min-w-0">
                  <span className={`block text-xs font-semibold text-gray-200 truncate ${
                    task.status === 'COMPLETED' ? 'line-through text-gray-500' : ''
                  }`}>
                    {task.title}
                  </span>
                  {task.description && (
                    <span className="block text-[10px] text-gray-500 truncate mt-0.5">
                      {task.description}
                    </span>
                  )}
                </div>
              </div>

              {/* Right Side: Badges & Actions */}
              <div className="flex items-center gap-3 shrink-0">
                <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full ${getPriorityStyle(task.priority)}`}>
                  {task.priority}
                </span>
                <span className="flex items-center gap-1 text-[9px] text-gray-500 font-semibold">
                  <Calendar className="w-3 h-3" />
                  {task.dueDate}
                </span>
                <button
                  onClick={() => handleDeleteTask(task.id)}
                  className="text-gray-500 hover:text-red-400 p-1 hover:bg-gray-800/50 rounded transition opacity-0 group-hover:opacity-100"
                  title="Delete Task"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
