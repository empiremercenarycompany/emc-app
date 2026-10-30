import Link from "next/link";
import { CharacterSheet } from "@/components/character-sheet";
import { NpcForm } from "@/components/npc-form";
import { ResultForm } from "@/components/result-form";
import { Notice, Page, Panel } from "@/components/ui";
import { saveBuildPlan } from "@/lib/actions/campaign";
import { useBuff } from "@/lib/actions/muster";
import { saveNotes, spendIncrease } from "@/lib/actions/character";
import { loadViewer, setupMessage } from "@/lib/company";
import { createClient } from "@/lib/supabase/server";
import { preInductionHp } from "@/lib/rules/checkin";
import { abilityModifier, formatModifier } from "@/lib/rules/modifiers";
import { speciesLabel } from "@/lib/rules/species-names";
import { ABILITIES, type AbilityName } from "@/lib/rules/starting-array";

const LABELS: Record<AbilityName, string> = {
  strength: "Strength",
  dexterity: "Dexterity",
  constitution: "Constitution",
  intelligence: "Intelligence",
  wisdom: "Wisdom",
  charisma: "Charisma",
};

const BANK: Record<string, string> = {
  physical: "workouts",
  constitution: "nutrition and sleep",
  mental: "mental goals",
  social: "social goals",
  free: "attendance",
};

const SOURCE: Record<string, string> = {
  workout: "Work",
  goal: "Goal",
  attendance: "Attendance",
  spend: "Build",
  muster: "Table Muster",
};

function abilityLabel(name: string) {
  return LABELS[name as AbilityName] ?? name;
}

export default async function CharacterPage() {
  const viewer = await loadViewer();
  const setup = setupMessage(viewer);
  if (!viewer.userId) {
    return (
      <Page title="Character">
        {setup ? <Notice>{setup}</Notice> : null}
        <p>Sign in to open your sheet.</p>
        <CharacterSheet
          name="Recruit"
          classLabel="Not yet inducted"
          level={1}
          scores={{ strength: 8, dexterity: 8, constitution: 8, intelligence: 8, wisdom: 8, charisma: 8 }}
          hp={preInductionHp({ constitution: 8, species: null, originWord: null })}
          skillId={null}
          features={<p className="text-mute">Features arrive with induction.</p>}
          inventory={<p className="text-mute">Nothing carried yet.</p>}
          npcs={<NpcForm characterId={null} />}
        >
          <p>Not final yet: see your DM or trainer to lock these in.</p>
          <p>Ready to move. A finalized placement can go back until the next session starts.</p>
          <p>Locked. When the next session starts, a finalized placement stays.</p>
          <p className="text-mute">What you have not placed stays ready, however old it is.</p>
        </CharacterSheet>
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
  const mobility = supabase
    ? (await supabase.rpc("build_mobility", { p_character_id: character.id })).data
    : null;
  const provisional = Array.isArray(mobility?.provisional) ? mobility.provisional : [];
  const ready = Array.isArray(mobility?.ready) ? mobility.ready : [];
  const locked = Array.isArray(mobility?.locked) ? mobility.locked : [];
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
  const npcs =
    supabase
      ? (
          await supabase
            .from("character_npcs")
            .select("id, name, relationship, likeness, status, review_note")
            .eq("character_id", character.id)
            .order("created_at", { ascending: false })
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
      <CharacterSheet
        name={character.name}
        classLabel={`${character.rank} · ${character.class ?? "Not yet inducted"}`}
        level={character.level}
        scores={scores}
        hp={preInductionHp({
          constitution: character.constitution,
          species: character.species,
          originWord: character.origin_word,
        })}
        skillId={character.profession_skill}
        features={
          <>
      <Panel>
        <p>
          {character.rank} · level {character.level}
          {character.species ? ` · ${speciesLabel(character.species)}` : ""}
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
        <p className="text-mute">What you have not placed stays ready. A DM or trainer locks a placement in person. It stays when the next session starts.</p>
        <div>
          <p className="font-bold">Not final yet: see your DM or trainer to lock these in</p>
          {provisional.length === 0 ? <p className="text-mute">Nothing is waiting.</p> : null}
          {provisional.map((row: { ability: string; pool: string; amount: number }) => (
            <p key={`provisional-${row.ability}-${row.pool}`}>
              {abilityLabel(row.ability)} · {row.amount} · {BANK[row.pool] ?? row.pool}
            </p>
          ))}
        </div>
        <div>
          <p className="font-bold">Ready to move</p>
          {ready.length === 0 ? <p className="text-mute">Nothing final is still movable.</p> : null}
          {ready.map((row: { ability: string; pool: string; amount: number }) => (
            <p key={`ready-${row.ability}-${row.pool}`}>
              {abilityLabel(row.ability)} · {row.amount} · {BANK[row.pool] ?? row.pool}
            </p>
          ))}
        </div>
        <div>
          <p className="font-bold">Locked</p>
          {locked.length === 0 ? <p className="text-mute">Nothing has locked yet.</p> : null}
          {locked.map((row: { ability: string; amount: number }) => (
            <p key={row.ability}>
              {abilityLabel(row.ability)} · {row.amount} · set when this session started
            </p>
          ))}
        </div>
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
            <ResultForm key={`${increase.ability}-${increase.to}`} action={spendIncrease} submit={`Raise ${abilityLabel(increase.ability)}`}>
              <input type="hidden" name="character_id" value={character.id} />
              {ABILITIES.map((ability) => (
                <input key={ability} type="hidden" name={ability} value={next[ability]} />
              ))}
              <p className="text-sm text-mute">
                From {BANK[increase.pool] ?? "workouts"} · {abilityLabel(increase.ability)} {scores[increase.ability as AbilityName]} to{" "}
                {increase.to}
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
              {SOURCE[row.source] ?? row.source}
              {row.pool ? ` · ${BANK[row.pool] ?? row.pool}` : ""}{" "}
              {row.points_awarded > 0 ? `+${row.points_awarded}` : row.points_awarded}{" "}
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
          {ABILITIES.map((ability) => (
            <label key={ability}>
              {LABELS[ability]}
              <input name={ability} inputMode="numeric" defaultValue={scores[ability]} />
            </label>
          ))}
        </ResultForm>
      </Panel>
      <Panel title="Notes">
        <ResultForm action={saveNotes} submit="Save notes">
          <textarea name="notes" defaultValue={character.notes ?? ""} />
        </ResultForm>
      </Panel>
          </>
        }
        inventory={<p className="text-mute">Nothing carried yet.</p>}
        npcs={
          <>
            <NpcForm characterId={character.id} />
            {(npcs ?? []).map((npc) => (
              <article key={npc.id} className="border border-steel p-3">
                <p>
                  {npc.name} · {npc.status === "approved" ? "Approved" : npc.status === "pending" ? "Pending" : "Draft"}
                </p>
                {npc.status !== "approved" ? <p>Pending: your DM will review this</p> : <p>Approved. This is canon for the Company.</p>}
                <p className="text-mute">{npc.relationship}</p>
                <p>{npc.likeness}</p>
                {npc.review_note ? <p className="text-mute">{npc.review_note}</p> : null}
                {npc.status !== "approved" ? (
                  <NpcForm
                    characterId={character.id}
                    npcId={npc.id}
                    initialName={npc.name}
                    initialRelationship={npc.relationship}
                    initialLikeness={npc.likeness}
                  />
                ) : null}
              </article>
            ))}
          </>
        }
      />
    </Page>
  );
}
