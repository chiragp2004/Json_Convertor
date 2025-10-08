import React, { useEffect, useState } from "react";

export default function ThemeToggle() {
  // Check localStorage for saved theme preference, default to light mode
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved === 'true';
  });

  // Apply theme on mount and when darkMode changes
  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add("dark-theme");
      localStorage.setItem('darkMode', 'true');
    } else {
      root.classList.remove("dark-theme");
      localStorage.setItem('darkMode', 'false');
    }
  }, [darkMode]);

  const toggleTheme = () => {
    setDarkMode(!darkMode);
  };

  return (
    <button
      onClick={toggleTheme}
      className="theme-btn"
      title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
      aria-label="Toggle theme"
    >
      <span style={{ fontSize: "1.3rem", display: "flex", alignItems: "center" }}>
        {darkMode ? "🌙" : "☀️"}
      </span>
      <span style={{ fontSize: "0.95rem", fontWeight: "600" }}>
        {darkMode ? "Dark Mode" : "Light Mode"}
      </span>
    </button>
  );
}