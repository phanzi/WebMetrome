import { ComponentProps, useState } from "react";

type Props = ComponentProps<"input"> & {
  suffix?: string;
};

export function Input(props: Props) {
  const { suffix, onFocus, onBlur, value, ...rest } = props;

  const [focus, setFocus] = useState(false);

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.value = `${value}`;
    setFocus(true);
    onFocus?.(e);
  };
  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.value = `${rest.prefix ?? ""}${value}${suffix ?? ""}`;
    setFocus(false);
    onBlur?.(e);
  };

  const refinedValue = (() => {
    if (focus) {
      return `${value}`;
    } else {
      return `${rest.prefix ?? ""}${value}${suffix ?? ""}`;
    }
  })();

  return (
    <input
      onFocus={handleFocus}
      onBlur={handleBlur}
      value={refinedValue}
      {...rest}
    />
  );
}
