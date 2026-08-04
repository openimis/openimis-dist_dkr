/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      colors: {
        // Semantic status colors kept in the theme so every component
        // references the same source of truth instead of hardcoded hex values.
        status: {
          good: "#10b981",
          "good-bg": "#ecfdf5",
          warn: "#f59e0b",
          "warn-bg": "#fffbeb",
          bad: "#ef4444",
          "bad-bg": "#fef2f2",
        },
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.2s ease-out",
      },
    },
  },
  plugins: [],
};
