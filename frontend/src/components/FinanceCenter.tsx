import { useState } from 'react';
import { Globe, TrendingUp, MessageSquare, BarChart3, Coins, Info, ExternalLink, ShieldCheck } from 'lucide-react';

const FINANCE_SECTIONS = [
  { id: 'domestic', name: '국내증시', icon: TrendingUp, url: 'https://m.stock.naver.com/domestic', color: 'text-red-600', bg: 'bg-red-50' },
  { id: 'overseas', name: '해외증시', icon: Globe, url: 'https://m.stock.naver.com/world', color: 'text-blue-600', bg: 'bg-blue-50' },
  { id: 'discussion', name: '종목토론', icon: MessageSquare, url: 'https://m.stock.naver.com/investment/discussion/global', color: 'text-amber-600', bg: 'bg-amber-50' },
  { id: 'indices', name: '시장지표', icon: BarChart3, url: 'https://m.stock.naver.com/marketindex', color: 'text-emerald-600', bg: 'bg-emerald-50' },
  { id: 'crypto', name: '가상자산', icon: Coins, url: 'https://m.stock.naver.com/crypto', color: 'text-purple-600', bg: 'bg-purple-50' },
  { id: 'info', name: '투자정보', icon: Info, url: 'https://m.stock.naver.com/investment/news/main', color: 'text-stone-600', bg: 'bg-stone-50' },
];

export function FinanceCenter() {
  return (
    <div className="w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* 1. 사령부 증시 지휘소 헤더 */}
      <div className="bg-stone-900 rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden border border-stone-800">
        <div className="absolute top-0 right-0 p-10 opacity-10 rotate-12">
          <ShieldCheck className="w-40 h-40" />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-accent-600 rounded-xl">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-3xl font-black tracking-tighter uppercase">Market Command Center</h1>
          </div>
          <p className="text-stone-400 font-medium max-w-lg leading-relaxed">
            네이버 증권의 실시간 전황 데이터를 통합 관리합니다. <br />
            국내외 시장 지표부터 가상자산까지, 모든 투자 첩보를 사령부에서 즉시 확인하십시오.
          </p>
        </div>
      </div>

      {/* 2. 전술 섹션 그리드 */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {FINANCE_SECTIONS.map((section) => (
          <a
            key={section.id}
            href={section.url}
            target="_blank"
            rel="noreferrer"
            className="group bg-white p-6 rounded-3xl border border-stone-200 shadow-soft hover:shadow-xl hover:border-accent-400 transition-all duration-300 relative overflow-hidden"
          >
            <div className="flex flex-col items-center text-center space-y-4">
              <div className={`p-4 rounded-2xl ${section.bg} ${section.color} group-hover:scale-110 transition-transform`}>
                <section.icon className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-lg font-black text-primary-900">{section.name}</h3>
                <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest mt-1">Operational Area</p>
              </div>
            </div>
            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
              <ExternalLink className="w-4 h-4 text-accent-600" />
            </div>
          </a>
        ))}
      </div>

      {/* 3. 실전 데이터 모니터링 섹션 */}
      <div className="bg-white rounded-3xl border border-stone-200 p-8 shadow-inner text-center">
        <p className="text-stone-400 font-bold text-sm mb-2">
          섹션 카드를 클릭하면 네이버 증권의 실시간 정찰 화면으로 즉시 출격합니다.
        </p>
        <div className="flex justify-center gap-4 text-[10px] font-black text-stone-300 uppercase">
          <span>Security: High</span>
          <span>Latency: Real-time</span>
          <span>Vector: Multi-source</span>
        </div>
      </div>
    </div>
  );
}
