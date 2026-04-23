import { THEME_ATTRIBUTE } from "@/constants";
import { atom, toPersisted } from "@/lib/atom";

const THEMES = ["system", "light", "dark"] as const;

type Theme = (typeof THEMES)[number];

export const theme = toPersisted("theme", atom<Theme>(THEMES[0]));

const meta = document.createElement("meta");
meta.setAttribute("name", "theme-color");
document.head.appendChild(meta);

theme.subscribe(() => {
  const html = document.documentElement;

  const themeValue = theme.get();
  themeValue === "system"
    ? html.removeAttribute(THEME_ATTRIBUTE)
    : html.setAttribute(THEME_ATTRIBUTE, `base-${themeValue}`);

  meta.setAttribute("content", getComputedStyle(html).backgroundColor);
});

theme.notify();

export function nextTheme() {
  theme.set(THEMES[(THEMES.indexOf(theme.get()) + 1) % THEMES.length]);
}
