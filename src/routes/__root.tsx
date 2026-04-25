import { BeatDot } from "@/components/BeatDot";
import { Card } from "@/components/Card";
import { ThemeButton } from "@/components/ThemeButtont";
import { BeatCard } from "@/components/ctrl/BeatCard";
import { BpmCard } from "@/components/ctrl/BpmCard";
import { LatencyOffsetCard } from "@/components/ctrl/LatencyCard";
import { SavedStatesCard } from "@/components/ctrl/SavedStatesCard";
import { VolumeCard } from "@/components/ctrl/VolumeCard";
import { SUB_DIVISION } from "@/constants";
import { useAtom } from "@/lib/atom";
import { metronome } from "@/lib/metronome";
import { room } from "@/lib/room";
import { cn } from "@/lib/utils";
import {
  createRootRoute,
  HeadContent,
  Outlet,
  Scripts,
  useMatch,
} from "@tanstack/react-router";
import { range } from "es-toolkit";
import { UnplugIcon } from "lucide-react";
import "../index.css";

export const Route = createRootRoute({
  ssr: false,
  shellComponent: ({ children }) => {
    return (
      <html>
        <head>
          <HeadContent />
        </head>
        <body>
          {children}
          <div className="contents" id="portal-exit"></div>
          <Scripts />
        </body>
      </html>
    );
  },
  notFoundComponent: () => {
    return <p>Not Found</p>;
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
        // { name: "theme-color" }, // Loaded dynamically by theme.ts
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
      links: [{ rel: "canonical", href: import.meta.env.VITE_PUBLIC_URL }],
    };
  },
  component: RootLayout,
});

function RootLayout() {
  /**
   * metronome state
   */
  const [bpm, setBpm] = useAtom(metronome.bpm);
  const [beats, setBeats] = useAtom(metronome.beats);
  const [subDivision, setSubDivision] = useAtom(metronome.subDivision);
  const [beatIndex] = useAtom(metronome.beatIndex);
  const [isPlaying] = useAtom(metronome.isPlaying);

  /**
   * room state
   */
  const [isPending] = useAtom(room.isPending);
  const [role] = useAtom(room.role);
  const match = useMatch({ from: "/rooms/$roomId", shouldThrow: false });

  const handleSetBpm = async (bpm: number) => {
    console.log("handleSetBpm", bpm);
    const result = await room.send("set-metronome", {
      bpm,
      beats,
      subDivision,
    });
    if (result.success) {
      setBpm(bpm);
    } else {
      alert(result.message);
    }
  };
  const handleSetBeats = async (beats: number) => {
    const result = await room.send("set-metronome", {
      bpm,
      beats,
      subDivision,
    });
    if (result.success) {
      setBeats(beats);
    } else {
      alert(result.message);
    }
  };
  const handleSetSubDivision = async (
    subDivision: ReturnType<typeof metronome.subDivision.get>,
  ) => {
    const result = await room.send("set-metronome", {
      bpm,
      beats,
      subDivision,
    });
    if (result.success) {
      setSubDivision(subDivision);
    } else {
      alert(result.message);
    }
  };
  const togglePlay = async () => {
    if (isPlaying) {
      const result = await room.send("play-halt", {});
      if (result.success) {
        metronome.stop();
      } else {
        alert(result.message);
      }
    } else {
      const result = await room.send("play-schedule", {
        at: Date.now(),
        state: {
          bpm,
          beats,
          subDivision,
        },
      });
      if (result.success) {
        metronome.play(result.data.at - room.clockSkew);
      }
    }
  };

  const isOnline = match?.status === "success";
  const editDisabled = isPending || isPlaying || (isOnline && role !== "owner");
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
        <ThemeButton />
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

        <BpmCard bpm={bpm} onChange={handleSetBpm} disabled={editDisabled} />
        <BeatCard
          beats={beats}
          onBeatsChange={handleSetBeats}
          subDivision={subDivision}
          onSubDivisionChange={handleSetSubDivision}
          disabled={editDisabled}
        />
        <SavedStatesCard
          state={{ bpm, beats, subDivision }}
          onLoad={({ bpm, beats, subDivision }) => {
            handleSetBpm(bpm);
            handleSetBeats(beats);
            handleSetSubDivision(subDivision || SUB_DIVISION.DEFAULT);
          }}
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
