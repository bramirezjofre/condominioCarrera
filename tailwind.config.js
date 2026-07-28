/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/views/**/*.ejs', './src/public/js/**/*.js'],
  theme: {
    extend: {
      colors: {
        navy: {
          950: '#052B49',
          900: '#07395E',
          800: '#0B4B78'
        },
        gold: {
          600: '#D59A2A',
          500: '#E4AC3C'
        },
        cyan: { 500: '#11B8BD' },
        blue: { 500: '#1687C9' },
        red: { 500: '#D94335' },
        green: { 500: '#2DAE72' },
        orange: { 500: '#ED8A24' },
        background: '#F7F8FA',
        surface: '#FFFFFF',
        border: '#DDE2E8',
        text: '#10243C',
        muted: '#64748B'
      }
    }
  },
  plugins: []
};