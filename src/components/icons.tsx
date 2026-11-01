/**
 * Line icons only. Stroke follows the parent color: Steel Gray or Weathered Bronze.
 * No fill, glow, neon, gold, or cartoon marks.
 */
const PATHS = {
  barracks: "M4 20V9l8-5 8 5v11H4z M10 20v-6h4v6",
  missions: "M6 4v16 M6 5h10l-2 3 2 3H6",
  work: "M4 10h4v4H4z M16 10h4v4h-4z M8 12h8",
  character: "M12 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M6 20c1.2-3 3.2-4.5 6-4.5S16.8 17 18 20",
  menu: "M5 7h14 M5 12h14 M5 17h14",
  codex: "M6 4h8a3 3 0 0 1 3 3v13H8a2 2 0 0 0-2 2V4z M6 4a2 2 0 0 0-2 2v14h11",
  goals: "M6 4v16 M6 5h9l-2 4 2 4H6",
} as const;

export function LineIcon({ name }: { name: keyof typeof PATHS }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="mx-auto h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" strokeLinejoin="miter">
      <path d={PATHS[name]} />
    </svg>
  );
}
