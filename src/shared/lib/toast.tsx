import { DEFAULT_TOAST_DURATION_MS } from "@/constants";
import { cn } from "@/shared/lib/utils";
import { nanoid } from "nanoid";
import { createStore, useStore } from "zustand";
import { immer } from "zustand/middleware/immer";

type Toast = {
  id: string;
  message: string;
  timer: NodeJS.Timeout;
};

type ToastOption = {
  durationMs?: number;
};

type Store = {
  toasts: Toast[];
  actions: {
    push: (message: string, option?: ToastOption) => string;
    dismiss: (id: string) => void;
    clear: () => void;
  };
};

const store = createStore<Store>()(
  immer((set, get) => ({
    toasts: [],
    actions: {
      push: (message, option) => {
        const id = nanoid();
        const durationMs = option?.durationMs ?? DEFAULT_TOAST_DURATION_MS;
        const timer = setTimeout(() => {
          get().actions.dismiss(id);
        }, durationMs);

        set((state) => {
          state.toasts.push({
            id,
            message,
            timer,
          });
        });

        return id;
      },
      dismiss: (id) => {
        set((state) => ({
          toasts: state.toasts.filter((toast) => toast.id !== id),
        }));
      },
      clear: () => {
        set({ toasts: [] });
      },
    },
  })),
);

export const toast = {
  store,
  dismiss: (id: string) => {
    return store.getState().actions.dismiss(id);
  },
  push: (message: string, option?: ToastOption) => {
    return store.getState().actions.push(message, option);
  },
};

export function Toasts() {
  const toasts = useStore(toast.store, (state) => state.toasts);

  return (
    <div className="toast toast-bottom toast-center bottom-20 z-50">
      {toasts.map((item) => (
        <div className={cn("alert")} key={item.id} role="alert">
          <span>{item.message}</span>
        </div>
      ))}
    </div>
  );
}
