import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useActivityLog } from '../utils/activityLogger';
import { Loader2, Music, Youtube, Mic, Trash2, Plus, Play, Pause } from 'lucide-react';

interface MediaItem {
  id: string;
  type: 'youtube' | 'podcast' | 'music';
  title: string;
  url: string;
  description: string;
  author: string;
  timestamp: string;
}

export function MediaCenter() {
  const { user } = useAuthStore();
  const { logActivity } = useActivityLog();
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  // Form State
  const [newType, setNewType] = useState<'youtube' | 'podcast' | 'music'>('youtube');
  const [newTitle, setNewTitle] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newDesc, setNewDesc] = useState('');

  const fetchMedia = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:8787/api/media');
      const data = await res.json();
      setMedia(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMedia();
  }, []);

  const handleAddMedia = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      await fetch('http://localhost:8787/api/media', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: newType,
          title: newTitle,
          url: newUrl,
          description: newDesc,
          author: user.email
        }),
      });
      logActivity(`Add Media: ${newTitle} (${newType})`);
      setShowAddForm(false);
      setNewTitle('');
      setNewUrl('');
      setNewDesc('');
      fetchMedia();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm('Are you sure you want to delete this content?')) return;
    try {
      await fetch(`http://localhost:8787/api/media/${id}`, { method: 'DELETE' });
      logActivity(`Delete Media: ${title}`);
      fetchMedia();
    } catch (err) {
      console.error(err);
    }
  };
  
  const getIcon = (type: string) => {
    switch (type) {
        case 'youtube': return <Youtube className="w-5 h-5 text-red-600" />;
        case 'podcast': return <Mic className="w-5 h-5 text-purple-600" />;
        case 'music': return <Music className="w-5 h-5 text-blue-600" />;
        default: return <Play className="w-5 h-5" />;
    }
  };

  return (
    <div className="w-full max-w-2xl">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-primary-800 flex items-center gap-2">
          <Play className="w-5 h-5 text-accent-600" />
          Media Hub
        </h2>
        {user?.isAdmin && (
          <button 
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-2 px-4 py-2 bg-stone-900 text-white rounded-full text-sm font-medium hover:bg-black transition-all shadow-soft"
          >
            <Plus className="w-4 h-4" />
            {showAddForm ? 'Cancel' : 'Add Content'}
          </button>
        )}
      </div>

      {/* Add Media Form (Admin Only) */}
      {showAddForm && (
        <form onSubmit={handleAddMedia} className="bg-stone-50 p-6 rounded-2xl border border-stone-200 mb-8 animate-in slide-in-from-top-4">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-stone-600 mb-1">Type</label>
              <select 
                value={newType} 
                onChange={(e) => setNewType(e.target.value as any)}
                className="w-full p-2 bg-white border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-accent-600"
              >
                <option value="youtube">YouTube</option>
                <option value="podcast">Podcast</option>
                <option value="music">Music</option>
              </select>
            </div>
            <div>
               <label className="block text-sm font-medium text-stone-600 mb-1">
                 {newType === 'youtube' ? 'YouTube ID (e.g. dQw4..)' : 'URL'}
               </label>
               <input 
                 type="text" 
                 required
                 value={newUrl}
                 onChange={(e) => setNewUrl(e.target.value)}
                 className="w-full p-2 bg-white border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-accent-600"
                 placeholder={newType === 'youtube' ? 'dQw4w9WgXcQ' : 'https://...'}
               />
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-stone-600 mb-1">Title</label>
            <input 
              type="text" 
              required
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="w-full p-2 bg-white border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-accent-600"
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-stone-600 mb-1">Description</label>
            <input 
              type="text" 
              required
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              className="w-full p-2 bg-white border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-accent-600"
            />
          </div>
          <button type="submit" className="w-full py-2 bg-accent-600 text-white rounded-lg font-medium hover:bg-accent-700 transition-colors">
            Post Content
          </button>
        </form>
      )}

      {/* Media List */}
      <div className="space-y-6">
        {loading ? (
           <div className="flex justify-center p-8"><Loader2 className="animate-spin text-stone-300" /></div>
        ) : media.length === 0 ? (
           <div className="text-center p-12 text-stone-400">No media content available.</div>
        ) : (
           media.map(item => (
             <div key={item.id} className="bg-white rounded-xl overflow-hidden border border-stone-200 shadow-soft">
               {/* Player / Content */}
               <div className="aspect-video bg-black flex items-center justify-center relative">
                  {item.type === 'youtube' ? (
                    <iframe 
                      className="w-full h-full"
                      src={`https://www.youtube.com/embed/${item.url}`}
                      title={item.title}
                      allowFullScreen
                    />
                  ) : (
                    <div className="text-white flex flex-col items-center gap-4">
                        {item.type === 'music' ? <Music className="w-12 h-12 opacity-50" /> : <Mic className="w-12 h-12 opacity-50" />}
                        <div className="bg-white/10 p-4 rounded-xl backdrop-blur-md">
                           {/* Placeholder for Audio Player */}
                           <p className="text-sm mb-2 font-mono opacity-80">AUDIO PLAYER PLACEHOLDER</p>
                           <audio controls src={item.url} className="w-64" />
                        </div>
                    </div>
                  )}
               </div>
               
               {/* Info */}
               <div className="p-5 flex justify-between items-start">
                 <div>
                    <div className="flex items-center gap-2 mb-1">
                        {getIcon(item.type)}
                        <span className="text-xs font-bold uppercase text-stone-400 tracking-wider">{item.type}</span>
                    </div>
                    <h3 className="font-bold text-primary-800 text-lg">{item.title}</h3>
                    <p className="text-stone-600 text-sm mt-1">{item.description}</p>
                 </div>
                 
                 {user?.isAdmin && (
                    <button 
                      onClick={() => handleDelete(item.id, item.title)}
                      className="p-2 text-stone-400 hover:text-red-500 transition-colors"
                      title="Delete Content"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                 )}
               </div>
             </div>
           ))
        )}
      </div>
    </div>
  );
}
