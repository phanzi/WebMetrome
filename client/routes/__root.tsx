import { BeatDot } from "@/components/BeatDot";
import { Card } from "@/components/Card";
import { BeatCard } from "@/components/ctrl/BeatCard";
import { BpmCard } from "@/components/ctrl/BpmCard";
import { LatencyOffsetCard } from "@/components/ctrl/LatencyCard";
import { SavedStatesCard } from "@/components/ctrl/SavedStatesCard";
import { VolumeCard } from "@/components/ctrl/VolumeCard";
import { SUB_DIVISION } from "@/constants";
import { SubscribeAtom, useAtom } from "@/lib/atom";
import { metronome } from "@/lib/metronome";
import { room } from "@/lib/room";
import { nextTheme, theme } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { createRootRoute, Outlet, useMatch } from "@tanstack/react-router";
import { debounce, range } from "es-toolkit";
import { MoonIcon, SunIcon, SunMoonIcon, UnplugIcon } from "lucide-react";

export const Route = createRootRoute({
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
  const [role] = useAtom(room.role);
  const match = useMatch({ from: "/rooms/$roomId", shouldThrow: false });

  const handleSetBpm = (bpm: number) => {
    setBpm(bpm);
    if (isOnline) {
      room.send({
        type: "set-metronome",
        payload: {
          bpm,
          beats,
          subDivision,
        },
      });
    }
  };
  const handleSetBeats = (beats: number) => {
    setBeats(beats);
    if (isOnline) {
      room.send({
        type: "set-metronome",
        payload: {
          bpm,
          beats,
          subDivision,
        },
      });
    }
  };
  const handleSetSubDivision = (
    subDivision: ReturnType<typeof metronome.subDivision.get>,
  ) => {
    setSubDivision(subDivision);
    if (isOnline) {
      room.send({
        type: "set-metronome",
        payload: {
          bpm,
          beats,
          subDivision,
        },
      });
    }
  };
  const togglePlay = () => {
    if (isPlaying) {
      metronome.stop();
      if (isOnline) {
        room.send({
          type: "play-halt",
          payload: {},
        });
      }
    } else {
      if (isOnline) {
        room.send({
          type: "play-schedule",
          payload: {
            at: Date.now(),
            state: {
              bpm,
              beats,
              subDivision,
            },
          },
        });
      } else {
        metronome.play(Date.now());
      }
    }
  };

  const isOnline = match?.status === "success";
  const editDisabled = isPlaying || (isOnline && role !== "owner");

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
            <label
              className="drawer-overlay"
              htmlFor="my-drawer-1"
              aria-label="close sidebar"
            ></label>

            <div className="w-[calc(var(--container-md)+--spacing(4))] max-w-full space-y-4 p-4">
              <Outlet />
              <VolumeCard />
              <LatencyOffsetCard />
            </div>
          </div>
        </div>

        <h1 className="text-2xl font-bold">Sync Metronome</h1>
        <SubscribeAtom atom={theme}>
          {(theme) => (
            <button className="btn" onClick={nextTheme}>
              {theme === "light" ? <SunIcon /> : null}
              {theme === "dark" ? <MoonIcon /> : null}
              {theme === "system" ? <SunMoonIcon /> : null}
            </button>
          )}
        </SubscribeAtom>
      </header>

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

      <BpmCard
        bpm={bpm}
        onChange={debounce(handleSetBpm, 300)}
        disabled={editDisabled}
      />
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

      <button
        className={cn(
          "btn btn-xl sticky bottom-4 w-full",
          isPlaying ? "btn-warning" : "btn-primary",
        )}
        onClick={togglePlay}
        disabled={isOnline && role !== "owner"}
      >
        {isPlaying ? "STOP" : "START"}
      </button>
    </div>
  );
}
