/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        accent: '#e85d24',
      },
      borderRadius: {
        card: '12px',
      },
    },
  },
  plugins: [],
}

