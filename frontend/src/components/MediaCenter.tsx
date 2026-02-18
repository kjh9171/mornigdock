import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Youtube, Mic, Music, Trash2, Plus, Play, Loader2 } from 'lucide-react';

export function MediaCenter() {
  const { user } = useAuth();
  const [media, setMedia] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  const fetchMedia = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:8787/api/media');
      const data = await res.json();
      setMedia(data.media || data);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchMedia(); }, []);

  return (
    <div className="w-full max-w-4xl mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold flex items-center gap-2"><Play className="w-5 h-5 text-amber-600" /> Media Hub</h2>
        {user?.role === 'admin' && (
          <button onClick={() => setShowAddForm(!showAddForm)} className="flex items-center gap-2 px-4 py-2 bg-stone-900 text-white rounded-full text-xs font-bold">
            <Plus className="w-4 h-4" /> {showAddForm ? 'CANCEL' : 'ADD CONTENT'}
          </button>
        )}
      </div>

      {/* 관리자 폼 (대표님 요청 기능) */}
      {showAddForm && (
        <div className="bg-stone-50 p-6 rounded-2xl border mb-6 animate-in slide-in-from-top-4">
          <input className="w-full p-2 mb-2 border rounded-lg text-sm" placeholder="Title" />
          <input className="w-full p-2 mb-4 border rounded-lg text-sm" placeholder="YouTube ID or URL" />
          <button className="w-full py-2 bg-amber-600 text-white rounded-lg text-sm font-bold">DEPLY</button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {media.map(item => (
          <div key={item.id} className="bg-white rounded-xl overflow-hidden border border-stone-200 shadow-sm">
            <div className="aspect-video bg-black flex items-center justify-center">
              {item.type === 'youtube' ? (
                <iframe className="w-full h-full" src={`https://www.youtube.com/embed/${item.url}`} title={item.title} allowFullScreen />
              ) : (
                <audio controls src={item.url} className="w-full px-4" />
              )}
            </div>
            <div className="p-4 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-stone-800">{item.title}</h3>
                <p className="text-xs text-stone-500">{item.description}</p>
              </div>
              {user?.role === 'admin' && <Trash2 onClick={() => {}} className="w-4 h-4 text-stone-300 hover:text-red-500 cursor-pointer" />}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}