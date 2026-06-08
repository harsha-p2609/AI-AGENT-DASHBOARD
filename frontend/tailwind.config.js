/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        darkbg: '#0B0F19',
        darkcard: '#161D30',
        darkaccent: '#232D4B',
      }
    },
  },
  plugins: [],
}

