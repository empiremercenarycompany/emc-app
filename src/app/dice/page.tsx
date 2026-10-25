import Link from "next/link";
import { DiceRoller } from "@/components/dice-roller";
import { Page } from "@/components/ui";
import { loadViewer } from "@/lib/company";
import { checkExpression } from "@/lib/rules/dice";
import { abilityModifier } from "@/lib/rules/modifiers";
import { ABILITIES, type AbilityName } from "@/lib/rules/starting-array";

const LABELS: Record<AbilityName, string> = {
  strength: "Strength",
  dexterity: "Dexterity",
  constitution: "Constitution",
  intelligence: "Intelligence",
  wisdom: "Wisdom",
  charisma: "Charisma",
};

export default async function DicePage() {
  const viewer = await loadViewer();
  const checks = viewer.character
    ? ABILITIES.map((ability) => ({
        label: LABELS[ability],
        expression: checkExpression(abilityModifier(viewer.character![ability])),
      }))
    : [];

  return (
    <Page title="Dice" lede="NdX+M. Advantage and disadvantage each roll the pool twice.">
      {!viewer.userId ? (
        <p className="text-mute">
          Rolls work without an account. <Link href="/sign-in">Sign in</Link> to save one on a sheet.
        </p>
      ) : null}
      <DiceRoller checks={checks} canSave={Boolean(viewer.character)} />
    </Page>
  );
}
