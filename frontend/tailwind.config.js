/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'nukeno-dark': '#0a0a0f',
        'nukeno-gray': '#1a1a2e',
        'nukeno-accent': '#6366f1',
        'nukeno-accent-light': '#818cf8',
      }
    },
  },
  plugins: [],
}
