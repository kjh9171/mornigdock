import { create } from 'zustand';

interface NavigationState {
  view: 'user' | 'admin' | 'news-detail' | 'ai-analysis';
  userTab: 'news' | 'discussion' | 'media';
  selectedNewsId: number | null;
  
  setView: (view: 'user' | 'admin' | 'news-detail' | 'ai-analysis') => void;
  setUserTab: (tab: 'news' | 'discussion' | 'media') => void;
  setSelectedNewsId: (id: number | null) => void;
}

export const useNavigationStore = create<NavigationState>((set) => ({
  view: 'user',
  userTab: 'news',
  selectedNewsId: null,

  setView: (view) => set({ view }),
  setUserTab: (userTab) => set({ userTab }),
  setSelectedNewsId: (selectedNewsId) => set({ selectedNewsId }),
}));
