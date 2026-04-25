import { createRouter } from "@tanstack/react-router";
import { memoize } from "es-toolkit";
import { RouteComponent } from "./noFound";
import { routeTree } from "./routeTree.gen";

export const getRouter = memoize(() => {
  const router = createRouter({
    routeTree,
    scrollRestoration: true,
    defaultNotFoundComponent: RouteComponent,
  });

  return router;
});
