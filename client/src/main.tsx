import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import {
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query'; // QueryClient 및 QueryClientProvider 임포트

const queryClient = new QueryClient(); // 새로운 QueryClient 인스턴스 생성

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>,
);
