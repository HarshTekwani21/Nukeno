/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'nukeno-navy':    '#0b0d1a',
        'nukeno-surface': '#13162b',
        'nukeno-border':  '#1e2447',
        'nukeno-violet':  '#c84bff',
        'nukeno-purple':  '#6e4ef2',
        'nukeno-cyan':    '#00d4ff',
        'nukeno-magenta': '#d94bff',
      }
    },
  },
  plugins: [],
}
