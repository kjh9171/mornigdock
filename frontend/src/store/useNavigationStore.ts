import { create } from 'zustand';
import { persist } from 'zustand/middleware'; // 새로고침 시 상태 유지를 위해 추가

// ─────────────────────────────────────────────
// Navigation 타입 정의 (6대 핵심 구역 정의)
// ─────────────────────────────────────────────
interface NavigationState {
  view: 'user' | 'admin' | 'news-detail' | 'ai-analysis';
  userTab: 'news' | 'finance' | 'discussion' | 'media' | 'settings';
  selectedNewsId: number | null;
  
  // Actions
  setView: (view: 'user' | 'admin' | 'news-detail' | 'ai-analysis') => void;
  setUserTab: (tab: 'news' | 'finance' | 'discussion' | 'media' | 'settings') => void;
  setSelectedNewsId: (id: number | null) => void;
  resetNavigation: () => void; // 로그아웃 등을 위한 초기화 함수 추가
}

// ─────────────────────────────────────────────
// 스토어 구현 (Persist 적용)
// ─────────────────────────────────────────────
export const useNavigationStore = create<NavigationState>()(
  persist(
    (set) => ({
      view: 'user',
      userTab: 'news', // 대표님 명령: 지능보고서(news)를 기본값으로 설정
      selectedNewsId: null,

      // 뷰 전환 시 관련 데이터가 꼬이지 않도록 로직 보강
      setView: (view) => set((state) => {
        // 상세 페이지에서 나갈 때는 ID를 초기화하여 메모리 누수 방지
        const selectedNewsId = (view !== 'news-detail' && view !== 'ai-analysis') 
          ? null 
          : state.selectedNewsId;
          
        return { view, selectedNewsId };
      }),

      setUserTab: (userTab) => set({ userTab, view: 'user' }),
      
      setSelectedNewsId: (selectedNewsId) => set({ 
        selectedNewsId,
        // ID가 설정되면 자동으로 뷰를 상세 페이지로 전환하는 편의 로직
        view: selectedNewsId ? 'news-detail' : 'user' 
      }),

      // 모든 네비게이션 상태 초기화 (보안 총괄의 추천 기능)
      resetNavigation: () => set({
        view: 'user',
        userTab: 'news',
        selectedNewsId: null
      })
    }),
    {
      name: 'agora-navigation-storage', // 로컬 스토리지 키 이름
    }
  )
);