export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy: { 950: '#091632', 900: '#0b1d4a', 800: '#12296a' },
        brand: { 800: '#104281', 700: '#174f95', 600: '#1c5cab', 500: '#2a78d6' },
        accent: '#eb6834',
      },
      fontFamily: { sans: ['Sarabun', 'sans-serif'] },
      boxShadow: { card: '0 18px 45px rgba(20, 43, 79, .06)' },
    },
  },
  plugins: [],
};
