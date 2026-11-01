import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#e8fbf0",
          100: "#c7f6db",
          200: "#92edbd",
          300: "#54df9b",
          400: "#25d366", // WhatsApp Green
          500: "#128c7e", // WhatsApp Teal
          600: "#075e54", // WhatsApp Dark Green
          700: "#0b4e45",
          800: "#0c3f38",
          900: "#0d3530",
        },
      },
    },
  },
  plugins: [],
};
export default config;
