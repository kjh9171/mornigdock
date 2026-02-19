import { useAuth } from '../contexts/AuthContext';

export const useActivityLog = () => {
  const { user } = useAuth();
  const API_BASE = import.meta.env.VITE_API_URL || '';

  const logActivity = async (action: string) => {
    if (!user) return;
    try {
      await fetch(`${API_BASE}/api/log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email, action })
      });
    } catch (e) {
      console.error('Failed to send activity log');
    }
  };

  return { logActivity };
};
