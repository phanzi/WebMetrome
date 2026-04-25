import { cn } from "@/lib/utils";
import { ComponentProps } from "react";

export function Card(props: ComponentProps<"div">) {
  const { children, className, ...rest } = props;
  return (
    <div
      className={cn(
        "card bg-base-100 card-border border-base-300 card-md",
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

export function CardBody(props: ComponentProps<"div">) {
  const { children, className, ...rest } = props;
  return (
    <div className={cn("card-body p-4", className)} {...rest}>
      {children}
    </div>
  );
}
