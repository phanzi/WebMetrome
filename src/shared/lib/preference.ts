import {
  createJSONStorage,
  persist,
  subscribeWithSelector,
} from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import { createStore } from "zustand/vanilla";

type Store = {
  partyLight: boolean;
  actions: {
    togglePartyLight: () => void;
  };
};

const store = createStore<Store>()(
  persist(
    subscribeWithSelector(
      immer((set, _get) => ({
        partyLight: false,
        actions: {
          togglePartyLight: () => {
            set((state) => {
              state.partyLight = !state.partyLight;
            });
          },
        },
      })),
    ),
    {
      version: 1,
      name: "preference",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        partyLight: state.partyLight,
      }),
    },
  ),
);

export const preference = {
  store,
};
