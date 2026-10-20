import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        asfalto: { DEFAULT: "#1B1F23", 700: "#2A3036", 500: "#4A525A", 300: "#8A929A" },
        concreto: { DEFAULT: "#E9ECEE", 200: "#D8DDE1", 100: "#F4F6F7" },
        chapa: { DEFAULT: "#1F4FA3", 700: "#173C7D", 100: "#E3EBF8" },
        sinal: { DEFAULT: "#E3A008", 100: "#FBF1D6", 700: "#8A5F00" },
        ok: { DEFAULT: "#1E7B4F", 100: "#DDF1E6" },
        erro: { DEFAULT: "#B42318", 100: "#FBE4E1" },
      },
      fontFamily: {
        body: ["var(--font-body)", "system-ui", "sans-serif"],
        placa: ["var(--font-placa)", "Arial Narrow", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
