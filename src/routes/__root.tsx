import { BeatDot } from "@/components/BeatDot";
import { Card } from "@/components/Card";
import { BeatCard } from "@/components/ctrl/BeatCard";
import { BpmCard } from "@/components/ctrl/BpmCard";
import { LatencyOffsetCard } from "@/components/ctrl/LatencyCard";
import { SavedCard } from "@/components/ctrl/SavedCard";
import { VolumeCard } from "@/components/ctrl/VolumeCard";
import { metronome, MetronomeOption } from "@/shared/lib/metronome";
import { room } from "@/shared/lib/room";
import { ThemeContext, ThemeProvider } from "@/shared/lib/theme";
import { cn, ContextConsumer } from "@/shared/lib/utils";
import {
  createRootRoute,
  HeadContent,
  Outlet,
  Scripts,
  useMatch,
} from "@tanstack/react-router";
import { range } from "es-toolkit";
import { MoonIcon, SunIcon, SunMoonIcon, UnplugIcon } from "lucide-react";
import { useStore } from "zustand";
import "../index.css";

export const Route = createRootRoute({
  ssr: true,
  shellComponent: ({ children }) => {
    return (
      <html>
        <head>
          <HeadContent />
        </head>
        <body>
          <ThemeProvider>
            {children}
            <div className="contents" id="portal-exit"></div>
          </ThemeProvider>
          <Scripts />
        </body>
      </html>
    );
  },
  head: () => {
    return {
      meta: [
        { charSet: "UTF-8" },
        { title: "Sync Metronome" },
        {
          name: "description",
          content: "Sync Metronome - sync beats sound anywhere",
        },
        { name: "viewport", content: "width=device-width, initial-scale=1.0" },
        { name: "theme-color" },
        // open graph
        { property: "og:title", content: "Sync Metronome" },
        {
          property: "og:description",
          content: "Sync Metronome - sync beats sound anywhere",
        },
        {
          property: "og:image",
          content: `${import.meta.env.VITE_PUBLIC_URL}/og-image.png`,
        },
        { property: "og:url", content: import.meta.env.VITE_PUBLIC_URL },
        { property: "og:type", content: "website" },
        { property: "og:site_name", content: "Sync Metronome" },
        { property: "og:locale", content: "en_US" },
        // twitter
        { property: "twitter:card", content: "summary_large_image" },
        { property: "twitter:title", content: "Sync Metronome" },
        {
          property: "twitter:description",
          content: "Sync Metronome - sync beats sound anywhere",
        },
        {
          property: "twitter:image",
          content: `${import.meta.env.VITE_PUBLIC_URL}/og-image.png`,
        },
        { property: "twitter:url", content: import.meta.env.VITE_PUBLIC_URL },
      ],
      links: [
        { rel: "manifest", href: "/manifest.webmanifest" },
        { rel: "icon", href: "/favicon.ico", sizes: "48x48" },
        {
          rel: "icon",
          href: "/favicon.svg",
          sizes: "any",
          type: "image/svg+xml",
        },
        { rel: "apple-touch-icon", href: "/apple-touch-icon-180x180.png" },
        { rel: "canonical", href: import.meta.env.VITE_PUBLIC_URL },
      ],
    };
  },
  component: RootLayout,
});

