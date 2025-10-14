/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './views/*.html',
    './public/*/*.js',
    './public/components/*.html', // Tambahkan path ini untuk memindai komponen
  ],
  darkMode: 'class', // <-- TAMBAHKAN BARIS INI

  theme: {
    extend: {
      colors: {
        'dark-navy': '#2c3e50',
        'dark-blue': '#34495e',
        'gradient-start': '#2c3e50',
        'gradient-end': '#3498db',
        customBlue: 'rgb(52, 152, 219)',
        chocolate: {
          50: '#FBF8F1',
          100: '#F2E8D7',
          200: '#E6D3B4',
          300: '#D9BE91',
          400: '#CDB96F',
          500: '#B08851',
          600: '#8E673E',
          700: '#6C462C',
          800: '#4A251A',
          900: '#280F08',
        },
      },
      boxShadow: {
        'custom': '3px 0 15px rgba(0,0,0,0.1)',
        'no-shadow': 'none',
      },
      transitionProperty: {
        'transform': 'transform',
      },
      // Menambahkan kelas untuk geseran
      keyframes: {
        'slide-out': {
          'from': { transform: 'translateX(0)' },
          'to': { transform: 'translateX(-280px)' },
        },
        fadeIn: {
          'from': { opacity: 0, transform: 'translateY(10px)' },
          'to': { opacity: 1, transform: 'translateY(0)' },
        },
      },
      animation: {
        'slide-out': 'slide-out 0.3s ease-in-out',
      },
      width: {
        'calc-auto': 'calc(100% - 280px)', // Mendefinisikan kelas lebar kustom
      },
    },
  },
  plugins: [],
}
