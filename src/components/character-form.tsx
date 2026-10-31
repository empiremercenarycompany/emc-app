"use client";

import { useMemo, useState } from "react";
import { ResultForm } from "@/components/result-form";
import { Term } from "@/components/term";
import { createCharacter } from "@/lib/actions/character";
import {
  BACKGROUND_BLURB,
  BACKGROUNDS,
  TOOL_LABELS,
  backgroundById,
  papersMissing,
  recruitScores,
  shownScore,
  toolChoiceLabel,
} from "@/lib/rules/backgrounds";
import { skillLabel } from "@/lib/rules/skill-names";
import { speciesBlurb } from "@/lib/rules/species-blurbs";
import { speciesLabel } from "@/lib/rules/species-names";
import { ABILITIES, type AbilityName } from "@/lib/rules/starting-array";

const SHORT: Record<AbilityName, string> = {
  strength: "STR",
  dexterity: "DEX",
  constitution: "CON",
  intelligence: "INT",
  wisdom: "WIS",
  charisma: "CHA",
};

const ABILITY_PLAIN: Record<AbilityName, string> = {
  strength: "Strength: lifting, carrying, hitting hard",
  dexterity: "Dexterity: moving, dodging, keeping your balance",
  constitution: "Constitution: stamina, recovery, staying healthy",
  intelligence: "Intelligence: study, memory, figuring things out",
  wisdom: "Wisdom: noticing, patience, reading a room",
  charisma: "Charisma: talking, leading, making a friend",
};

type Step = 0 | 1 | 2 | 3 | 4;

