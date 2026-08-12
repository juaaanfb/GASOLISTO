import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./hooks/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
      },
      boxShadow: {
        // Usadas en varios sitios (NavBar, WelcomeModal) pero nunca definidas
        // aquí — las sombras no se aplicaban en absoluto.
        card: "0 2px 8px rgba(15, 23, 42, 0.08)",
        "card-hover": "0 12px 28px rgba(15, 23, 42, 0.16)",
      },
    },
  },
  plugins: [],
};

export default config;
