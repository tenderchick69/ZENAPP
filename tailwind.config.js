/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  theme: {
    extend: {
      fontFamily: { display: ['"Playfair Display"', 'serif'], sans: ['Inter', 'sans-serif'] },
      colors: { bg: '#0f0f0f', fg: '#e8e4d8', accent: '#bfa76a', good: '#5a9a6f', bad: '#9c5d54' }
    },
  },
  plugins: [],
}
