import { ComponentProps } from "react";

type Props = ComponentProps<"input"> & {
  suffix?: string;
};

export function Input(props: Props) {
  const { suffix, onFocus, onBlur, value, ...rest } = props;

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.value = `${value}`;
    onFocus?.(e);
  };
  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.value = `${rest.prefix ?? ""}${value}${suffix ?? ""}`;
    onBlur?.(e);
  };

  return (
    <input
      onFocus={handleFocus}
      onBlur={handleBlur}
      value={`${rest.prefix ?? ""}${value}${suffix ?? ""}`}
      {...rest}
    />
  );
}
