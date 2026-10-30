export const VW = 320;
export const VH = 180;

export type RoomId =
  | "living"
  | "kitchen"
  | "bedroom"
  | "hallway"
  | "server"
  | "bathroom"
  | "gameroom"
  | "rooftop";

export type Verb = "look" | "use" | "talk";

export type PanelId =
  | "about"
  | "projects"
  | "services"
  | "skills"
  | "scores"
  | "contact"
  | "secret"
  | "photos"
  | "telescope"
  | null;

export interface Hotspot {
  id: string;
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  standX: number;
  standY: number;
  defVerb: Verb;
  /** if set, this hotspot is an exit to another room */
  door?: RoomId;
  /** optional dynamic label (e.g. Sun vs Moon based on Philippine time) */
  label?: () => string;
  /** optional visibility predicate — hotspot only active when true */
  when?: (flags: Flags) => boolean;
}

export interface DialogLine {
  who: string;
  color: string;
  text: string;
}

export type Flags = Record<string, boolean>;

export type PoseKind = "stand" | "sit" | "lay";

export interface PoseRequest {
  kind: Exclude<PoseKind, "stand">;
  x: number;
  y: number;
  face?: 1 | -1;
  label: string;
  /** safe floor position to return to when standing up */
  exitX: number;
  exitY: number;
}

export interface RoomDef {
  id: RoomId;
  name: string;
  sub: string;
  walkY: [number, number];
  entries: Record<string, { x: number; y: number }>;
  hotspots: Hotspot[];
  paint: (g: CanvasRenderingContext2D) => void;
  dynamics?: (g: CanvasRenderingContext2D, t: number, flags: Flags) => void;
}