function RootLayout() {
  /**
   * metronome state
   */
  const bpm = useStore(metronome.store, (store) => store.option.bpm);
  const beats = useStore(metronome.store, (store) => store.option.beats);
  const subDivision = useStore(
    metronome.store,
    (store) => store.option.subDivision,
  );
  const beatIndex = useStore(metronome.store, (store) => store.beatIndex);
  const isPlaying = useStore(metronome.store, (store) => store.isPlaying);

  /**
   * room state
   */
  const role = useStore(room.store, (store) => store.role);
  const isPending = useStore(room.store, (store) => store.isPending);
  const match = useMatch({ from: "/rooms/$roomId", shouldThrow: false });

  const changeOption = async (partial: Partial<MetronomeOption>) => {
    const option: MetronomeOption = {
      ...metronome.store.getState().option,
      ...partial,
    };
    const result = await room.sync(option);
    if (result.success) {
      metronome.store.setState({ option });
    } else {
      alert(result.message);
    }
  };
  const togglePlay = async () => {
    if (isPlaying) {
      const result = await room.halt();
      if (result.success) {
        metronome.stop();
      } else {
        alert(result.message);
      }
    } else {
      const result = await room.play();
      if (result.success) {
        metronome.play(result.data.at - room.clockSkew);
      } else {
        alert(result.message);
      }
    }
  };

  const isOnline = match?.status === "success";
  const editDisabled = isPending || (isOnline && role !== "owner") || isPlaying;
  const playDisabled = isPending || (isOnline && role !== "owner");

  return (
    <div className="mx-auto min-h-screen max-w-md space-y-4 py-4 font-sans">
      <header className="flex items-center justify-between px-4">
        <div className="drawer contents">
          <input className="drawer-toggle" id="my-drawer-1" type="checkbox" />
          <div className="drawer-content">
            <label className="btn drawer-button" htmlFor="my-drawer-1">
              <UnplugIcon />
            </label>
          </div>
          <div className="drawer-side z-20">
            <label className="drawer-overlay" htmlFor="my-drawer-1">
              <span className="sr-only">close sidebar</span>
            </label>

            <div className="w-[calc(var(--container-md)+--spacing(4))] max-w-full space-y-4 p-4">
              <Outlet />
              <VolumeCard />
              <LatencyOffsetCard />
            </div>
          </div>
        </div>

        <h1 className="text-2xl font-bold">Sync Metronome</h1>
        <ContextConsumer context={ThemeContext}>
          {({ value, next }) => (
            <button className="btn" onClick={next}>
              {value === "light" ? <SunIcon /> : null}
              {value === "dark" ? <MoonIcon /> : null}
              {value === "system" ? <SunMoonIcon /> : null}
              <span className="sr-only">change theme to {value}</span>
            </button>
          )}
        </ContextConsumer>
      </header>

      <main className="space-y-4">
        <Card className="sticky top-4 z-10 flex-row shadow-lg">
          <div className="flex w-full p-4">
            <BeatDot
              className="w-0 border-0 outline-0"
              variant="accent"
            ></BeatDot>
            <div
              className={cn(
                "flex w-full items-center justify-center gap-2",
                beats > 10 && "gap-1.5",
                beats > 20 && "gap-1",
                beats > 40 && "gap-0.5",
                beats > 80 && "gap-0.25",
              )}
            >
              {range(0, beats).map((i) => (
                <BeatDot
                  key={i}
                  variant={i === 0 ? "accent" : "regular"}
                  state={beatIndex === i ? "active" : "inactive"}
                >
                  {beats <= 10 ? i + 1 : ""}
                </BeatDot>
              ))}
            </div>
          </div>
        </Card>

        <BpmCard
          bpm={bpm}
          onChange={(bpm) => changeOption({ bpm })}
          disabled={editDisabled}
        />
        <BeatCard
          beats={beats}
          onBeatsChange={(beats) => changeOption({ beats })}
          subDivision={subDivision}
          onSubDivisionChange={(subDivision) => changeOption({ subDivision })}
          disabled={editDisabled}
        />
        <SavedCard
          onLoad={(option) => changeOption(option)}
          disabled={editDisabled}
        />
      </main>

      <footer className="contents">
        <button
          className={cn(
            "btn btn-xl sticky bottom-4 w-full",
            isPlaying ? "btn-warning" : "btn-primary",
          )}
          onClick={togglePlay}
          disabled={playDisabled}
        >
          {isPlaying ? "STOP" : "START"}
        </button>
      </footer>
    </div>
  );
}
