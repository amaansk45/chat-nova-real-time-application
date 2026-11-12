import React, { useState, useEffect } from 'react';
import {
  FileText,
  Plus,
  Pin,
  Trash2,
  Search,
  Check,
  Edit3,
} from 'lucide-react';
import Sidebar from '../../components/layout/Sidebar';
import Header from '../../components/layout/Header';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import api from '../../utils/api';
import { useToast } from '../../components/ui/Toast';

interface PersonalNote {
  id: string;
  title: string;
  content: string;
  color: string;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
}

const COLOR_OPTIONS = ['#2563EB', '#7C3AED', '#059669', '#D97706', '#E11D48'];

export const PersonalNotesPage: React.FC = () => {
  const [notes, setNotes] = useState<PersonalNote[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  // Create / Edit modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [color, setColor] = useState(COLOR_OPTIONS[0]);
  const [isPinned, setIsPinned] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const { showToast } = useToast();

  useEffect(() => {
    loadNotes();
  }, []);

  const loadNotes = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/social/notes/');
      setNotes(res.data.results || res.data || []);
    } catch (err) {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingNoteId(null);
    setTitle('');
    setContent('');
    setColor(COLOR_OPTIONS[0]);
    setIsPinned(false);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (note: PersonalNote) => {
    setEditingNoteId(note.id);
    setTitle(note.title);
    setContent(note.content);
    setColor(note.color || COLOR_OPTIONS[0]);
    setIsPinned(note.is_pinned);
    setIsModalOpen(true);
  };

  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) {
      showToast('Note content cannot be empty.', 'error');
      return;
    }

    setIsSaving(true);
    try {
      if (editingNoteId) {
        const res = await api.patch(`/api/social/notes/${editingNoteId}/`, {
          title: title.trim() || 'Untitled Note',
          content: content.trim(),
          color,
          is_pinned: isPinned,
        });
        setNotes((prev) => prev.map((n) => (n.id === editingNoteId ? res.data : n)));
        showToast('Note updated!', 'success');
      } else {
        const res = await api.post('/api/social/notes/', {
          title: title.trim() || 'Untitled Note',
          content: content.trim(),
          color,
          is_pinned: isPinned,
        });
        setNotes((prev) => [res.data, ...prev]);
        showToast('Note created!', 'success');
      }
      setIsModalOpen(false);
    } catch (err) {
      showToast('Failed to save note.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteNote = async (id: string) => {
    try {
      await api.delete(`/api/social/notes/${id}/`);
      setNotes((prev) => prev.filter((n) => n.id !== id));
      showToast('Note deleted.', 'info');
    } catch (err) {
      showToast('Failed to delete note.', 'error');
    }
  };

  const handleTogglePin = async (note: PersonalNote) => {
    try {
      const res = await api.patch(`/api/social/notes/${note.id}/`, {
        is_pinned: !note.is_pinned,
      });
      setNotes((prev) => prev.map((n) => (n.id === note.id ? res.data : n)));
    } catch (err) {
      showToast('Failed to toggle pin.', 'error');
    }
  };

  const filteredNotes = notes.filter(
    (n) =>
      n.title.toLowerCase().includes(search.toLowerCase()) ||
      n.content.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-nova-dark text-slate-100 antialiased">
      <Sidebar />

      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <Header />

        <div className="flex-1 overflow-y-auto p-6 max-w-5xl mx-auto w-full custom-scrollbar">
          {/* Page Title & Add Button */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Personal Notes & Scratchpad</h1>
              <p className="text-xs text-nova-muted">Quick private ideas, drafts, and reminders</p>
            </div>

            <Button variant="primary" onClick={handleOpenCreate}>
              <Plus className="w-4 h-4 mr-1.5" /> New Note
            </Button>
          </div>

          {/* Search Bar */}
          <div className="relative mb-6">
            <Search className="w-4 h-4 text-nova-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search notes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-nova-card border border-nova-border rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-nova-muted focus:outline-none focus:border-nova-primary"
            />
          </div>

          {/* Notes Grid */}
          {loading ? (
            <div className="py-20 text-center text-xs text-nova-muted animate-pulse">
              Loading notes...
            </div>
          ) : filteredNotes.length === 0 ? (
            <div className="py-24 text-center">
              <div className="w-16 h-16 rounded-3xl bg-nova-card border border-nova-border flex items-center justify-center text-nova-muted mx-auto mb-3">
                <FileText className="w-8 h-8 opacity-40" />
              </div>
              <h3 className="text-base font-bold text-white">No notes yet</h3>
              <p className="text-xs text-nova-muted mt-1">Capture your thoughts, links, and reminders privately.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredNotes.map((note) => (
                <div
                  key={note.id}
                  style={{ borderTopColor: note.color || '#2563EB' }}
                  className="p-4 bg-nova-card border border-nova-border border-t-4 rounded-2xl flex flex-col justify-between shadow-md group hover:border-nova-primary/50 transition-all min-h-44"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-bold text-white truncate">{note.title}</h4>
                      <button
                        onClick={() => handleTogglePin(note)}
                        className={`p-1 rounded text-nova-muted hover:text-white ${
                          note.is_pinned ? 'text-nova-accent' : ''
                        }`}
                        title="Pin note"
                      >
                        <Pin className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed line-clamp-4 select-text">
                      {note.content}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-3 mt-3 border-t border-nova-border/50 text-[10px] text-nova-muted">
                    <span>{new Date(note.updated_at).toLocaleDateString()}</span>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleOpenEdit(note)}
                        className="p-1 rounded text-nova-muted hover:text-white"
                        title="Edit note"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteNote(note.id)}
                        className="p-1 rounded text-nova-muted hover:text-nova-error"
                        title="Delete note"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Note Edit / Create Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingNoteId ? 'Edit Note' : 'Create Note'}
        size="md"
      >
        <form onSubmit={handleSaveNote} className="space-y-4">
          <Input
            label="Title"
            type="text"
            placeholder="Meeting points, To-do, or Ideas"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <div>
            <label className="text-xs font-semibold text-nova-muted uppercase tracking-wider block mb-1">
              Content
            </label>
            <textarea
              rows={5}
              placeholder="Write your note content here..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full bg-nova-dark border border-nova-border rounded-xl p-3 text-xs text-white placeholder-nova-muted focus:outline-none focus:border-nova-primary resize-none custom-scrollbar"
              required
            />
          </div>

          {/* Color picker */}
          <div>
            <label className="text-xs font-semibold text-nova-muted uppercase tracking-wider block mb-1.5">
              Highlight Color
            </label>
            <div className="flex gap-2">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c}
                  type="button"
                  style={{ backgroundColor: c }}
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full flex items-center justify-center transition-transform ${
                    color === c ? 'scale-110 ring-2 ring-white' : ''
                  }`}
                >
                  {color === c && <Check className="w-3.5 h-3.5 text-white" />}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-nova-border">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSaving}>
              Save Note
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default PersonalNotesPage;
