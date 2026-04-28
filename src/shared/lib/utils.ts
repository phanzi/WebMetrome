import type { ClassValue } from "clsx";
import { clsx } from "clsx";
import { use, type Context, type ReactNode } from "react";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function entries<K extends string, V>(obj: Record<K, V>): [K, V][] {
  return Object.entries(obj) as [K, V][];
}

type ContextConsumerProps<T> = {
  context: Context<T>;
  children: (value: T) => ReactNode;
};

export function ContextConsumer<T>(props: ContextConsumerProps<T>) {
  const { context, children } = props;
  const value = use(context);
  return children(value);
}
