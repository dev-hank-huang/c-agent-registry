import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";

export type ThemeMode = "light" | "dark" | "system";
type ResolvedTheme = "light" | "dark";

const STORAGE_KEY = "theme";
const MEDIA_QUERY = "(prefers-color-scheme: dark)";

// Kept in lockstep with the inline boot script in index.html — both must
// resolve the same stored value + system preference to the same theme, or
// the page flashes the wrong theme between that script and React mounting.
export function resolveTheme(stored: string | null, prefersDark: boolean): ResolvedTheme {
  if (stored === "light" || stored === "dark") return stored;
  return prefersDark ? "dark" : "light";
}

function readStoredMode(): ThemeMode {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === "light" || stored === "dark" || stored === "system" ? stored : "system";
}

interface ThemeContextValue {
  mode: ThemeMode;
  resolvedTheme: ResolvedTheme;
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(readStoredMode);
  // Read the attribute the boot script already set — never recompute here,
  // so React's first render always matches what's already painted.
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(
    () => (document.documentElement.getAttribute("data-theme") as ResolvedTheme | null) ?? "light",
  );

  const applyTheme = useCallback((next: ResolvedTheme) => {
    document.documentElement.setAttribute("data-theme", next);
    setResolvedTheme(next);
  }, []);

  const setMode = useCallback(
    (next: ThemeMode) => {
      setModeState(next);
      localStorage.setItem(STORAGE_KEY, next);
      const prefersDark = window.matchMedia(MEDIA_QUERY).matches;
      applyTheme(resolveTheme(next === "system" ? null : next, prefersDark));
    },
    [applyTheme],
  );

  // Live-follow OS changes only while in "system" mode.
  useEffect(() => {
    if (mode !== "system") return;
    const mql = window.matchMedia(MEDIA_QUERY);
    const handleChange = (e: MediaQueryListEvent) => applyTheme(e.matches ? "dark" : "light");
    mql.addEventListener("change", handleChange);
    return () => mql.removeEventListener("change", handleChange);
  }, [mode, applyTheme]);

  return (
    <ThemeContext.Provider value={{ mode, resolvedTheme, setMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
