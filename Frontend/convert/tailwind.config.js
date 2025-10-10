/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          light: "#3b82f6",
          DEFAULT: "#2563eb",
          dark: "#1d4ed8",
        },
        success: {
          light: "#10b981",
          DEFAULT: "#059669",
        },
        danger: {
          light: "#ef4444",
          DEFAULT: "#dc2626",
        },
        grayish: {
          light: "#f8fafc",
          DEFAULT: "#e2e8f0",
          dark: "#334155",
        },
      },
      boxShadow: {
        soft: "0 4px 6px rgba(0,0,0,0.1)",
        strong: "0 10px 15px rgba(0,0,0,0.15)",
      },
      borderRadius: {
        xl: "1rem",
        lg: "0.75rem",
      },
    },
  },
  plugins: [],
};
