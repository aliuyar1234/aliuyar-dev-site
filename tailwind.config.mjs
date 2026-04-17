import typography from "@tailwindcss/typography";

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{astro,html,js,jsx,md,mdx,ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        mono: [
          "JetBrains Mono",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Monaco",
          "Consolas",
          "monospace"
        ],
        sans: [
          "JetBrains Mono",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Monaco",
          "Consolas",
          "monospace"
        ]
      },
      colors: {
        carbon: {
          50: "#edece9",
          100: "#c9c7c1",
          200: "#8e8a82",
          400: "#48463f",
          700: "#1b1a17",
          800: "#111110",
          900: "#0a0a09",
          950: "#050504"
        },
        cream: {
          50: "#faf8f3",
          100: "#f0eee8",
          200: "#e0ddd5",
          400: "#9c9a93"
        },
        amber: {
          DEFAULT: "#d4a017",
          soft: "#e6b93f",
          dim: "#8a6910"
        }
      },
      letterSpacing: {
        tight: "-0.01em",
        micro: "0.08em",
        wide: "0.12em",
        mega: "0.2em"
      }
    }
  },
  plugins: [typography]
};
