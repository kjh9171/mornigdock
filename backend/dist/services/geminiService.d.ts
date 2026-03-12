interface GeminiAnalysisResult {
    summary: string;
    impact: string;
    advice: string;
}
/**
 * 뉴스 제목과 본문을 바탕으로 AI 분석을 수행합니다.
 */
export declare function analyzeNewsWithGemini(title: string, content: string): Promise<GeminiAnalysisResult>;
export {};
//# sourceMappingURL=geminiService.d.ts.map