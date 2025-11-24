/** @type {import('tailwindcss').Config} */
import typography from "@tailwindcss/typography";

export default {
  darkMode: "class", // Enable class-based dark mode
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'sans-serif'],
      },
      colors: {
        brand: {
          50: "#E8ECF7",
          100: "#D0D9F0",
          200: "#A5B6E0",
          300: "#7A94D0",
          400: "#4E72C0",
          500: "#224FAF",
          600: "#1B4091",
          700: "#153274",
          800: "#0F2456",
          900: "#0B1D3A",
        },
        aqua: {
          50: "#E8FBFF",
          100: "#CFF5FF",
          200: "#A3EAFF",
          300: "#76DEFF",
          400: "#4AD0FF",
          500: "#35C2FF",
          600: "#229EE0",
          700: "#1C7FB5",
          800: "#165F84",
          900: "#114256",
        },
        coral: {
          50: "#FFF0EC",
          100: "#FFDCD4",
          200: "#FFB6A9",
          300: "#FF907E",
          400: "#FF6F61",
          500: "#F04E43",
          600: "#D03D33",
          700: "#A72F27",
          800: "#7D211A",
          900: "#4F140F",
        },
        sand: {
          50: "#FBF7F2",
          100: "#F7EDE0",
          200: "#F1DDC2",
          300: "#E8C79A",
          400: "#DEAD71",
          500: "#D39553",
          600: "#B87841",
          700: "#925C32",
          800: "#6C4324",
          900: "#462A16",
        },
        cloud: {
          50: "#F8FAFC",
          100: "#EEF2F6",
          200: "#E0E7EC",
          300: "#CAD2DA",
          400: "#8E9AA8",
          500: "#5F6B78",
          600: "#47505B",
          700: "#333A44",
          800: "#1E232A",
          900: "#12161B",
        },
      },
      boxShadow: {
        soft: "0 28px 70px -50px rgba(15,23,42,0.45)",
      },
    },
  },
  plugins: [typography],
};
