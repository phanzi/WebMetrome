import { atom, toPersisted } from "@/lib/atom";

type Theme = "light" | "dark" | "system";

export const theme = toPersisted("theme", atom<Theme>("system"));

theme.subscribe(() => {
  const html = document.querySelector("html");
  if (!html) {
    throw new Error("html element not found");
  }
  const value = theme.get();
  if (value === "system") {
    html.removeAttribute("data-theme");
  } else {
    html.setAttribute("data-theme", value);
  }
});

window.addEventListener("DOMContentLoaded", () => {
  theme.notify();
});

const map: Record<Theme, Theme> = {
  system: "light",
  light: "dark",
  dark: "system",
};

export function nextTheme() {
  theme.set(map[theme.get()]);
}
