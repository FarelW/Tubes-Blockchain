/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f4ff',
          100: '#e0e9ff',
          200: '#c7d7fe',
          300: '#a4bdfc',
          400: '#8199f8',
          500: '#667eea',
          600: '#764ba2',
          700: '#5a3d7a',
          800: '#3d2852',
          900: '#1f1429',
        },
      },
    },
  },
  plugins: [],
}

