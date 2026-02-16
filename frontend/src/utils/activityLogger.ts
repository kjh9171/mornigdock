import { useAuthStore } from '../store/useAuthStore';

export const useActivityLog = () => {
  const user = useAuthStore((state) => state.user);

  const logActivity = async (activity: string) => {
    if (!user) return;

    try {
      await fetch('http://localhost:8787/api/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email, activity }),
      });
    } catch (err) {
      console.error('Failed to log activity', err);
    }
  };

  return { logActivity };
};
