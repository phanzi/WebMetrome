import { SubscribeAtom } from "@/lib/atom";
import { theme } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { MoonIcon, SunIcon, SunMoonIcon } from "lucide-react";
import { ComponentProps, useEffect, useState } from "react";

export function ThemeButton(props: ComponentProps<"button">) {
  const { className, onClick, ...rest } = props;

  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) return null;

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    theme.next();
    onClick?.(e);
  };

  return (
    <SubscribeAtom atom={theme.base}>
      {(value) => (
        <button
          className={cn("btn", className)}
          onClick={handleClick}
          {...rest}
        >
          {value === "light" ? <SunIcon /> : null}
          {value === "dark" ? <MoonIcon /> : null}
          {value === "system" ? <SunMoonIcon /> : null}
          <span className="sr-only">change theme to {value}</span>
        </button>
      )}
    </SubscribeAtom>
  );
}
