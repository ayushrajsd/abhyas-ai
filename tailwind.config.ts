import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        cream: "#f7f4ef",
        "cream-dark": "#ede9e1",
        forest: "#3d6b4f",
        "forest-dark": "#2e5340",
        "forest-light": "#e8f0eb",
        charcoal: "#1c1c1c",
        muted: "#6b6b6b",
        border: "#ddd8cf",
      },
      fontFamily: {
        serif: ["Georgia", "Cambria", "Times New Roman", "serif"],
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
