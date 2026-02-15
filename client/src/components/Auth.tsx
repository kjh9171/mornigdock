import React, { useState } from 'react';
import { Button, Card } from '../App'; // App.tsx에서 Button과 Card 컴포넌트를 임포트한다고 가정 (나중에 수정될 수 있음)
import { LogIn, UserPlus } from 'lucide-react';

interface LoginFormProps {
  onLoginSuccess: (token: string, user: any) => void;
  onNavigateToRegister: () => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ onLoginSuccess, onNavigateToRegister }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    // TODO: 백엔드 API 호출 로직 구현
    // try {
    //   const response = await fetch('/api/auth/login', {
    //     method: 'POST',
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify({ email, password }),
    //   });
    //   const data = await response.json();
    //   if (response.ok) {
    //     onLoginSuccess(data.token, data.user);
    //   } else {
    //     setError(data.message || '로그인 실패');
    //   }
    // } catch (err: any) {
    //   setError(err.message || '네트워크 오류');
    // } finally {
    //   setIsLoading(false);
    // }
    console.log('Login attempt with:', { email, password });
    setIsLoading(false); // 임시
  };

  return (
    <Card className="w-full max-w-sm p-10 text-center shadow-2xl bg-[var(--card-background)] dark:bg-[var(--dark-card-background)]">
      <h1 className="text-3xl font-bold font-lora text-[var(--foreground)] dark:text-[var(--dark-foreground)] mb-6">로그인</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <input
            type="email"
            placeholder="이메일"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-3 bg-[var(--input)] dark:bg-[var(--dark-input)] rounded-lg border border-[var(--border)] dark:border-[var(--dark-border)]"
            required
          />
        </div>
        <div>
          <input
            type="password"
            placeholder="비밀번호"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-3 bg-[var(--input)] dark:bg-[var(--dark-input)] rounded-lg border border-[var(--border)] dark:border-[var(--dark-border)]"
            required
          />
        </div>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <Button type="submit" className="w-full" icon={LogIn} disabled={isLoading}>
          {isLoading ? '로그인 중...' : '로그인'}
        </Button>
      </form>
      <Button variant="ghost" className="w-full mt-4" onClick={onNavigateToRegister}>
        회원가입
      </Button>
    </Card>
  );
};

interface RegisterFormProps {
  onRegisterSuccess: (token: string, user: any) => void;
  onNavigateToLogin: () => void;
}

const RegisterForm: React.FC<RegisterFormProps> = ({ onRegisterSuccess, onNavigateToLogin }) => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }
    setIsLoading(true);
    // TODO: 백엔드 API 호출 로직 구현
    // try {
    //   const response = await fetch('/api/auth/register', {
    //     method: 'POST',
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify({ username, email, password }),
    //   });
    //   const data = await response.json();
    //   if (response.ok) {
    //     onRegisterSuccess(data.token, data.user);
    //   } else {
    //     setError(data.message || '회원가입 실패');
    //   }
    // } catch (err: any) {
    //   setError(err.message || '네트워크 오류');
    // } finally {
    //   setIsLoading(false);
    // }
    console.log('Register attempt with:', { username, email, password });
    setIsLoading(false); // 임시
  };

  return (
    <Card className="w-full max-w-sm p-10 text-center shadow-2xl bg-[var(--card-background)] dark:bg-[var(--dark-card-background)]">
      <h1 className="text-3xl font-bold font-lora text-[var(--foreground)] dark:text-[var(--dark-foreground)] mb-6">회원가입</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <input
            type="text"
            placeholder="사용자 이름"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full p-3 bg-[var(--input)] dark:bg-[var(--dark-input)] rounded-lg border border-[var(--border)] dark:border-[var(--dark-border)]"
            required
          />
        </div>
        <div>
          <input
            type="email"
            placeholder="이메일"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-3 bg-[var(--input)] dark:bg-[var(--dark-input)] rounded-lg border border-[var(--border)] dark:border-[var(--dark-border)]"
            required
          />
        </div>
        <div>
          <input
            type="password"
            placeholder="비밀번호"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-3 bg-[var(--input)] dark:bg-[var(--dark-input)] rounded-lg border border-[var(--border)] dark:border-[var(--dark-border)]"
            required
          />
        </div>
        <div>
          <input
            type="password"
            placeholder="비밀번호 확인"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full p-3 bg-[var(--input)] dark:bg-[var(--dark-input)] rounded-lg border border-[var(--border)] dark:border-[var(--dark-border)]"
            required
          />
        </div>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <Button type="submit" className="w-full" icon={UserPlus} disabled={isLoading}>
          {isLoading ? '회원가입 중...' : '회원가입'}
        </Button>
      </form>
      <Button variant="ghost" className="w-full mt-4" onClick={onNavigateToLogin}>
        로그인으로 돌아가기
      </Button>
    </Card>
  );
};

export { LoginForm, RegisterForm };