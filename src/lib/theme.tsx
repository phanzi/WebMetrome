import { THEME } from "@/constants";
import type { PropsWithChildren } from "react";
import { createContext, useEffect, useState } from "react";

type Theme = (typeof THEME.S)[number];

export const ThemeContext = createContext({
  value: THEME.S[0] as Theme,
  next: () => {},
});

function _sideEffect(value: Theme) {
  const html = document.documentElement;
  let computed = value;

  switch (value) {
    case "system":
      html.removeAttribute(THEME.ATTRIBUTE);
      const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      computed = isDark ? "dark" : "light";
      break;
    case "light":
      html.setAttribute(THEME.ATTRIBUTE, "base-light");
      computed = "light";
      break;
    case "dark":
      html.setAttribute(THEME.ATTRIBUTE, "base-dark");
      computed = "dark";
      break;
    default:
      throw new Error(`Invalid theme: ${value}`);
  }

  const meta = document.querySelector("meta[name='theme-color']");
  if (!meta) {
    throw new Error("Theme color meta not found");
  }

  switch (computed) {
    case "light":
      meta.setAttribute("content", "#E8E8E8");
      break;
    case "dark":
      meta.setAttribute("content", "#4D4D4D");
      break;
    default:
      throw new Error(`Invalid computed theme: ${computed}`);
  }
}

export function ThemeProvider(props: PropsWithChildren) {
  const { children } = props;

  const [value, setValue] = useState<Theme>(THEME.S[0]);

  useEffect(() => {
    const value = localStorage.getItem("theme");
    if (value === null) return;
    const parsed = JSON.parse(value) as { value: Theme };
    _sideEffect(parsed.value);
    setValue(parsed.value);
  }, [setValue]);

  const next = () => {
    const newValue = THEME.S[(THEME.S.indexOf(value) + 1) % THEME.S.length];
    localStorage.setItem("theme", JSON.stringify({ value: newValue }));
    _sideEffect(newValue);
    setValue(newValue);
  };

  return (
    <ThemeContext.Provider value={{ value, next }}>
      {children}
    </ThemeContext.Provider>
  );
}
