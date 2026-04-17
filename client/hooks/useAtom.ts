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

export function toPersisted<T>(key: string, atom: Atom<T>) {
  const value = localStorage.getItem(key);
  if (value !== null) {
    atom.set(JSON.parse(value), false);
  }

  atom.subscribe(() => {
    localStorage.setItem(key, JSON.stringify(atom.get()));
  });
  return atom;
}

export function useAtom<T>(atom: Atom<T>) {
  const value = useSyncExternalStore(atom.subscribe, atom.get);

  const changeValue = (newValue: T) => {
    atom.set(newValue);
  };

  return [value, changeValue] as const;
}
