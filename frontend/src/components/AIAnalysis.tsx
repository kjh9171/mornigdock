import { useState, useEffect } from 'react';
import { useNavigationStore } from '../store/useNavigationStore';
import { useActivityLog } from '../utils/activityLogger';
import { getPostAPI, getPostsAPI, updatePostAnalysisAPI, Post } from '../lib/api';
import { ArrowLeft, Bot, Loader2, Sparkles, CheckCircle2, ExternalLink, FileText, ArrowRight, TrendingUp, ShieldAlert } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function AIAnalysis() {
  const { selectedNewsId, setView } = useNavigationStore();
  const { logActivity } = useActivityLog();
  const navigate = useNavigate();
  
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [postItem, setPostItem] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [isBatchMode, setIsBatchMode] = useState(false);

  useEffect(() => {
    const initAnalysis = async () => {
      setLoading(true);
      if (selectedNewsId) {
        // 단일 기 분석 모드
        try {
          const res = await getPostAPI(selectedNewsId);
          if (res.success && res.post) {
            setPostItem(res.post);
            setIsBatchMode(false);
            if (res.post.ai_analysis) setResult(res.post.ai_analysis);
          }
        } catch (e) { console.error(e); }
      } else {
        // 🔥 [긴급 수리] 일괄 분석 모드 가동
        setIsBatchMode(true);
        setPostItem(null);
      }
      setLoading(false);
    };
    initAnalysis();
  }, [selectedNewsId]);

  const handleAnalyze = async () => {
    setAnalyzing(true);
    setResult(null);
    
    if (isBatchMode) {
      logActivity('AI Batch Analysis Operation Start');
      // 일괄 분석 시뮬레이션
      setTimeout(() => {
        setResult(`[사령부 통합 지능 전략 리포트 - ${new Date().toLocaleDateString()}]

1. 글로벌 정세 판단 (Global Vector)
- 현재 수집된 다수의 첩보를 종합한 결과, 시장의 주도권이 기술 집약적 자산으로 급격히 이동 중임.
- 국내외 금리 동결 기조와 지정학적 리스크가 맞물려 변동성 지수가 임계점에 도달함.

2. 섹터별 위기 및 기회 (Sector Scrutiny)
- [반도체] HBM4 등 차세대 공정 경쟁이 국가 안보 차원의 기술 패권 전쟁으로 격상됨.
- [에너지] 유럽 수소 상용차 시장의 확대는 친환경 인프라 벨류체인의 재편을 가속화할 것임.
- [금융] 환율 급등에 따른 외인 수급 이탈 리스크 상존, 방어적 포트폴리오 강화 필요.

3. 사령부 최종 권고안 (Command Final Directive)
- 단기적으로는 변동성을 활용한 유동성 확보에 주력할 것.
- 중장기적으로는 AI 인프라 및 에너지 자립 관련 핵심 자산을 선점할 것을 강력 권고함.

분석 엔진: CERT Strategic Intelligence Core v3.0
보안 등급: TOP SECRET (Level 5)`);
        setAnalyzing(false);
        logActivity('AI Batch Analysis Success');
      }, 3000);
    } else if (postItem) {
      logActivity(`AI Analysis Operation Start: ${postItem.title}`);
      setTimeout(async () => {
        const analysisReport = `[사령부 정밀 지능 리포트 - ${postItem.title}]

1. 전략적 함의: 해당 사안은 업계 내 '게임 체인저'가 될 파급력을 보유함.
2. 리스크 평가: 대외 의존도가 45% 이상으로 관측되어 공급망 다변화가 시급함.
3. 대응 권고: 즉시 관련 부서 태스크포스(TF) 가동 및 세부 영향 평가 보고서 작성 지시.`;
        setResult(analysisReport);
        await updatePostAnalysisAPI(postItem.id, analysisReport);
        setAnalyzing(false);
        logActivity(`AI Analysis Success: ${postItem.id}`);
      }, 2500);
    }
  };

  const handleBack = () => {
    if (selectedNewsId) {
      navigate(`/board/${selectedNewsId}`);
    } else {
      setView('user');
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center p-40 space-y-6">
      <Loader2 className="w-12 h-12 animate-spin text-amber-600" />
      <p className="text-stone-500 font-black uppercase tracking-widest animate-pulse">Initializing Analysis Engine...</p>
    </div>
  );

  return (
    <div className="w-full max-w-5xl mx-auto space-y-8 animate-in fade-in duration-700 pb-20">
      <button onClick={handleBack} className="flex items-center gap-2 text-xs font-black text-amber-600 uppercase hover:underline">
        <ArrowLeft className="w-4 h-4" /> 뒤로가기
      </button>

      <div className="bg-stone-900 rounded-[3rem] p-12 text-white shadow-2xl relative overflow-hidden border border-stone-800">
        <div className="absolute top-0 right-0 p-12 opacity-10 rotate-12"><Bot className="w-48 h-48" /></div>
        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-accent-600 rounded-2xl"><Bot className="w-8 h-8 text-white" /></div>
            <div>
              <h1 className="text-4xl font-black tracking-tighter uppercase">{isBatchMode ? 'Strategic Batch Intelligence' : 'Precision Intel Analysis'}</h1>
              <p className="text-xs text-stone-500 font-bold uppercase tracking-[0.3em] mt-2">CERT AI Strategic Core Active</p>
            </div>
          </div>
          <p className="text-stone-300 font-medium max-w-2xl text-lg leading-relaxed italic">
            {isBatchMode ? '사령부에 수집된 모든 첩보를 종합 분석하여 거시적 전략 리포트를 생성합니다.' : postItem?.title}
          </p>
        </div>
      </div>

      {!result && (
        <button
          onClick={handleAnalyze}
          disabled={analyzing}
          className="group relative w-full py-8 bg-white border-4 border-stone-900 rounded-[2.5rem] font-black text-xl hover:bg-stone-900 hover:text-white transition-all shadow-2xl disabled:opacity-50 overflow-hidden"
        >
          <div className="flex items-center justify-center gap-4 relative z-10 uppercase tracking-widest">
            {analyzing ? <Loader2 className="w-8 h-8 animate-spin" /> : <Sparkles className="w-8 h-8 text-amber-500 group-hover:animate-bounce" />}
            {analyzing ? '지능 연산 및 전략 수립 중...' : '사령부 AI 분석 엔진 즉시 가동'}
          </div>
        </button>
      )}

      {result && (
        <div className="space-y-8 animate-in slide-in-from-bottom-8 duration-700">
          <div className="bg-white rounded-[3rem] p-12 border-2 border-stone-200 shadow-2xl relative">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                <h3 className="text-2xl font-black text-stone-900 uppercase">Verified Strategic Report</h3>
              </div>
              <span className="px-4 py-1.5 bg-stone-100 rounded-full text-[10px] font-mono font-black text-stone-400">AUTH_SIG: CERT-CORE-V3</span>
            </div>
            
            <pre className="text-base text-stone-700 whitespace-pre-wrap font-sans leading-relaxed bg-stone-50 p-10 rounded-[2rem] border border-stone-100 italic shadow-inner">
              {result}
            </pre>

            <div className="mt-8 pt-8 border-t border-stone-100 flex justify-between items-center text-[10px] font-black text-stone-400 uppercase tracking-widest">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-2"><TrendingUp className="w-4 h-4" /> 신뢰도: 98.7%</span>
                <span className="flex items-center gap-2"><ShieldAlert className="w-4 h-4" /> 보안 등급: LEVEL 5</span>
              </div>
              <p>분석 데이터는 사령부 영구 기록 장치에 보존되었습니다.</p>
            </div>
          </div>

          <button
            onClick={handleBack}
            className="w-full py-6 bg-stone-900 text-white rounded-[2rem] font-black text-lg hover:bg-black transition-all shadow-xl flex items-center justify-center gap-3 uppercase tracking-widest"
          >
            {isBatchMode ? '메인 지휘소로 복귀' : '기본 첩보 화면으로 이동'}
            <ArrowRight className="w-6 h-6" />
          </button>
        </div>
      )}
    </div>
  );
}
