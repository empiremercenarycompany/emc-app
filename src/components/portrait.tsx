const FALLBACK = "/portraits/fallback.svg";

export function Portrait({ src, className }: { src: string | null; className?: string }) {
  return (
    // A signed portrait, or the shared fallback. Not a photo of a real person.
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src || FALLBACK} alt="" className={className} />
  );
}
