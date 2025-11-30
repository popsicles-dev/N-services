/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: '#2563EB',
        'background-light': '#F3F4F6',
        'background-dark': '#121f20',
        surface: '#FFFFFF',
        accent: '#c4b5fd',
      },
      fontFamily: {
        display: ['Inter', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '0.25rem',
        lg: '0.5rem',
        xl: '0.75rem',
        full: '9999px',
      },
      keyframes: {
        wave: {
          '0%, 100%': { transform: 'rotate(0deg)' },
          '50%': { transform: 'rotate(20deg)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        glow: {
          '0%, 100%': { boxShadow: '0 0 10px #49d6e9, 0 0 20px #49d6e9' },
          '50%': { boxShadow: '0 0 20px #49d6e9, 0 0 30px #49d6e9' },
        },
        blink: {
          '0%, 50%, 100%': { opacity: 1 },
          '52%, 98%': { opacity: 0 },
        },
      },
      animation: {
        wave: 'wave 2s ease-in-out infinite',
        float: 'float 3s ease-in-out infinite',
        glow: 'glow 2.5s ease-in-out infinite',
        blink: 'blink 5s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
