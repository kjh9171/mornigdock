import axios from 'axios';
import { getSystemSetting } from '../utils/settings.ts';

/**
 * Gemini API 연동 서비스
 * 뉴스 본문을 분석하여 요약 및 결론을 도출합니다.
 */
const GEMINI_MODEL = 'gemini-1.5-flash'; 

interface GeminiAnalysisResult {
  summary: string;
  impact: string;
  advice: string;
}

/**
 * 뉴스 제목과 본문을 바탕으로 AI 분석을 수행합니다.
 */
export async function analyzeNewsWithGemini(title: string, content: string): Promise<GeminiAnalysisResult> {
  // 시스템 설정에서 최신 API 키 확보 (DB 우선)
  const apiKey = await getSystemSetting('gemini_api_key');

  if (!apiKey) {
    console.warn('[GeminiService] API 키가 설정되지 않아 기본 분석 결과를 반환합니다.');
    return {
      summary: 'API 키가 설정되지 않아 AI 분석을 수행할 수 없습니다.',
      impact: '관리자 설정에서 Gemini API 키를 등록해 주세요.',
      advice: '환경 변수 혹은 시스템 설정을 확인하시기 바랍니다.'
    };
  }

  try {
    const prompt = `
      당신은 전문 뉴스 분석가이자 경제 전문가입니다. 
      다음 뉴스의 제목과 본문을 바탕으로 아래 3가지 항목에 대해 분석해 주세요. 
      답변은 정중하고 신뢰감 있는 한국어로 작성해 주세요.

      뉴스 제목: ${title}
      뉴스 본문: ${content}

      항목:
      1. 핵심 요약 (3줄 이내)
      2. 사회/경제적 파급력 분석 (1~2문장)
      3. 독자를 위한 전문가의 조언 (1~2문장)

      형식:
      JSON 형태로 응답해 주세요.
      {
        "summary": "핵심 요약 내용",
        "impact": "파급력 분석 내용",
        "advice": "전문가의 조언 내용"
      }
    `;

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
      {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json'
        }
      },
      { timeout: 30000 }
    );

    const resultText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!resultText) throw new Error('Gemini 응답 데이터가 비어 있습니다.');

    const result = JSON.parse(resultText);
    return {
      summary: result.summary || '요약 정보를 생성할 수 없습니다.',
      impact: result.impact || '파급력 분석 정보를 생성할 수 없습니다.',
      advice: result.advice || '조언 정보를 생성할 수 없습니다.'
    };
  } catch (err: any) {
    console.error('[GeminiService] 분석 오류:', err.response?.data || err.message);
    return {
      summary: 'AI 분석 중 오류가 발생했습니다.',
      impact: '일시적인 네트워크 장애나 API 제한일 수 있습니다.',
      advice: '잠시 후 다시 시도해 주세요.'
    };
  }
}
