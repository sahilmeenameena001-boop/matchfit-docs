import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cream: {
          DEFAULT: "#EFE9DA",
          light: "#F5F1E6",
          dark: "#E4DCC7",
        },
        slate: {
          ink: "#4C6B80",
          soft: "#6E8DA0",
          faint: "#9AB0BE",
        },
        wood: {
          DEFAULT: "#6B4A30",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "serif"],
        body: ["var(--font-body)", "serif"],
      },
      letterSpacing: {
        widest2: "0.28em",
        widest3: "0.35em",
      },
      maxWidth: {
        container: "1180px",
      },
      transitionTimingFunction: {
        signature: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(24px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.9s cubic-bezier(0.22,1,0.36,1) forwards",
      },
    },
  },
  plugins: [],
};

export default config;
