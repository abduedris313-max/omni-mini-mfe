import React, { useState, useEffect } from 'react';
import { MiniAppBridgeSDK } from '../types/miniapp';
import {
  FileText,
  Plus,
  Trash2,
  Tag,
  CheckCircle2,
  Circle,
} from 'lucide-react';

interface NoteFlowProps {
  sdk: MiniAppBridgeSDK;
}

interface Note {
  id: string;
  title: string;
  category: string;
  content: string;
  completed?: boolean;
  updatedAt: string;
}

export const NoteFlowApp: React.FC<NoteFlowProps> = ({ sdk }) => {
  const settings = sdk.settings.getSettings();
  const defaultCategory = settings.defaultCategory || 'ideas';

  const [notes, setNotes] = useState<Note[]>(() => {
    const saved = sdk.storage.getItem('user_notes');
    if (saved && Array.isArray(saved)) return saved;
    return [
      {
        id: 'note-1',
        title: 'Micro Frontend Super App Architecture',
        category: 'ideas',
        content: 'Design sandboxed MiniAppBridge with scoped permissions and pluggable settings provider.',
        completed: false,
        updatedAt: 'Today',
      },
      {
        id: 'note-2',
        title: 'Publish PayPulse v2.4.0',
        category: 'work',
        content: 'Check biometric prompt and shared Super App wallet deduction hooks.',
        completed: true,
        updatedAt: 'Yesterday',
      },
    ];
  });

  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    sdk.storage.setItem('user_notes', notes);
  }, [notes]);

  const addNote = () => {
    if (!newTitle.trim()) {
      sdk.ui.showToast('Note title cannot be blank', 'warning');
      return;
    }

    const note: Note = {
      id: `note-${Date.now()}`,
      title: newTitle,
      category: defaultCategory,
      content: newContent || 'No description provided.',
      completed: false,
      updatedAt: 'Just now',
    };

    setNotes([note, ...notes]);
    setNewTitle('');
    setNewContent('');
    setIsCreating(false);
    sdk.ui.showToast('Note saved to private vault', 'success');
    sdk.ui.hapticFeedback('success');
  };

  const toggleComplete = (id: string) => {
    sdk.ui.hapticFeedback('light');
    setNotes(
      notes.map((n) => (n.id === id ? { ...n, completed: !n.completed } : n))
    );
  };

  const deleteNote = (id: string) => {
    sdk.ui.hapticFeedback('medium');
    setNotes(notes.filter((n) => n.id !== id));
    sdk.ui.showToast('Note removed', 'info');
  };

  const filteredNotes = notes.filter((n) => {
    if (activeCategory === 'all') return true;
    return n.category === activeCategory;
  });

  return (
    <div className="p-4 space-y-4 text-slate-100 pb-20">
      {/* Category Filter Pills */}
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
        {['all', 'ideas', 'work', 'personal'].map((cat) => (
          <button
            key={cat}
            onClick={() => { setActiveCategory(cat); sdk.ui.hapticFeedback('light'); }}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold capitalize whitespace-nowrap transition ${
              activeCategory === cat
                ? 'bg-purple-600 text-white shadow-sm'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Create Note Section */}
      {isCreating ? (
        <div className="rounded-3xl bg-slate-900 border border-purple-500/40 p-4 space-y-3 shadow-lg shadow-purple-950/20">
          <div className="flex justify-between items-center text-xs">
            <span className="font-semibold text-purple-400">New Note in #{defaultCategory}</span>
            <button
              onClick={() => setIsCreating(false)}
              className="text-slate-400 hover:text-white"
            >
              Cancel
            </button>
          </div>

          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Title..."
            className="w-full px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm font-bold text-white focus:outline-none focus:border-purple-500"
          />

          <textarea
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            placeholder="Write your thoughts..."
            rows={3}
            className="w-full px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-purple-500 resize-none"
          />

          <button
            onClick={addNote}
            className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-xs font-bold text-white transition flex items-center justify-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Save Note</span>
          </button>
        </div>
      ) : (
        <button
          onClick={() => { setIsCreating(true); sdk.ui.hapticFeedback('light'); }}
          className="w-full py-3 rounded-2xl bg-slate-900/90 hover:bg-slate-800 border border-dashed border-slate-700 text-xs font-semibold text-slate-300 transition flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4 text-purple-400" />
          <span>Add New Note in #{defaultCategory}</span>
        </button>
      )}

      {/* Notes List */}
      <div className="space-y-2.5">
        {filteredNotes.map((note) => (
          <div
            key={note.id}
            className={`p-3.5 rounded-2xl bg-slate-900/80 border transition flex items-start gap-3 backdrop-blur-md ${
              note.completed ? 'border-slate-800 opacity-60' : 'border-slate-800/80'
            }`}
          >
            <button
              onClick={() => toggleComplete(note.id)}
              className="mt-0.5 text-purple-400 hover:text-purple-300"
            >
              {note.completed ? (
                <CheckCircle2 className="w-4 h-4 fill-purple-600 text-slate-950" />
              ) : (
                <Circle className="w-4 h-4" />
              )}
            </button>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h4 className={`text-xs font-bold ${note.completed ? 'line-through text-slate-500' : 'text-white'}`}>
                  {note.title}
                </h4>
                <span className="text-[10px] text-purple-300/80 font-mono">#{note.category}</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">{note.content}</p>
              <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500">
                <span>Updated {note.updatedAt}</span>
                <button
                  onClick={() => deleteNote(note.id)}
                  className="p-1 text-slate-500 hover:text-rose-400 transition"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
