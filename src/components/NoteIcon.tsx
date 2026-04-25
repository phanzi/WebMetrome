import QuaterIcon from "@/assets/note/quater.svg?react";
import QuaversIcon from "@/assets/note/quavers.svg?react";
import SemiquaversIcon from "@/assets/note/semiquavers.svg?react";
import TripletIcon from "@/assets/note/triplet.svg?react";
import type { SubDivision } from "@/lib/metronome";

type NoteType = SubDivision;

const NOTE_TO_ICONS: Record<NoteType, typeof QuaterIcon> = {
  quater: QuaterIcon,
  quavers: QuaversIcon,
  triplet: TripletIcon,
  semiquavers: SemiquaversIcon,
};

type Props = {
  type: NoteType;
  className?: string;
};

export function NoteIcon(props: Props) {
  const { type, className } = props;

  const Icon = NOTE_TO_ICONS[type];

  return <Icon className={className} />;
}
