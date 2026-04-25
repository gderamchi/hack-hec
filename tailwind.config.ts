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
        slateLine: "#d9e2ec",
        regGreen: "#087f5b",
        regBlue: "#2563eb",
        regAmber: "#d97706",
        regRed: "#dc2626"
      },
      boxShadow: {
        soft: "0 18px 55px rgba(16, 24, 40, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
