"use client";

import { useState, type KeyboardEvent, type ReactNode } from "react";
import { DiceRoller } from "@/components/dice-roller";
import { EmptyState } from "@/components/empty-state";
import { Term } from "@/components/term";
import { checkExpression } from "@/lib/rules/dice";
import { levelFourProgress, showsLevelFourProgress, showsMilestoneLevels } from "@/lib/rules/level-four";
import { abilityModifier, formatModifier } from "@/lib/rules/modifiers";
import { skillLabel } from "@/lib/rules/skill-names";
import { SHEET_SKILLS, armorClass, proficiencyBonus, walkingSpeed } from "@/lib/rules/sheet";
import { ABILITIES, type AbilityName } from "@/lib/rules/starting-array";

const CRESTS: Record<AbilityName, { id: string; label: string; meaning: string; built: string }> = {
  strength: { id: "str", label: "Strength", meaning: "How hard you can push, pull and lift.", built: "workouts" },
  dexterity: { id: "dex", label: "Dexterity", meaning: "Balance, speed and quick reflexes.", built: "workouts" },
  constitution: {
    id: "con",
    label: "Constitution",
    meaning: "Stamina, and how well you shake off hits.",
    built: "nutrition + sleep",
  },
  intelligence: { id: "int", label: "Intelligence", meaning: "Memory and clear thinking.", built: "mental goals" },
  wisdom: { id: "wis", label: "Wisdom", meaning: "Awareness and good judgment.", built: "mental goals" },
  charisma: { id: "cha", label: "Charisma", meaning: "How well you connect with people.", built: "social goals" },
};

const TABS = ["Overview", "Skills", "Gear", "Story", "Progress"] as const;

