import { BeatDot } from "@/components/BeatDot";
import { Card, CardBody } from "@/components/Card";
import { usePersist } from "@/shared/hook/usePersist";
import { useToggle } from "@/shared/hook/useToggle";
import { metronome } from "@/shared/lib/metronome";
import { cn } from "@/shared/lib/utils";
import { range } from "es-toolkit";
import { Columns3Icon, Rows3Icon } from "lucide-react";
import { useState } from "react";
import { useStore } from "zustand";
import { BeatPanel } from "./BeatPannel";

export function PreviewCard() {
  const beats = useStore(metronome.store, (store) => store.option.beats);
  const beatIndex = useStore(metronome.store, (store) => store.beatIndex);
  const isPlaying = useStore(metronome.store, (store) => store.isPlaying);

  const [fullscreen, setFullscreen] = usePersist(
    "preview-fullscreen",
    useState({
      enabled: false,
      orientation: "horizontal" as "horizontal" | "vertical",
    }),
  );
  const [isExpanded, toggleExpanded] = useToggle(useState(false));

  const toggleFullscreen = () => {
    setFullscreen((prev) => ({ ...prev, enabled: !prev.enabled }));
  };
  const toggleFullscreenOrientation = () => {
    setFullscreen((prev) => ({
      ...prev,
      orientation:
        prev.orientation === "horizontal" ? "vertical" : "horizontal",
    }));
  };

  return (
    <>
      <Card className="sticky top-4 z-10 shadow-lg">
        <CardBody
          className={cn(
            "w-full overflow-hidden duration-500",
            isExpanded ? "h-36" : "h-22",
          )}
        >
          <div
            className={cn(
              "flex items-center justify-center gap-2",
              beats > 10 && "gap-1.5",
              beats > 20 && "gap-1",
              beats > 40 && "gap-0.5",
              beats > 80 && "gap-0.25",
            )}
          >
            {/* TODO: 아래의 BeatDot의 역할 추적 */}
            <BeatDot
              className="w-0 border-0 outline-0"
              variant="accent"
            ></BeatDot>
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
          <div className="mt-3 text-center">
            <label className="label">
              <input
                className="toggle"
                type="checkbox"
                checked={fullscreen.enabled}
                onChange={toggleFullscreen}
              />
              Fullscreen Mode
            </label>
          </div>
        </CardBody>
        <button className="absolute bottom-0 w-full" onClick={toggleExpanded}>
          <div className="btn h-2 w-24"></div>
        </button>
      </Card>

      <div
        className={cn(
          "bg-base-200 fixed top-0 left-0 z-10 flex h-0 w-0 overflow-hidden rounded-none",
          fullscreen.enabled && isPlaying ? "h-screen w-screen" : "",
          fullscreen.orientation === "horizontal" ? "flex-row" : "flex-col",
        )}
      >
        {range(0, beats).map((i) => (
          <BeatPanel
            className="h-auto w-auto flex-1 scale-100 rounded-none border-none text-2xl shadow-none"
            key={i}
            variant={i === 0 ? "accent" : "regular"}
            state={beatIndex === i ? "active" : "inactive"}
          ></BeatPanel>
        ))}
        <div className="absolute flex h-full w-full items-center justify-center bg-transparent text-8xl">
          {beatIndex + 1}
        </div>
        <label className="swap btn btn-xl btn-square btn-ghost absolute right-4 bottom-4">
          <input
            type="checkbox"
            checked={fullscreen.orientation === "horizontal"}
            onChange={toggleFullscreenOrientation}
          />
          <Rows3Icon className="swap-on" />
          <Columns3Icon className="swap-off" />
        </label>
      </div>
    </>
  );
}
