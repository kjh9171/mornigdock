/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Inter"', '"Pretendard"', 'sans-serif'],
      },
      colors: {
        background: '#F9F9F9', // Off-White
        primary: {
          800: '#292524', // Stone-800
        },
        accent: {
          600: '#D97706', // Amber-600
        }
      },
      boxShadow: {
        'soft': '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
      },
      borderWidth: {
        'thin': '0.5px',
      }
    },
  },
  plugins: [],
}
