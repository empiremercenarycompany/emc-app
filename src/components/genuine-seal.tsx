import { factionSeal } from "@/lib/seals/factions";
import { WaxSeal } from "./wax-seal";

/** The faction's canonical seal. Shown where a player can compare a document. */
export function GenuineSeal({
  factionId,
  framed = false,
  headingClass,
}: {
  factionId: string;
  framed?: boolean;
  headingClass?: string;
}) {
  const faction = factionSeal(factionId);
  if (!faction) return null;
  return (
    <section className={framed ? "paper genuine-seal" : "genuine-seal"} data-testid="genuine-seal">
      <h2 className={headingClass}>What a genuine seal looks like</h2>
      <WaxSeal factionId={factionId} size="reference" />
      <p>{faction.name}</p>
    </section>
  );
}
