import { create } from 'zustand';

interface NavigationState {
  view: 'user' | 'admin';
  userTab: 'news' | 'discussion' | 'media';
  
  setView: (view: 'user' | 'admin') => void;
  setUserTab: (tab: 'news' | 'discussion' | 'media') => void;
}

export const useNavigationStore = create<NavigationState>((set) => ({
  view: 'user',
  userTab: 'news',

  setView: (view) => set({ view }),
  setUserTab: (userTab) => set({ userTab }),
}));
