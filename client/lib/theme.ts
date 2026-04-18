import { atom, toPersisted } from "@/lib/atom";

type Theme = "light" | "dark" | "system";

export const theme = toPersisted("theme", atom<Theme>("system"));

theme.subscribe(() => {
  const html = document.querySelector("html");
  if (!html) {
    throw new Error("html element not found");
  }
  switch (theme.get()) {
    case "system":
      html.removeAttribute("data-theme");
      break;
    case "light":
      html.setAttribute("data-theme", "base-light");
      break;
    case "dark":
      html.setAttribute("data-theme", "base-dark");
      break;
    default:
      throw new Error("Invalid theme");
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
