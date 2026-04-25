import { app } from "@server/app";
import { createFileRoute } from "@tanstack/react-router";

const handle = ({ request }: { request: Request }) => app.fetch(request);

export const Route = createFileRoute("/api/$")({
  server: {
    handlers: {
      ANY: handle,
    },
  },
});
