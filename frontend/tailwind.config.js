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
        'agora-bg': '#ffffff',
        'agora-border': '#e2e8f0',
        'agora-text': '#1e293b',
        'agora-muted': '#64748b',
        'agora-accent': '#1d4ed8', // Clien-like blue
        'agora-gold': '#fbbf24',
        primary: {
          50: '#eff6ff', 100: '#dbeafe', 200: '#bfdbfe', 300: '#93c5fd', 400: '#60a5fa',
          500: '#1d4ed8', 600: '#1e40af', 700: '#1d4ed8', 800: '#1e40af', 900: '#1e3a8a',
        },
      },
      boxShadow: {
        'soft': '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        'premium': '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
      },
      borderWidth: {
        'thin': '0.5px',
      }
    },
  },
  plugins: [],
}
