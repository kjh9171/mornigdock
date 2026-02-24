// frontend/src/utils/activityLogger.ts

import { api } from '../lib/api';
import { useAuthStore } from '../store/useAuthStore';

// 활동 로그를 백엔드로 전송하는 함수
export const logActivity = async (action: string, details: string = '') => {
  const { user } = useAuthStore.getState(); // Zustand 스토어에서 사용자 정보 가져오기

  if (!user) {
    console.warn('사용자 정보가 없어 활동 로그를 기록할 수 없습니다.');
    return;
  }

  try {
    // 백엔드의 /api/log 엔드포인트로 활동 로그 전송 (백엔드에 해당 라우터 필요)
    await api.post('/log', {
      userId: user.id,
      email: user.email,
      action,
      details,
    });
  } catch (error) {
    console.error('활동 로그 전송 실패:', error);
  }
};

// 컴포넌트에서 쉽게 사용할 수 있도록 훅 형태로 제공
export const useActivityLog = () => {
  return { logActivity };
};
