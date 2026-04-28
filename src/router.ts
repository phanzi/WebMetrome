import { createRouter } from "@tanstack/react-router";
import { memoize } from "es-toolkit";
import { NotFound } from "./noFound";
import { routeTree } from "./routeTree.gen";

export const getRouter = memoize(() => {
  const router = createRouter({
    routeTree,
    scrollRestoration: true,
    defaultNotFoundComponent: NotFound,
  });

  return router;
});