export function CharacterForm({ species }: { species: { id: string; name: string }[] }) {
  const [step, setStep] = useState<Step>(0);
  const [name, setName] = useState("");
  const [pronouns, setPronouns] = useState("");
  const [backgroundId, setBackgroundId] = useState("farmer");
  const background = backgroundById(backgroundId) ?? BACKGROUNDS[0];
  const [toolId, setToolId] = useState(background.tools[0]);
  const [speciesId, setSpeciesId] = useState(species.find((row) => row.id === "human")?.id ?? species[0]?.id ?? "");
  const [mode, setMode] = useState<"plus1" | "plus2">("plus1");
  const [plus2, setPlus2] = useState<AbilityName>(background.abilities[0]);
  const [plus1, setPlus1] = useState<AbilityName>(background.abilities[1]);
  const [problem, setProblem] = useState<string | null>(null);

  function chooseBackground(id: string) {
    const next = backgroundById(id);
    if (!next) return;
    setBackgroundId(id);
    setToolId(next.tools[0]);
    setPlus2(next.abilities[0]);
    setPlus1(next.abilities[1]);
  }

  const scores = useMemo(
    () => recruitScores(mode, background.abilities, plus2, plus1),
    [mode, background, plus2, plus1],
  );
  const choice = background.tools.length > 1;
  const missing = papersMissing({
    name,
    species: speciesId,
    backgroundId: background.id,
    scores,
  });
  const ready = missing.length === 0;

  function stepProblem(current: Step): string | null {
    if (current === 0 && !name.trim()) return "Add your name.";
    if (current === 2 && !speciesId) return "Choose your people.";
    if (current === 3 && !scores) return "Pick two different abilities.";
    return null;
  }

  function next() {
    const issue = stepProblem(step);
    if (issue) {
      setProblem(issue);
      return;
    }
    setProblem(null);
    setStep((current) => Math.min(4, current + 1) as Step);
  }

  function pickForMe() {
    if (step === 0) {
      if (!name.trim()) setName("Recruit");
      setProblem(null);
      return;
    }
    if (step === 1) {
      chooseBackground("farmer");
      return;
    }
    if (step === 2) {
      const human = species.find((row) => row.id === "human") ?? species[0];
      if (human) setSpeciesId(human.id);
      setProblem(null);
      return;
    }
    if (step === 3) {
      setMode("plus1");
      setProblem(null);
    }
  }

  return (
    <ResultForm
      action={createCharacter}
      submit="Sign the Papers"
      primary
      showSubmit={step === 4}
      allowSubmit={step === 4 && ready}
      submitDisabled={!ready}
    >
      <p className="text-mute">{step === 4 ? "Review your papers" : `Step ${step + 1} of 4`}</p>
      <div className="progress" aria-hidden="true">
        <span style={{ width: `${((Math.min(step, 3) + 1) / 4) * 100}%` }} />
      </div>
      <input type="hidden" name="name" value={name} />
      <input type="hidden" name="pronouns" value={pronouns} />
      <input type="hidden" name="species" value={speciesId} />
      <input type="hidden" name="background_id" value={background.id} />
      <input type="hidden" name="tool_id" value={choice ? toolId : background.tools[0]} />
      <input type="hidden" name="bonus_mode" value={mode} />
      <input type="hidden" name="plus2" value={plus2} />
      <input type="hidden" name="plus1" value={plus1} />

      {step === 0 ? (
        <section className="flex flex-col gap-3">
          <h2>Who you are</h2>
          <label>
            Name
            <input
              name="shown_name"
              required
              maxLength={80}
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          <label>
            Pronouns, if you want them
            <input
              name="shown_pronouns"
              maxLength={40}
              value={pronouns}
              onChange={(event) => setPronouns(event.target.value)}
            />
          </label>
        </section>
      ) : null}

      {step === 1 ? (
        <section className="flex flex-col gap-3">
          <h2>Your past</h2>
          <label>
            Background
            <select aria-label="Background" value={background.id} onChange={(event) => chooseBackground(event.target.value)}>
              {BACKGROUNDS.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.name}
                </option>
              ))}
            </select>
          </label>
          <p>{BACKGROUND_BLURB[background.id]}</p>
          <div>
            <p id="skills-label">Skills</p>
            <ul className="chip-row" aria-labelledby="skills-label">
              {background.skills.map((skill) => (
                <li key={skill} className="chip">
                  {skillLabel(skill)} <Term id="trained">Trained</Term>
                </li>
              ))}
            </ul>
          </div>
          {choice ? (
            <label>
              {toolChoiceLabel(background.toolChoice ?? "artisan")}
              <select
                aria-label={toolChoiceLabel(background.toolChoice ?? "artisan")}
                value={toolId}
                onChange={(event) => setToolId(event.target.value)}
              >
                {background.tools.map((id) => (
                  <option key={id} value={id}>
                    {TOOL_LABELS[id] ?? id}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <p>
              Tool <span className="chip">{TOOL_LABELS[background.tools[0]] ?? background.tools[0]}</span>
            </p>
          )}
          <p>
            Feat <span className="chip">{background.feat}</span> <Term id="feat" />
          </p>
        </section>
      ) : null}

      {step === 2 ? (
        <section className="flex flex-col gap-3">
          <h2>Your people</h2>
          {species.length === 0 ? <p className="text-mute">Sign in so the Company can list your people.</p> : null}
          <div className="species-grid" role="radiogroup" aria-label="Species">
            {species.map((row) => {
              const label = speciesLabel(row.id, row.name);
              const selected = speciesId === row.id;
              return (
                <button
                  key={row.id}
                  type="button"
                  className={selected ? "species-card primary" : "species-card secondary"}
                  aria-pressed={selected}
                  onClick={() => setSpeciesId(row.id)}
                >
                  <SpeciesMark letter={label.charAt(0)} />
                  <span>{label}</span>
                  <span className="text-mute">{speciesBlurb(row.id)}</span>
                </button>
              );
            })}
          </div>
        </section>
      ) : null}

      {step === 3 ? (
        <section className="flex flex-col gap-3">
          <h2>Where do you start strongest?</h2>
          <div role="radiogroup" aria-label="Ability bonus">
            <label className="choice">
              <input type="radio" name="shown_mode" checked={mode === "plus1"} onChange={() => setMode("plus1")} />
              <span className="choice-mark radio" aria-hidden="true" />
              <span className="choice-label">+1 to all three</span>
            </label>
            <label className="choice">
              <input type="radio" name="shown_mode" checked={mode === "plus2"} onChange={() => setMode("plus2")} />
              <span className="choice-mark radio" aria-hidden="true" />
              <span className="choice-label">+2 to one, +1 to another</span>
            </label>
          </div>
          {mode === "plus1" ? (
            <ul className="flex flex-col gap-2">
              {background.abilities.map((ability) => (
                <li key={ability} className="ability-card">
                  {ABILITY_PLAIN[ability]}
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex flex-col gap-3">
              <ChipRow label="+2" value={plus2} options={background.abilities} onChange={setPlus2} blocked={plus1} />
              <ChipRow label="+1" value={plus1} options={background.abilities} onChange={setPlus1} blocked={plus2} />
            </div>
          )}
          <p className="text-mute">
            {mode === "plus1"
              ? "These three start one step higher. That is the whole bonus."
              : "Put the two bonuses on different abilities."}
          </p>
          <ul className="ability-row" data-testid="score-preview">
            {ABILITIES.map((ability) => (
              <li key={ability} className="stat">
                {SHORT[ability]} {shownScore(scores, ability)}
              </li>
            ))}
          </ul>
          {scores ? null : (
            <p role="alert">Pick two different abilities.</p>
          )}
        </section>
      ) : null}

      {step === 4 ? (
        <section className="flex flex-col gap-3">
          <h2>Review</h2>
          <p>
            {name}
            {pronouns ? ` · ${pronouns}` : ""}
          </p>
          <p>
            {background.name}. {BACKGROUND_BLURB[background.id]}
          </p>
          <p>{background.skills.map((skill) => skillLabel(skill)).join(", ")}</p>
          <p>{TOOL_LABELS[choice ? toolId : background.tools[0]] ?? toolId}</p>
          <p>{background.feat}</p>
          <p>{speciesLabel(speciesId, species.find((row) => row.id === speciesId)?.name)}</p>
          <ul className="ability-row" data-testid="score-preview">
            {ABILITIES.map((ability) => (
              <li key={ability} className="stat">
                {SHORT[ability]} {shownScore(scores, ability)}
              </li>
            ))}
          </ul>
          <p>When you sign, the Company welcomes you to Bleakspire.</p>
          {missing.length > 0 ? (
            <ul>
              {missing.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}

      {problem ? <p role="alert">{problem}</p> : null}
      <div className="flex flex-wrap gap-2">
        {step > 0 ? (
          <button type="button" className="secondary" onClick={() => { setProblem(null); setStep((current) => Math.max(0, current - 1) as Step); }}>
            Back
          </button>
        ) : null}
        {step < 4 ? (
          <button type="button" onClick={next}>
            Next
          </button>
        ) : null}
        <button type="button" className="secondary" onClick={pickForMe}>
          Not sure? Pick for me
        </button>
      </div>
    </ResultForm>
  );
}

function SpeciesMark({ letter }: { letter: string }) {
  return (
    <svg className="species-mark" viewBox="0 0 48 48" aria-hidden="true">
      <rect x="3" y="3" width="42" height="42" fill="none" stroke="currentColor" strokeWidth="2" />
      <text x="24" y="31" textAnchor="middle" fill="currentColor" fontSize="18">
        {letter}
      </text>
    </svg>
  );
}

function ChipRow({
  label,
  value,
  options,
  onChange,
  blocked,
}: {
  label: string;
  value: AbilityName;
  options: readonly AbilityName[];
  onChange: (ability: AbilityName) => void;
  blocked: AbilityName;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label={label}>
      <span className="stat">{label}</span>
      {options.map((ability) => (
        <button
          key={ability}
          type="button"
          className="secondary"
          aria-pressed={value === ability}
          disabled={ability === blocked}
          onClick={() => onChange(ability)}
        >
          {SHORT[ability]}
        </button>
      ))}
    </div>
  );
}
