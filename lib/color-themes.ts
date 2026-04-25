export const COLOR_THEMES = [
  { id: "teal",   label: "Teal",   swatch: "#0d9488" },
  { id: "blue",   label: "Blue",   swatch: "#3b5fe0" },
  { id: "green",  label: "Green",  swatch: "#16a34a" },
  { id: "purple", label: "Purple", swatch: "#7c3aed" },
  { id: "rose",   label: "Rose",   swatch: "#e11d48" },
  { id: "orange", label: "Orange", swatch: "#d97706" },
] as const;

export type ColorThemeId = (typeof COLOR_THEMES)[number]["id"];

export const DEFAULT_COLOR_THEME: ColorThemeId = "teal";
export const COLOR_THEME_STORAGE_KEY = "myhealth-color";
