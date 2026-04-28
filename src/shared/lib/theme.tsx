import { THEME } from "@/constants";
import { ScriptOnce } from "@tanstack/react-router";
import type { PropsWithChildren } from "react";
import { createContext, useEffect, useState } from "react";
import { useIsServer } from "../hook/useIsServer";
import { usePersist } from "../hook/usePersist";

type Theme = (typeof THEME.S)[number];

export const ThemeContext = createContext({
  value: THEME.S[0] as Theme,
  compute: () => "light" as "light" | "dark",
  next: () => {},
});

export function ThemeProvider(props: PropsWithChildren) {
  const { children } = props;

  const isServer = useIsServer();
  const [value, setValue] = usePersist("theme", useState<Theme>(THEME.S[0]));

  const compute = () => {
    if (value !== "system") return value;
    if (isServer) return "light";
    const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    return isDark ? "dark" : "light";
  };

  /**
   * theme value side effect
   */
  useEffect(() => {
    const html = document.documentElement;

    switch (value) {
      case "system":
        html.removeAttribute(THEME.ATTRIBUTE);
        break;
      case "light":
        html.setAttribute(THEME.ATTRIBUTE, "base-light");
        break;
      case "dark":
        html.setAttribute(THEME.ATTRIBUTE, "base-dark");
        break;
      default:
        throw new Error(`Invalid theme: ${value}`);
    }
  }, [value]);

  /**
   * computed side effect
   */
  const computed = compute();
  useEffect(() => {
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
  }, [computed]);

  const next = () => {
    setValue((prev) => THEME.S[(THEME.S.indexOf(prev) + 1) % THEME.S.length]);
  };

  return (
    <ThemeContext.Provider value={{ value, compute, next }}>
      {children}
      <ScriptOnce>
        {[
          `(function() {`,
          `const value = localStorage.getItem("theme")`,
          `if (!value) return`,
          `try {`,
          `const parsed = JSON.parse(value);`,
          `if (!parsed.value) return`,
          `if (parsed.value === "system") return`,
          `document.documentElement.setAttribute("data-theme", parsed.value)`,
          `} catch {}`,
          `})()`,
        ].join("\n")}
      </ScriptOnce>
    </ThemeContext.Provider>
  );
}
