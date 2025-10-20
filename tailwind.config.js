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
      padding: {
        '15': '3.75rem',
        '17': '4.25rem',
        '18': '4.5rem',
        '19': '4.75rem',
        '21': '5.25rem',
        '22': '5.5rem',
        '23': '5.75rem',
        '25': '6.25rem',
        '26': '6.5rem',
        '27': '6.75rem',
        '29': '7.25rem',
        '30': '7.5rem',
        '31': '7.75rem',
      },
      fontFamily: {
        poppins: ['"Poppins"', 'sans-serif'],
        inter: ['"Inter"', 'sans-serif'],
      },
      colors: {
        'dark-navy': '#2c3e50',
        'dark-blue': '#34495e',
        'gradient-start': '#2c3e50',
        'gradient-end': '#3498db',
        greenSoft: '#20ca9a',
        customBlue: 'rgb(52, 152, 219)',
        mainNavy: '#003861',
        purpleCustom: '#4F55FB',
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
        '15': '3.75rem',
        '29': '7.25rem',
        '30': '7.5rem',
        '31': '7.75rem',
        '32': '8rem',
        '33': '8.25rem',
        '35': '8.75rem',
        '36': '9rem',
        '37': '9.25rem',
        // Gabungkan dengan definisi yang lain
        'calc-auto': 'calc(100% - 280px)',
      },
      margin: {
        '41': '10.625rem',
        '42': '11rem',
        '43': '11.25rem',
        '45': '11.75rem',
      },
    },
  },
  plugins: [],
}
