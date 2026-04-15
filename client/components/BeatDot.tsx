import { cva, type VariantProps } from "class-variance-authority";

const beatDotClass = cva(
  "animation-duration flex items-center justify-center rounded-full font-bold text-white transition-all duration-100 [animation-duration:0.5s]",
  {
    variants: {
      variant: {
        accent: "h-13.75 w-13.75 border-2 border-white text-[1.2rem]",
        regular: "h-9.5 w-9.5 text-[0.9rem]",
      },
      state: {
        active: "scale-110 animate-pulse",
        inactive: "bg-slate-700",
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

export function BeatDot(props: VariantProps<typeof beatDotClass>) {
  return <div className={beatDotClass(props)}></div>;
}
