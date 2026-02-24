/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        pepe: { DEFAULT: "#4CAF50", dark: "#1a472a", light: "#81C784" },
        shib: { DEFAULT: "#FF9800", dark: "#4a2800", light: "#FFB74D" },
        bastion: "#8B5CF6",
        game: {
          bg: "#0f172a",
          card: "#1e293b",
          border: "#334155",
        },
      },
    },
  },
  plugins: [],
};
