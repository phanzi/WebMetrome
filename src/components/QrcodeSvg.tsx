import { cn } from "@/shared/lib/utils";
import { type ComponentProps } from "react";
import { renderSVG } from "uqr";

function generateUrl(content: string) {
  return URL.createObjectURL(
    new Blob([renderSVG(content)], { type: "image/svg+xml" }),
  );
}

export function QrcodeImg(props: ComponentProps<"img">) {
  const { className, src, onLoad, ...rest } = props;

  const handleLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    URL.revokeObjectURL(e.currentTarget.src);
    onLoad?.(e);
  };

  return (
    <img
      className={cn("h-full w-full rounded-2xl", className)}
      src={generateUrl(src ?? "")}
      {...rest}
      onLoad={handleLoad}
    />
  );
}
