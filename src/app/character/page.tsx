import Link from "next/link";
import { ResultForm } from "@/components/result-form";
import { Notice, Page, Panel } from "@/components/ui";
import { saveNotes, spendIncrease } from "@/lib/actions/character";
import { loadViewer, setupMessage } from "@/lib/company";
import { createClient } from "@/lib/supabase/server";
import { abilityModifier, formatModifier } from "@/lib/rules/modifiers";
import { ABILITIES, type AbilityName } from "@/lib/rules/starting-array";

const LABELS: Record<AbilityName, string> = {
  strength: "Strength",
  dexterity: "Dexterity",
  constitution: "Constitution",
  intelligence: "Intelligence",
  wisdom: "Wisdom",
  charisma: "Charisma",
};

export default async function CharacterPage() {
  const viewer = await loadViewer();
  const setup = setupMessage(viewer);
  if (!viewer.userId) {
    return (
      <Page title="Character">
        {setup ? <Notice>{setup}</Notice> : null}
        <p>Sign in to open your sheet.</p>
        <Link className="button primary" href="/sign-in">
          Join the Company
        </Link>
      </Page>
    );
  }
  if (!viewer.character) {
    return (
      <Page title="Character" lede="Not yet inducted">
        <Link className="button primary" href="/character/new">
          Sign the Recruit Oath
        </Link>
      </Page>
    );
  }

  const character = viewer.character;
  const supabase = await createClient();
  const audit = supabase
    ? (
        await supabase
          .from("progression_audit")
          .select("id, kind, from_value, to_value, reason, created_at")
          .eq("character_id", character.id)
          .order("created_at", { ascending: false })
          .limit(20)
      ).data
    : [];
  const ledger = supabase
    ? (
        await supabase
          .from("attribute_point_ledger")
          .select("id, source, points_awarded, pool, reason, status, created_at")
          .eq("character_id", character.id)
          .order("created_at", { ascending: false })
          .limit(30)
      ).data
    : [];
  const impact = supabase ? (await supabase.rpc("character_impact", { p_character_id: character.id })).data : null;
  const increases = Array.isArray(impact?.affordable_increases) ? impact.affordable_increases : [];
  const scores = {
    strength: character.strength,
    dexterity: character.dexterity,
    constitution: character.constitution,
    intelligence: character.intelligence,
    wisdom: character.wisdom,
    charisma: character.charisma,
  };

  return (
    <Page title={character.name} lede={character.class ?? "Not yet inducted"}>
      <Panel>
        <p>
          {character.rank} · level {character.level}
          {character.species ? ` · ${character.species}` : ""}
        </p>
        <p>
          {character.profession}
          {character.origin_word ? ` · ${character.origin_word}` : ""}
        </p>
        <p className="text-mute">Combat numbers are not set until induction. TODO(John): how those numbers are recorded before a class.</p>
        <p>
          Build {impact?.build_total ?? "—"} of {viewer.config?.point_buy_budget ?? 27}. Physical {character.physical_points}{" "}
          · Constitution {character.constitution_points} · Mental {character.mental_points}
        </p>
        <p className="text-mute">Attribute growth comes from your workouts and the goals you hit.</p>
      </Panel>
      <Panel title="Abilities">
        <ul className="grid grid-cols-2 gap-2">
          {ABILITIES.map((ability) => (
            <li key={ability} className="border border-steel p-2">
              <span className="text-mute">{LABELS[ability]}</span>
              <span className="ml-2 text-2xl">{scores[ability]}</span>
              <span className="ml-2">{formatModifier(abilityModifier(scores[ability]))}</span>
            </li>
          ))}
        </ul>
        {increases.map((increase: { ability: string; to: number; cost: number; pool: string }) => {
          const next = { ...scores, [increase.ability]: increase.to };
          return (
            <ResultForm key={`${increase.ability}-${increase.to}`} action={spendIncrease} submit={`Raise ${increase.ability} for ${increase.cost}`}>
              <input type="hidden" name="character_id" value={character.id} />
              {ABILITIES.map((ability) => (
                <input key={ability} type="hidden" name={ability} value={next[ability]} />
              ))}
              <p className="text-sm text-mute">
                {increase.pool} pool · {increase.ability} {scores[increase.ability as AbilityName]} to {increase.to}
              </p>
            </ResultForm>
          );
        })}
      </Panel>
      <Panel title="Record">
        <p className="text-mute">Level changes are recorded by staff. This sheet has no control that raises your level.</p>
        {(audit ?? []).length === 0 ? <p className="text-mute">No induction or level entries yet.</p> : null}
        <ul>
          {(audit ?? []).map((row) => (
            <li key={row.id}>
              {row.kind} {row.from_value ?? "—"} to {row.to_value ?? "—"} <span className="text-mute">{row.reason}</span>
            </li>
          ))}
        </ul>
      </Panel>
      <Panel title="Ledger">
        {(ledger ?? []).length === 0 ? <p className="text-mute">No entries yet.</p> : null}
        <ul className="flex flex-col gap-2">
          {(ledger ?? []).map((row) => (
            <li key={row.id}>
              {row.source}
              {row.pool ? ` · ${row.pool}` : ""} {row.points_awarded > 0 ? `+${row.points_awarded}` : row.points_awarded}{" "}
              <span className="text-mute">{row.reason}</span>
            </li>
          ))}
        </ul>
      </Panel>
      <Panel title="Notes">
        <ResultForm action={saveNotes} submit="Save notes">
          <textarea name="notes" defaultValue={character.notes ?? ""} />
        </ResultForm>
      </Panel>
    </Page>
  );
}
