/** @type {import('tailwindcss').Config} */
import typography from "@tailwindcss/typography";

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef9ff",
          100: "#d9f0ff",
          200: "#b6e0ff",
          300: "#82c8ff",
          400: "#4eadff",
          500: "#1f90ff",
          600: "#0d72db",
          700: "#0a5bb3",
          800: "#0d4c8e",
          900: "#0f406f",
        },
      },
      boxShadow: {
        soft: "0 20px 45px -20px rgba(15,64,111,0.25)",
      },
    },
  },
  plugins: [typography],
};
