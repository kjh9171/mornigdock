/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Pretendard"', '"Inter"', 'sans-serif'],
      },
      colors: {
        'agora-bg': '#0a0a0b',
        'agora-border': 'rgba(255, 255, 255, 0.08)',
        'agora-text': '#ffffff',
        'agora-muted': 'rgba(255, 255, 255, 0.5)',
        'agora-accent': '#3b82f6', // primary-500
        'agora-gold': '#fbbf24',   // amber-400
        primary: {
          50: '#eff6ff', 100: '#dbeafe', 200: '#bfdbfe', 300: '#93c5fd', 400: '#60a5fa',
          500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8', 800: '#1e40af', 900: '#1e3a8a',
        },
        accent: {
          50: '#fffbeb', 100: '#fef3c7', 200: '#fde68a', 300: '#fcd34d', 400: '#fbbf24',
          500: '#f59e0b', 600: '#d97706', 700: '#b45309', 800: '#92400e', 900: '#78350f',
        }
      },
      boxShadow: {
        'soft': '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
        'premium': '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
      },
      borderWidth: {
        'thin': '0.5px',
      }
    },
  },
  plugins: [],
}
