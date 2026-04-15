export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        scanner: {
          fire: '#ff4444',
          police: '#4444ff',
          ems: '#44ff44',
          dark: '#1a1a2e',
          light: '#16213e'
        }
      }
    }
  },
  plugins: []
};