export function CharacterSheet({
  name,
  classLabel,
  level,
  scores,
  hp,
  skillId,
  skillIds = null,
  acOverride = null,
  speedOverride = null,
  saves = null,
  recordedSkills = null,
  recordedAttacks = null,
  recordedFeatures = null,
  recordedSpells = null,
  recordedFeats = null,
  conflicts = null,
  features,
  inventory,
  npcs,
  progress,
  levelFourCompleted = null,
  levelFourRequired = null,
  milestone = null,
  initiativeBonus = 0,
  initiativeNote = null,
  subclass = null,
}: {
  name: string;
  classLabel: string;
  level: number;
  scores: Record<AbilityName, number>;
  hp: number;
  skillId: string | null;
  skillIds?: string[] | null;
  acOverride?: number | null;
  speedOverride?: number | null;
  saves?: string[] | null;
  recordedSkills?: string[] | null;
  recordedAttacks?: string[] | null;
  recordedFeatures?: string[] | null;
  recordedSpells?: string[] | null;
  recordedFeats?: string[] | null;
  conflicts?: string[] | null;
  features: ReactNode;
  inventory: ReactNode;
  npcs: ReactNode;
  progress: ReactNode;
  levelFourCompleted?: number | null;
  levelFourRequired?: number | null;
  milestone?: ReactNode;
  initiativeBonus?: number;
  initiativeNote?: string | null;
  subclass?: { name: string | null; features: string | null; spells: string | null } | null;
}) {
  const [tab, setTab] = useState(0);
  const [roll, setRoll] = useState<string | null>(null);
  const dex = abilityModifier(scores.dexterity);
  const str = abilityModifier(scores.strength);
  const ac = acOverride ?? armorClass(dex);
  const speed = speedOverride ?? walkingSpeed();
  const bonus = proficiencyBonus(level);
  const trained = new Set<string>([...(skillId ? [skillId] : []), ...(skillIds ?? [])]);
  const recorded = new Set((recordedSkills ?? []).map((skill) => skill.toLowerCase()));
  const mark = name.trim().charAt(0).toUpperCase() || "R";
  const toward =
    showsLevelFourProgress(level) && levelFourCompleted != null
      ? levelFourProgress(levelFourCompleted, levelFourRequired)
      : null;

  function show(index: number) {
    setTab((index + TABS.length) % TABS.length);
  }

  function onKeys(event: KeyboardEvent<HTMLDivElement>) {
    const index = Number((event.target as HTMLElement).dataset.index);
    const delta = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (!delta || !Number.isInteger(index)) return;
    event.preventDefault();
    const next = (index + delta + TABS.length) % TABS.length;
    show(next);
    event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus();
  }

  function offer(expression: string) {
    setRoll(expression);
  }

  function trainedSkill(skill: (typeof SHEET_SKILLS)[number]): boolean {
    return (
      trained.has(skill.id) ||
      recorded.has(skill.name.toLowerCase()) ||
      recorded.has(skillLabel(skill.id).toLowerCase()) ||
      recorded.has(skill.id)
    );
  }

  const overview = (
    <article className="paper sheet-doc">
      <div className="sheet-id">
        <div className="level-ring" aria-hidden="true">
          <svg viewBox="0 0 96 96">
            <circle cx="48" cy="48" r="40" className="ring-track" />
            <circle cx="48" cy="48" r="40" className="ring-value" />
            <text x="48" y="56" textAnchor="middle">
              {mark}
            </text>
          </svg>
        </div>
        <div>
          <h2 className="sheet-name">{name}</h2>
          <p className="sheet-rank">{classLabel}</p>
          <p className="sheet-level">
            Level {level}
            {toward ? ` · Toward level 4 · ${toward.label}` : null}
          </p>
          <p className="sheet-note">Progress ring is a placeholder.</p>
        </div>
      </div>
      <div className="stat-row">
        {(
          [
            ["hp", String(hp), "HP"],
            ["ac", String(ac), "AC"],
            ["speed", String(speed), "Speed"],
          ] as const
        ).map(([id, value, label]) => (
          <div key={id} className="stat-chip">
            <div className="stat-value">{value}</div>
            <Term id={id}>{label}</Term>
          </div>
        ))}
      </div>
      <p className="sheet-note">
        <Term id="initiative">Initiative {formatModifier(dex + initiativeBonus)}</Term>
        {initiativeNote ? <span> · {initiativeNote}</span> : null}
        {saves && saves.length > 0 ? (
          <>
            {" · "}
            <Term id="saves">Saves {saves.join(", ")}</Term>
          </>
        ) : null}
      </p>
      <h3 className="sheet-abilities-title">Your six abilities</h3>
      <p className="sheet-note">Your real life builds these. Tap a name to learn more.</p>
      <ul className="crest-grid">
        {ABILITIES.map((ability) => {
          const crest = CRESTS[ability];
          const modifier = abilityModifier(scores[ability]);
          return (
            <li key={ability} className="crest">
              <Term id={crest.id}>{crest.label}</Term>
              <div className="crest-mod">{formatModifier(modifier)}</div>
              <div className="crest-score">Score {scores[ability]}</div>
              <p>{crest.meaning}</p>
              <span className="built-tag">Built by {crest.built}</span>
            </li>
          );
        })}
      </ul>
    </article>
  );

  const skills = (
    <article className="paper">
      <p className="sheet-note">Trained skills are highlighted. Roll adds your number to a d20.</p>
      {ABILITIES.map((ability) => {
        const crest = CRESTS[ability];
        const rows = SHEET_SKILLS.filter((skill) => skill.ability === ability);
        if (rows.length === 0) return null;
        return (
          <section key={ability} className="skill-group">
            <div className="skill-head">
              <h3>{crest.label}</h3>
              <span>{crest.built}</span>
            </div>
            <ul>
              {rows.map((skill) => {
                const mod = abilityModifier(scores[skill.ability]) + (trainedSkill(skill) ? bonus : 0);
                const expression = checkExpression(mod);
                return (
                  <li key={skill.id} className={trainedSkill(skill) ? "skill-row trained" : "skill-row"}>
                    <span>
                      {skillLabel(skill.id)}
                      {trainedSkill(skill) ? <span className="trained-pill">Trained</span> : null}
                    </span>
                    <span className="skill-mod">{formatModifier(mod)}</span>
                    <button type="button" className="roll-btn" onClick={() => offer(expression)}>
                      Roll
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </article>
  );

  const gear = (
    <div className="flex flex-col gap-3">
      <article className="paper">
        {(recordedAttacks ?? []).length > 0 ? (
          recordedAttacks!.map((attack) => (
            <button key={attack} className="secondary" type="button" onClick={() => offer(checkExpression(str))}>
              {attack}
            </button>
          ))
        ) : (
          <EmptyState title="No attacks on the sheet yet">
            <p>More attacks arrive at induction.</p>
            <button className="secondary" type="button" onClick={() => offer(checkExpression(str))}>
              Unarmed strike · {checkExpression(str)}
            </button>
          </EmptyState>
        )}
      </article>
      <article className="paper">{inventory}</article>
    </div>
  );

  const story = (
    <div className="flex flex-col gap-3">
      {level >= 3 ? (
        <article className="paper">
          <h3>Subclass</h3>
          {subclass?.name ? <p>{subclass.name}</p> : <p className="sheet-note">Your DM records a subclass here.</p>}
          {subclass?.features ? <p>{subclass.features}</p> : null}
          {subclass?.spells ? <p>Spells: {subclass.spells}</p> : null}
        </article>
      ) : null}
      <article className="paper">
        {(recordedFeatures ?? []).map((feature) => (
          <p key={feature}>{feature}</p>
        ))}
        {(recordedSpells ?? []).length > 0 ? <p>Spells: {(recordedSpells ?? []).join(", ")}</p> : null}
        {(recordedFeats ?? []).length > 0 ? <p>Feats: {(recordedFeats ?? []).join(", ")}</p> : null}
        {(conflicts ?? []).length > 0 ? (
          <div>
            <p className="font-bold">Recorded conflicts</p>
            {(conflicts ?? []).map((flag) => (
              <p key={flag} className="text-mute">
                {flag}
              </p>
            ))}
          </div>
        ) : null}
        {features}
      </article>
      <article className="paper">{npcs}</article>
    </div>
  );

  const progressPanel = (
    <div className="flex flex-col gap-3">
      {showsMilestoneLevels(level) && milestone ? <article className="paper">{milestone}</article> : null}
      {toward ? (
        <article className="paper">
          <p className="eyebrow">Toward level 4</p>
          <p className="progress-fraction">{toward.label}</p>
          <p>Completed short-term goals.</p>
        </article>
      ) : null}
      {progress}
    </div>
  );

  const panels = [overview, skills, gear, story, progressPanel];

  return (
    <div className="span-all flex flex-col gap-4">
      <div role="tablist" aria-label="Sheet sections" className="segmented" onKeyDown={onKeys}>
        {TABS.map((label, index) => (
          <button
            key={label}
            role="tab"
            type="button"
            aria-selected={tab === index}
            data-index={index}
            className={tab === index ? "is-on" : undefined}
            onClick={() => show(index)}
          >
            {label}
          </button>
        ))}
      </div>
      {panels.map((panel, index) => (
        <section key={TABS[index]} role="tabpanel" aria-label={TABS[index]} hidden={tab !== index}>
          {panel}
        </section>
      ))}
      {roll ? (
        <section className="card">
          <h2>Roll</h2>
          <DiceRoller initialExpression={roll} />
        </section>
      ) : null}
    </div>
  );
}
