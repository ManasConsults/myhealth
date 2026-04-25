"use client";

import { Check } from "lucide-react";
import { COLOR_THEMES, ColorThemeId } from "@/lib/color-themes";
import { useColorTheme } from "@/components/ColorThemeProvider";
import { cn } from "@/lib/utils";

export function ColorPicker() {
  const { colorTheme, setColorTheme } = useColorTheme();

  return (
    <div className="flex flex-wrap gap-3">
      {COLOR_THEMES.map(({ id, label, swatch }) => {
        const active = colorTheme === id;
        return (
          <button
            key={id}
            type="button"
            title={label}
            onClick={() => setColorTheme(id as ColorThemeId)}
            className={cn(
              "relative flex h-9 w-9 items-center justify-center rounded-full transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background hover:scale-110 active:scale-95",
              active && "ring-2 ring-offset-2 ring-offset-background scale-110"
            )}
            style={{ backgroundColor: swatch, ...(active ? { ringColor: swatch } : {}) }}
            aria-pressed={active}
            aria-label={`${label} theme${active ? " (active)" : ""}`}
          >
            {active && <Check className="w-4 h-4 text-white drop-shadow" strokeWidth={3} />}
          </button>
        );
      })}
    </div>
  );
}
