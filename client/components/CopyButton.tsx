import { cn } from "@/lib/utils";
import { CheckIcon, CopyIcon } from "lucide-react";
import type { ComponentProps } from "react";
import { useRef, useState } from "react";

type Props = Omit<ComponentProps<"button">, "children"> & {
  content: string;
};

export function CopyButton(props: Props) {
  const { content, ...rest } = props;
  const [isCopied, setIsCopied] = useState(false);
  const timer = useRef<NodeJS.Timeout>(undefined);

  const handleCopy = () => {
    setIsCopied(true);
    navigator.clipboard.writeText(content);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setIsCopied(false);
      timer.current = undefined;
    }, 1000);
  };

  return (
    <button
      className={cn(
        "join-item btn bg-base-100 swap flex-1",
        isCopied && "swap-active",
      )}
      onClick={handleCopy}
      {...rest}
    >
      <CopyIcon className="swap-off size-5" />
      <CheckIcon className="swap-on size-5" />
    </button>
  );
}
