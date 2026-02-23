import typography from "@tailwindcss/typography";

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{astro,html,js,jsx,md,mdx,ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "SF Pro Display",
          "SF Pro Text",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif"
        ]
      },
      colors: {
        surface: {
          50: "#f5f5f7",
          100: "#ececf0",
          200: "#dbdbe1",
          900: "#101114",
          950: "#07080a"
        },
        accent: {
          500: "#0071e3",
          600: "#0062c7"
        }
      },
      boxShadow: {
        soft: "0 10px 40px rgba(16, 17, 20, 0.06)",
        softDark: "0 10px 36px rgba(0, 0, 0, 0.38)"
      }
    }
  },
  plugins: [typography]
};
