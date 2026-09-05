import React, { createContext, useContext, useState } from "react";

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [dark, setDark] = useState(false);
  const toggle = () => setDark((d) => !d);
  return (
    <ThemeContext.Provider value={{ dark, toggle }}>
      <div
        className={`min-h-screen w-full transition-colors duration-500 ${
          dark ? "bg-black text-white" : "bg-[#F5EFE6] text-black"
        }`}
      >
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
