/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'sans-serif'],
      },
      colors: {
        background: "#0a0a0a",
        foreground: "#ededed",
        card: "#121212",
        "card-foreground": "#ffffff",
        primary: '#ff007f',
        navy: '#121e44',
        midnight: '#0a0b10',
        surface: 'rgba(30, 32, 45, 0.6)',
      },
      backgroundImage: {
        'glass-gradient': 'linear-gradient(135deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.01))',
      },
    },
  },
  plugins: [],
}
