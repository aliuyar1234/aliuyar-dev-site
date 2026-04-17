import typography from "@tailwindcss/typography";

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{astro,html,js,jsx,md,mdx,ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        display: ["Fraunces", "ui-serif", "Georgia", "Cambria", "Times New Roman", "serif"],
        sans: [
          "IBM Plex Sans",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Helvetica Neue",
          "Arial",
          "sans-serif"
        ],
        mono: [
          "IBM Plex Mono",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Monaco",
          "Consolas",
          "monospace"
        ]
      },
      colors: {
        paper: {
          50: "#faf6ee",
          100: "#f4efe4",
          200: "#e9e1d0",
          300: "#d6cab2",
          800: "#161512",
          900: "#0f0e0c",
          950: "#0a0a08"
        },
        ink: {
          50: "#f4efe4",
          100: "#d9d3c5",
          300: "#8f887a",
          500: "#4a463c",
          700: "#231f17",
          900: "#0c0b09"
        },
        accent: {
          DEFAULT: "#b0421a",
          soft: "#c96a42",
          ink: "#7a2d12"
        }
      },
      letterSpacing: {
        tightest: "-0.04em",
        tighter: "-0.02em",
        display: "-0.025em",
        micro: "0.14em"
      },
      boxShadow: {
        soft: "0 30px 80px -40px rgba(20, 18, 14, 0.18)",
        softDark: "0 30px 80px -40px rgba(0, 0, 0, 0.7)"
      }
    }
  },
  plugins: [typography]
};
