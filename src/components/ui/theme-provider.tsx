import { createContext, useContext, useState } from "react";
import Cookies from "js-cookie";

export type Theme = "dark" | "light";

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
};

type ThemeProviderState = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

const initialState: ThemeProviderState = {
  theme: "dark",
  setTheme: () => null,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

export function ThemeProvider({
  children,
  defaultTheme = "dark",
  ...props
}: ThemeProviderProps) {
  const STORAGE_KEY = "ui-theme";
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === "undefined") {
      return defaultTheme;
    }

    return (Cookies.get(STORAGE_KEY) as Theme) || defaultTheme;
  });

  const setTheme = (newTheme: Theme) => {
    const root = document.documentElement;

    root.classList.remove("light", "dark");
    root.classList.add(newTheme);
    Cookies.set(STORAGE_KEY, newTheme, { path: "/", expires: 365 }); // Set a cookie for the server to read
    setThemeState(newTheme);
  };

  const value = { theme, setTheme };

  return (
    <ThemeProviderContext.Provider value={value} {...props}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
