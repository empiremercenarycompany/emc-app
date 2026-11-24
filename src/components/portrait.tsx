/** Armory scene already in the repo. A stand-in when a player has no portrait of their own. */
const FALLBACK = "/art/header-band-placeholder.jpg";

export function Portrait({ src, className }: { src: string | null; className?: string }) {
  return (
    // A signed portrait, or the armory stand-in. Not a photo of a real person.
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src || FALLBACK} alt="" className={className} />
  );
}
