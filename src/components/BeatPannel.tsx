import { cn } from "@/shared/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";
import { PropsWithChildren } from "react";

const beatPanelClass = cva(
  "rounded-full transition-all duration-100 flex items-center justify-center text-neutral-content",
  {
    variants: {
      variant: {
        accent: "h-13.75 w-13.75 border-2 border-white text-[1.2rem]",
        regular: "h-9.5 w-9.5 text-[0.9rem]",
      },
      state: {
        active: "scale-110",
        inactive: "",
      },
    },
    compoundVariants: [
      {
        variant: "accent",
        state: "active",
        class: "bg-orange-500 shadow-[0_0_20px_rgba(230,126,34,0.9)]",
      },
      {
        variant: "regular",
        state: "active",
        class: "bg-emerald-500 shadow-[0_0_20px_rgba(46,204,113,0.9)]",
      },
    ],
    defaultVariants: {
      variant: "regular",
      state: "inactive",
    },
  },
);

type Props = VariantProps<typeof beatPanelClass> &
  PropsWithChildren<{
    className?: string;
  }>;

export function BeatPanel(props: Props) {
  const { className, children, ...rest } = props;

  return <div className={cn(beatPanelClass(rest), className)}>{children}</div>;
}
