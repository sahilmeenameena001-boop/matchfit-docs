import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        base: "#070b08",
        pane: "#101a12",
        line: "rgba(236,232,217,0.08)",
        cream: "#ece8d9",
        moss: "#8a9484",
        dim: "#5c675c",
        blue: "#3d8bfd",
        ok: "#58b98b",
        warn: "#d9a441",
        bad: "#d96c4f",
      },
      fontFamily: {
        cond: [
          '"Arial Narrow"',
          '"Helvetica Neue Condensed"',
          '"Roboto Condensed"',
          "Arial",
          "sans-serif",
        ],
      },
      borderRadius: {
        card: "18px",
      },
    },
  },
  plugins: [],
};
export default config;
