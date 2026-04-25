"use client";

import { createContext, useContext, useEffect, useState } from "react";
import {
  COLOR_THEME_STORAGE_KEY,
  ColorThemeId,
  DEFAULT_COLOR_THEME,
} from "@/lib/color-themes";

interface ColorThemeContextValue {
  colorTheme: ColorThemeId;
  setColorTheme: (id: ColorThemeId) => void;
}

const ColorThemeContext = createContext<ColorThemeContextValue | null>(null);

export function ColorThemeProvider({ children }: { children: React.ReactNode }) {
  const [colorTheme, setColorThemeState] = useState<ColorThemeId>(DEFAULT_COLOR_THEME);

  useEffect(() => {
    // Read stored value set by the inline script (or fall back to default)
    const stored = document.documentElement.getAttribute("data-color") as ColorThemeId | null;
    if (stored) setColorThemeState(stored);
  }, []);

  function setColorTheme(id: ColorThemeId) {
    setColorThemeState(id);
    document.documentElement.setAttribute("data-color", id);
    try {
      localStorage.setItem(COLOR_THEME_STORAGE_KEY, id);
    } catch {
      // storage blocked
    }
  }

  return (
    <ColorThemeContext.Provider value={{ colorTheme, setColorTheme }}>
      {children}
    </ColorThemeContext.Provider>
  );
}

export function useColorTheme() {
  const ctx = useContext(ColorThemeContext);
  if (!ctx) throw new Error("useColorTheme must be used within ColorThemeProvider");
  return ctx;
}
