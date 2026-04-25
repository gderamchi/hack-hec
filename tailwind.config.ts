import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#101828",
        paper: "#fbf7ff",
        surface: "#ffffff",
        surfaceMuted: "#f2ecf7",
        slateLine: "#ded4e8",
        muted: "#766487",
        mutedInk: "#31243e",
        primary: "#2b004b",
        primarySoft: "#efe3ff",
        regGreen: "#0b7a59",
        regBlue: "#6d31d9",
        regAmber: "#b76a00",
        regRed: "#c52828"
      },
      boxShadow: {
        soft: "0 18px 55px rgba(43, 0, 75, 0.08)",
        panel: "0 18px 50px rgba(43, 0, 75, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
