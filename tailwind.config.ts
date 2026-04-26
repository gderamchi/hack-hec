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
        paper: "#f7f8f3",
        surface: "#ffffff",
        surfaceMuted: "#edf3f0",
        slateLine: "#d7dfdc",
        mutedInk: "#243b35",
        primary: "#16313a",
        primarySoft: "#e7f3ef",
        regGreen: "#0b7a59",
        regBlue: "#256f88",
        regAmber: "#b76a00",
        regRed: "#c52828",
        background: "#f8faf7",
        foreground: "#101828",
        card: "#ffffff",
        border: "#dfe7e3",
        input: "#dfe7e3",
        navy: {
          DEFAULT: "#0a1f44",
          foreground: "#f8fafc"
        },
        brand: {
          DEFAULT: "#2f5bff",
          foreground: "#ffffff",
          soft: "#e9eeff"
        },
        success: {
          DEFAULT: "#16856f",
          foreground: "#0b463d",
          soft: "#e9f7f2"
        },
        warn: {
          DEFAULT: "#d69a1e",
          foreground: "#5a3a00",
          soft: "#fff6df"
        },
        danger: {
          DEFAULT: "#c92d2d",
          foreground: "#ffffff",
          soft: "#ffecec"
        },
        muted: {
          DEFAULT: "#eef3f1",
          foreground: "#5c6a66"
        }
      },
      boxShadow: {
        soft: "0 18px 55px rgba(22, 49, 58, 0.08)",
        panel: "0 18px 50px rgba(22, 49, 58, 0.08)"
      },
      animation: {
        marquee: "marquee 42s linear infinite"
      },
      keyframes: {
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" }
        }
      }
    }
  },
  plugins: []
};

export default config;
