import { THEME } from "@/constants";
import { atom, toPersisted } from "@/lib/atom";

/**
 * states and private vars
 */

const base = toPersisted("theme", atom<(typeof THEME.S)[number]>(THEME.S[0]));
const computed = atom<"light" | "dark">(THEME.S[1]);

/**
 * subscriptions
 */

base.subscribe(() => {
  const html = document.documentElement;

  switch (base.get()) {
    case "system":
      html.removeAttribute(THEME.ATTRIBUTE);
      const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      computed.set(isDark ? "dark" : "light");
      break;
    case "light":
      html.setAttribute(THEME.ATTRIBUTE, "base-light");
      computed.set("light");
      break;
    case "dark":
      html.setAttribute(THEME.ATTRIBUTE, "base-dark");
      computed.set("dark");
      break;
    default:
      throw new Error(`Invalid theme: ${base.get()}`);
  }
});
computed.subscribe(() => {
  let meta = document.querySelector("meta[name='theme-color']");
  if (!meta) {
    meta = document.createElement("meta");
    meta.setAttribute("name", "theme-color");
    document.head.appendChild(meta);
  }

  switch (computed.get()) {
    case "light":
      meta.setAttribute("content", "#E8E8E8");
      break;
    case "dark":
      meta.setAttribute("content", "#4D4D4D");
      break;
    default:
      throw new Error(`Invalid computed theme: ${computed.get()}`);
  }
});
document.addEventListener("DOMContentLoaded", () => {
  base.notify();
});

/**
 * actions
 */

function next() {
  base.set(THEME.S[(THEME.S.indexOf(base.get()) + 1) % THEME.S.length]);
}

/**
 * exports
 */

export const theme = {
  base,
  computed,
  next,
};
