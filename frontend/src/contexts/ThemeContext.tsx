import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type Theme =
  | "light"
  | "dark";

type ThemeContextValue = {
  theme: Theme;
  isDarkMode: boolean;
  toggleTheme: () => void;
};

type ThemeProviderProps = {
  children: ReactNode;
};

const THEME_STORAGE_KEY =
  "asfaleia_theme";

const ThemeContext =
  createContext<ThemeContextValue | null>(
    null,
  );

function isTheme(
  value: string | null,
): value is Theme {
  return (
    value === "light" ||
    value === "dark"
  );
}

function getInitialTheme(): Theme {
  const savedTheme =
    window.localStorage.getItem(
      THEME_STORAGE_KEY,
    );

  if (isTheme(savedTheme)) {
    return savedTheme;
  }

  const prefersDarkMode =
    window.matchMedia(
      "(prefers-color-scheme: dark)",
    ).matches;

  return prefersDarkMode
    ? "dark"
    : "light";
}

export function ThemeProvider({
  children,
}: ThemeProviderProps) {
  const [
    theme,
    setTheme,
  ] =
    useState<Theme>(
      getInitialTheme,
    );

  useEffect(() => {
    document.documentElement.setAttribute(
      "data-theme",
      theme,
    );

    document.documentElement.style.colorScheme =
      theme;

    window.localStorage.setItem(
      THEME_STORAGE_KEY,
      theme,
    );
  }, [theme]);

  const toggleTheme =
    useCallback((): void => {
      setTheme(
        (currentTheme) =>
          currentTheme === "light"
            ? "dark"
            : "light",
      );
    }, []);

  const contextValue =
    useMemo<ThemeContextValue>(
      () => ({
        theme,

        isDarkMode:
          theme === "dark",

        toggleTheme,
      }),
      [
        theme,
        toggleTheme,
      ],
    );

  return (
    <ThemeContext.Provider
      value={contextValue}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context =
    useContext(
      ThemeContext,
    );

  if (!context) {
    throw new Error(
      "useTheme deve ser utilizado dentro do ThemeProvider.",
    );
  }

  return context;
}