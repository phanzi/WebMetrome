import { cn } from "@/lib/utils";
import { ComponentProps, useEffect, useRef, useState } from "react";
import { renderSVG } from "uqr";

function generateUrl(content: string) {
  return URL.createObjectURL(
    new Blob([renderSVG(content)], { type: "image/svg+xml" }),
  );
}

export function QrcodeSvg(props: ComponentProps<"img">) {
  const { className, src, ...rest } = props;

  const first = useRef(false);
  const [url, setUrl] = useState(generateUrl(src ?? ""));

  useEffect(() => {
    if (!first.current) {
      first.current = true;
      return;
    }

    const url = generateUrl(src ?? "");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [src]);

  return <img className={cn("h-full w-full", className)} src={url} {...rest} />;
}
