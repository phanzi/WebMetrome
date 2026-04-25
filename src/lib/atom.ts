import { createIsomorphicFn } from "@tanstack/react-start";
import type { ReactNode } from "react";
import { useSyncExternalStore } from "react";

export function atom<T>(initialValue: T) {
  let value = initialValue;
  const listeners = new Set<() => void>();

  return {
    get() {
      return value;
    },
    set(newValue: T, notify: boolean = true) {
      value = newValue;
      if (notify) {
        this.notify();
      }
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    notify() {
      for (const listener of listeners) {
        listener();
      }
    },
  };
}

type Atom<T> = ReturnType<typeof atom<T>>;

export const persist = createIsomorphicFn()
  .server(<T>(key: string, atom: Atom<T>) => atom)
  .client(<T>(key: string, atom: Atom<T>) => {
    const value = localStorage.getItem(key);
    if (value !== null) {
      try {
        const parsed = JSON.parse(value) as { value: T };
        atom.set(parsed.value, false);
      } catch {}
    }

    atom.subscribe(() => {
      localStorage.setItem(key, JSON.stringify({ value: atom.get() }));
    });
    return atom;
  }) as <T>(key: string, atom: Atom<T>) => Atom<T>;

export function useAtom<T>(atom: Atom<T>) {
  const value = useSyncExternalStore(atom.subscribe, atom.get, atom.get);

  const changeValue = (updater: T | ((prev: T) => T)) => {
    if (typeof updater === "function") {
      const safeUpdater = updater as (prev: T) => T;
      const state = safeUpdater(value);
      atom.set(state);
    } else {
      atom.set(updater);
    }
  };

  return [value, changeValue] as const;
}

type Props<T> = {
  atom: Atom<T>;
  children: (value: T) => ReactNode;
};

export function SubscribeAtom<T>(props: Props<T>) {
  const { atom, children } = props;

  const [value] = useAtom(atom);

  return children(value);
}
