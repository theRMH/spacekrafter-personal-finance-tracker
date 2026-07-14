import type { Config } from "tailwindcss";

// Approved palette — IA v1.1 §10 / PRD v1.1 §12.1.
// Green must never be the dominant colour; teal is reserved for success/positive states only.
const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        navy: "#181E32", // Dominant Navy — primary buttons, key headings, primary nav
        sidebar: "#171D31", // Deep Navy — sidebar / high-contrast backgrounds
        beige: "#CDC1B4", // Warm Beige — neutral accents, secondary structure
        earth: "#6C6456", // Earth Neutral — insurance / muted category accents
        muted: "#767678", // Neutral Grey — secondary text, inactive states
        success: "#56A688", // Teal — success, positive status, selected finance accents
        info: "#3A71AA", // Blue — information, links, active toggles, chart accents
      },
      borderRadius: {
        card: "16px",
      },
    },
  },
  plugins: [],
};

export default config;
