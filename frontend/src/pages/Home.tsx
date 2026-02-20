import { useNavigationStore } from '../store/useNavigationStore';
import { NewsList } from '../components/NewsList';
import { NewsDetail } from '../components/NewsDetail';
import { AIAnalysis } from '../components/AIAnalysis';
import { StockMarket } from '../components/StockMarket';
import { AgoraDiscussion } from '../components/AgoraDiscussion';
import { MediaCenter } from '../components/MediaCenter';
import { FinanceCenter } from '../components/FinanceCenter';

export default function Home() {
  const { view, userTab } = useNavigationStore();

  return (
    <div className="w-full space-y-8 animate-in fade-in duration-500">
      {/* 1. 글로벌 마켓 인텔리전스 (항상 상단 노출 - 뉴스/토론 리스트 뷰에서만) */}
      {(view === 'user' && (userTab === 'news' || userTab === 'discussion')) && <StockMarket />}

      {/* 2. 중앙 작전 화면 스위칭 (view 상태에 따라 정밀 제어) */}
      <div className="w-full">
        {view === 'user' && (
          <>
            {userTab === 'news' && <NewsList />}
            {userTab === 'discussion' && <AgoraDiscussion />}
            {userTab === 'media' && <MediaCenter />}
            {userTab === 'finance' && <FinanceCenter />}
          </>
        )}

        {/* 3. 통합 지능물 상세 & 아고라 토론 통합 뷰 (대표님의 핵심 요구사항) */}
        {view === 'news-detail' && <NewsDetail />}

        {/* 4. AI 전략 분석 리포트 화면 */}
        {view === 'ai-analysis' && <AIAnalysis />}
      </div>
    </div>
  );
}