/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/views/**/*.ejs', './src/public/js/**/*.js'],
  theme: {
    extend: {
      colors: {
        navy: {
          950: '#061936',
          900: '#09264d',
          800: '#123b6d',
          700: '#1b4f86',
          600: '#2a64a0'
        },
        gold: {
          700: '#a66b08',
          600: '#c68a16',
          500: '#e2ad3f',
          400: '#efc067',
          300: '#f2d783',
          100: '#fbf2d5'
        },
        ivory: '#fbfaf7',
        surface: '#ffffff',
        border: '#e5e7eb',
        text: '#17253a',
        muted: '#667085',
        success: '#18794e',
        warning: '#9a6700',
        danger: '#b42318',
        info: '#175cd3'
      },
      fontFamily: {
        display: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        sans: ['"Source Sans 3"', 'system-ui', 'sans-serif']
      },
      boxShadow: {
        soft: '0 8px 24px -12px rgba(8, 28, 56, 0.18)',
        card: '0 2px 8px -4px rgba(8, 28, 56, 0.10), 0 1px 2px rgba(8, 28, 56, 0.06)',
        elevated: '0 18px 40px -18px rgba(8, 28, 56, 0.30)'
      },
      backgroundImage: {
        'gold-fade': 'linear-gradient(135deg, #dbc16b 0%, #c68a16 50%, #a66b08 100%)',
        'navy-fade': 'linear-gradient(135deg, #09264d 0%, #1b4f86 100%)',
        'hero-soft': 'radial-gradient(at top left, rgba(196,138,22,0.18), transparent 60%), radial-gradient(at bottom right, rgba(9,38,77,0.16), transparent 60%)'
      }
    }
  },
  plugins: []
};