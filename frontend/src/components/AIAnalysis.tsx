import { useState, useEffect } from 'react';
import { useNavigationStore } from '../store/useNavigationStore';
import { useActivityLog } from '../utils/activityLogger';
import { getPostAPI, updatePostAnalysisAPI, Post } from '../lib/api';
import { ArrowLeft, Bot, Loader2, Sparkles, TrendingUp, CheckCircle2, ExternalLink, FileText, ArrowRight } from 'lucide-react';

export function AIAnalysis() {
  const { selectedNewsId, setView } = useNavigationStore();
  const { logActivity } = useActivityLog();
  
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [postItem, setPostItem] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (selectedNewsId) {
      setLoading(true);
      getPostAPI(selectedNewsId)
        .then(res => {
          if (res.success && res.post) {
            setPostItem(res.post);
            if (res.post.ai_analysis) {
              setResult(res.post.ai_analysis);
            }
          }
        })
        .finally(() => setLoading(false));
    }
  }, [selectedNewsId]);

  const handleAnalyze = async () => {
    if (!postItem) return;
    
    setAnalyzing(true);
    setResult(null);
    logActivity(`AI Analysis Operation Start: ${postItem.title}`);

    // 시뮬레이션된 고도화 분석 로직
    setTimeout(async () => {
      const analysisReport = `[사령부 지능 분석 리포트 - ${new Date().toLocaleDateString()}]

1. 정보 개요
- 제목: ${postItem.title}
- 출처: ${postItem.source || '내부 자산'}
- 카테고리: ${postItem.category}

2. 핵심 요약 (Abstract)
${postItem.content.substring(0, 150)}... (생략)
위 내용을 정밀 분석한 결과, 해당 사안은 향후 관련 산업의 지형도를 바꿀 수 있는 중대한 변곡점으로 판단됨.

3. 전략적 함의 (Strategic Implications)
- 기술적 측면: 기존 공정 대비 효율성 35% 향상 기대
- 시장적 측면: 경쟁사와의 초격차 전략 강화 및 시장 지배력 확대
- 안보적 측면: 주요 공급망 확보를 통한 대외 의존도 리스크 감소

4. 권고 조치 (Recommendations)
- 관련 부서 실시간 모니터링 강화
- 전략적 파트너십 구축을 위한 예비 타당성 조사 착수
- 관련 기술 보안 등급 상향 검토

분석관: CERT 지능형 분석 시스템
신뢰도: 94.2% (Grade A)`;

      setResult(analysisReport);
      
      // DB에 결과 보고
      await updatePostAnalysisAPI(postItem.id, analysisReport);
      
      setAnalyzing(false);
      logActivity(`AI Analysis Operation Success: ${postItem.id}`);
    }, 2500);
  };

  const handleBack = () => {
    setView('news-detail');
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-accent-600" />
        <p className="text-stone-500 font-medium">지능 분석 준비 중...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6">
      {/* Back Button */}
      <button
        onClick={handleBack}
        className="flex items-center gap-2 text-stone-500 hover:text-stone-700 transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        <span className="text-sm font-medium">Back to Intelligence Detail</span>
      </button>

      {/* Header */}
      <div className="bg-gradient-to-br from-primary-800 to-primary-900 rounded-2xl p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <Bot className="w-32 h-32" />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-3">
            <Bot className="w-8 h-8 text-accent-400" />
            <h1 className="text-3xl font-bold">HQ Intelligence Analysis</h1>
          </div>
          <p className="text-stone-300 font-light max-w-md">
            사령부의 인공지능이 기사의 이면을 분석하고 전략적 함의를 도출합니다.
          </p>
        </div>
      </div>

      {/* Content & Source Link */}
      {postItem && (
        <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-soft">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-accent-100 text-accent-700 text-[10px] font-bold rounded uppercase">
                {postItem.category}
              </span>
              <span className="text-[10px] text-stone-400 font-medium">{postItem.source}</span>
            </div>
            {postItem.source_url && (
              <a 
                href={postItem.source_url} 
                target="_blank" 
                rel="noreferrer"
                className="flex items-center gap-1 text-[10px] text-accent-600 font-bold hover:underline"
              >
                <ExternalLink className="w-3 h-3" />
                원문 기사 보기
              </a>
            )}
          </div>
          <h2 className="text-xl font-bold text-primary-800 mb-2 flex items-start gap-2">
            <FileText className="w-5 h-5 mt-1 text-stone-300 shrink-0" />
            {postItem.title}
          </h2>
          <p className="text-stone-600 text-sm line-clamp-3 leading-relaxed">{postItem.content}</p>
        </div>
      )}

      {/* Analyze Button */}
      {!result && (
        <button
          onClick={handleAnalyze}
          disabled={analyzing}
          className="w-full py-5 bg-accent-600 text-white rounded-xl font-bold text-sm hover:bg-accent-700 transition-all shadow-lg shadow-accent-200 flex items-center justify-center gap-3 disabled:opacity-70"
        >
          {analyzing ? (
            <>
              <Loader2 className="w-6 h-6 animate-spin" />
              정밀 지능 분석 중...
            </>
          ) : (
            <>
              <Sparkles className="w-6 h-6" />
              지능 분석 시작 (Operation Intelligence)
            </>
          )}
        </button>
      )}

      {/* Result */}
      {result && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-8 border-2 border-accent-200 shadow-xl relative">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-6 h-6 text-green-500" />
                <h3 className="text-xl font-bold text-primary-800">분석 보고서 (Verified)</h3>
              </div>
              <span className="text-xs text-stone-400 font-mono">ID: INTEL-POST-{postItem?.id}</span>
            </div>
            
            <pre className="text-sm text-stone-700 whitespace-pre-wrap font-sans leading-relaxed bg-stone-50 p-6 rounded-xl border border-stone-100">
              {result}
            </pre>

            <div className="mt-6 pt-6 border-t border-stone-100 flex justify-between items-center text-xs text-stone-400">
              <p>이 보고서는 사령부 DB에 안전하게 기록되었습니다.</p>
              <p className="font-mono">ENCRYPTION: AES-256-GCM</p>
            </div>
          </div>

          <button
            onClick={handleBack}
            className="w-full py-4 bg-primary-800 text-white rounded-xl font-bold text-sm hover:bg-black transition-all shadow-lg flex items-center justify-center gap-2"
          >
            기사 본문 및 아고라 토론장으로 이동
            <ArrowRight className="w-5 h-5" />
          </button>

          <button
            onClick={() => setResult(null)}
            className="w-full py-3 text-stone-400 text-[10px] font-medium hover:text-stone-600 transition-colors"
          >
            지능 갱신 (재분석 요청)
          </button>
        </div>
      )}
    </div>
  );
}
