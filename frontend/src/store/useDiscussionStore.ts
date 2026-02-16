import { create } from 'zustand';

interface PostDraft {
  title: string;
  content: string;
}

interface DiscussionState {
  view: 'list' | 'detail' | 'write';
  activePostId: string | null;
  draft: PostDraft | null;
  
  setView: (view: 'list' | 'detail' | 'write') => void;
  setActivePostId: (id: string | null) => void;
  setDraft: (draft: PostDraft | null) => void;
  
  // Actions to switch context
  startDiscussion: (title: string, content: string) => void;
}

export const useDiscussionStore = create<DiscussionState>((set) => ({
  view: 'list',
  activePostId: null,
  draft: null,

  setView: (view) => set({ view }),
  setActivePostId: (id) => set({ activePostId: id }),
  setDraft: (draft) => set({ draft }),

  startDiscussion: (title, content) => set({
    view: 'write',
    draft: { title, content }
  }),
}));
