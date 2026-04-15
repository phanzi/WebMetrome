import { cn } from "@/lib/utils";
import { ComponentProps } from "react";

export function Card(props: ComponentProps<"div">) {
  const { children, className, ...rest } = props;
  return (
    <div
      className={cn(
        "space-y-3.75 rounded-[18px] bg-white p-3.75 shadow-[0_4px_12px_rgba(0,0,0,0.05)]",
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}
