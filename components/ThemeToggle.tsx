"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Moon, Sun, SunMoon } from "lucide-react";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch — only render icon after mount
  useEffect(() => setMounted(true), []);

  if (!mounted) return <Button variant="ghost" size="icon" className="h-8 w-8" />;

  function cycle() {
    if (theme === "system") setTheme("light");
    else if (theme === "light") setTheme("dark");
    else setTheme("system");
  }

  const Icon = theme === "light" ? Sun : theme === "dark" ? Moon : SunMoon;
  const label = theme === "light" ? "Light" : theme === "dark" ? "Dark" : "System";

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8"
      onClick={cycle}
      title={`Theme: ${label} — click to cycle`}
    >
      <Icon className="w-4 h-4" />
      <span className="sr-only">Toggle theme ({label})</span>
    </Button>
  );
}
