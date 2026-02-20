import { useNavigationStore } from '../store/useNavigationStore';
import { NewsList } from '../components/NewsList';
import { NewsDetail } from '../components/NewsDetail';
import { AIAnalysis } from '../components/AIAnalysis';
import { StockMarket } from '../components/StockMarket';
import { AgoraDiscussion } from '../components/AgoraDiscussion';
import { MediaCenter } from '../components/MediaCenter';
import { FinanceCenter } from '../components/FinanceCenter';
import { UserSettings } from '../components/UserSettings';

export default function Home() {
  const { view, userTab } = useNavigationStore();

  return (
    <div className="w-full animate-in fade-in duration-500">
      {/* ─── 중앙 주 작전 구역 (탭별로 엄격히 분리) ─── */}
      <div className="w-full">
        {view === 'user' && (
          <div className="space-y-8">
            {/* 1. 지능 보고서 구역 */}
            {userTab === 'news' && (
              <div className="animate-in slide-in-from-bottom-2">
                <NewsList />
              </div>
            )}

            {/* 2. 증시 지휘소 구역 (증시 지표를 여기에만 배치) */}
            {userTab === 'finance' && (
              <div className="space-y-8 animate-in slide-in-from-bottom-2">
                <StockMarket />
                <FinanceCenter />
              </div>
            )}

            {/* 3. 아고라 토론 구역 */}
            {userTab === 'discussion' && (
              <div className="animate-in slide-in-from-bottom-2">
                <AgoraDiscussion />
              </div>
            )}

            {/* 4. 미디어 센터 구역 */}
            {userTab === 'media' && (
              <div className="animate-in slide-in-from-bottom-2">
                <MediaCenter />
              </div>
            )}

            {/* 5. 사용자 설정 구역 */}
            {userTab === 'settings' && (
              <div className="animate-in slide-in-from-bottom-2">
                <UserSettings />
              </div>
            )}
          </div>
        )}

        {/* ─── 상세 및 분석 모드 (독립 레이아웃) ─── */}
        
        {/* 통합 지능물 상세 & 아고라 토론 통합 뷰 */}
        {view === 'news-detail' && <NewsDetail />}

        {/* AI 전략 분석 리포트 화면 */}
        {view === 'ai-analysis' && <AIAnalysis />}
      </div>
    </div>
  );
}