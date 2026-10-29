import Link from "next/link";
import { ResultForm } from "@/components/result-form";
import { Notice, Page, Panel } from "@/components/ui";
import { saveBuildPlan } from "@/lib/actions/campaign";
import { useBuff } from "@/lib/actions/muster";
import { saveNotes, spendIncrease } from "@/lib/actions/character";
import { loadViewer, setupMessage } from "@/lib/company";
import { createClient } from "@/lib/supabase/server";
import { preInductionHp } from "@/lib/rules/checkin";
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
  const buffs =
    supabase
      ? (
          await supabase
            .from("character_buffs")
            .select("id, status, buff_id, buff_catalog(name, duration)")
            .eq("character_id", character.id)
            .eq("status", "active")
        ).data
      : [];
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
        <p className="text-mute">
          {character.inducted_at
            ? "Combat numbers follow induction."
            : `Before induction, HP is ${preInductionHp({
                constitution: character.constitution,
                species: character.species,
                originWord: character.origin_word,
              })}.`}
        </p>
        <p>
          Build {impact?.build_total ?? "—"} of {viewer.config?.point_buy_budget ?? 27}. Physical bank{" "}
          {character.physical_points} · Constitution bank {character.constitution_points} · Mental bank{" "}
          {character.mental_points} · Social bank {character.social_points ?? 0} · Free bank {character.free_points ?? 0}
        </p>
        <p className="text-mute">Attribute growth comes from your workouts and the goals you hit. You place the bank.</p>
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
      <Panel title="Active buffs">
        {(buffs ?? []).length === 0 ? <p className="text-mute">No active buffs.</p> : null}
        {(buffs ?? []).map((buff) => {
          const catalog = Array.isArray(buff.buff_catalog) ? buff.buff_catalog[0] : buff.buff_catalog;
          return (
            <div key={buff.id}>
              <p>
                {catalog?.name ?? buff.buff_id}
                {catalog?.duration === "one_use" ? " · one use" : " · this session"}
              </p>
              {catalog?.duration === "one_use" ? (
                <ResultForm action={useBuff} submit="Mark used">
                  <input type="hidden" name="buff_row_id" value={buff.id} />
                </ResultForm>
              ) : null}
            </div>
          );
        })}
      </Panel>
      <Panel title="Build plan">
        <p className="text-mute">Your target array. The DM can read it. You place every increase.</p>
        <ResultForm action={saveBuildPlan} submit="Save Build plan">
          <input type="hidden" name="character_id" value={character.id} />
          <input name="strength" inputMode="numeric" defaultValue={character.strength} />
          <input name="dexterity" inputMode="numeric" defaultValue={character.dexterity} />
          <input name="constitution" inputMode="numeric" defaultValue={character.constitution} />
          <input name="intelligence" inputMode="numeric" defaultValue={character.intelligence} />
          <input name="wisdom" inputMode="numeric" defaultValue={character.wisdom} />
          <input name="charisma" inputMode="numeric" defaultValue={character.charisma} />
        </ResultForm>
      </Panel>
      <Panel title="Notes">
        <ResultForm action={saveNotes} submit="Save notes">
          <textarea name="notes" defaultValue={character.notes ?? ""} />
        </ResultForm>
      </Panel>
    </Page>
  );
}
