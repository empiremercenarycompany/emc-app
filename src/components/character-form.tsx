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
import {
  automaticGrantLabels,
  creationChoices,
  grantLabel,
  grantPicksMissing,
  resolveCreationGrants,
  type ProficiencyChoice,
  type ProficiencyOption,
} from "@/lib/rules/proficiency-grants";
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

export function CharacterForm({
  species,
  initialStep = 0,
  initialBackgroundId = "farmer",
}: {
  species: { id: string; name: string }[];
  initialStep?: Step;
  initialBackgroundId?: string;
}) {
  const [step, setStep] = useState<Step>(initialStep);
  const [name, setName] = useState("");
  const [pronouns, setPronouns] = useState("");
  const [backgroundId, setBackgroundId] = useState(initialBackgroundId);
  const background = backgroundById(backgroundId) ?? BACKGROUNDS[0];
  const [toolId, setToolId] = useState(background.tools[0]);
  const [speciesId, setSpeciesId] = useState(species.find((row) => row.id === "human")?.id ?? species[0]?.id ?? "");
  const [mode, setMode] = useState<"plus1" | "plus2">("plus1");
  const [plus2, setPlus2] = useState<AbilityName>(background.abilities[0]);
  const [plus1, setPlus1] = useState<AbilityName>(background.abilities[1]);
  const [featPicks, setFeatPicks] = useState<string[]>([]);
  const [speciesPick, setSpeciesPick] = useState("");
  const [problem, setProblem] = useState<string | null>(null);

  function chooseBackground(id: string) {
    const next = backgroundById(id);
    if (!next) return;
    setBackgroundId(id);
    setToolId(next.tools[0]);
    setPlus2(next.abilities[0]);
    setPlus1(next.abilities[1]);
    setFeatPicks([]);
    setSpeciesPick("");
  }

  function chooseTool(id: string) {
    setToolId(id);
    setFeatPicks((current) => current.map((pick) => (pick === `tool:${id}` ? "" : pick)));
  }

  const scores = useMemo(
    () => recruitScores(mode, background.abilities, plus2, plus1),
    [mode, background, plus2, plus1],
  );
  const choice = background.tools.length > 1;
  const toolForGrant = choice ? toolId : background.tools[0];
  const formChoices = creationChoices({
    backgroundId: background.id,
    speciesId,
    toolId: toolForGrant,
    featPicks,
  });
  const featGrant = formChoices.find((row) => row.key === "feat") ?? null;
  const speciesGrant = formChoices.find((row) => row.key === "species") ?? null;
  const grantInput = {
    backgroundId: background.id,
    speciesId,
    toolId: toolForGrant,
    featPicks,
    speciesPick,
  };
  const missing = [
    ...papersMissing({
      name,
      species: speciesId,
      backgroundId: background.id,
      scores,
    }),
    ...grantPicksMissing(grantInput),
  ];
  const ready = missing.length === 0;

  function stepProblem(current: Step): string | null {
    if (current === 0 && !name.trim()) return "Add your name.";
    if (current === 1) return grantPicksMissing(grantInput, "feat")[0] ?? null;
    if (current === 2 && !speciesId) return "Choose your people.";
    if (current === 2) return grantPicksMissing(grantInput, "species")[0] ?? null;
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
      if (human) {
        setSpeciesId(human.id);
        const next = creationChoices({
          backgroundId: background.id,
          speciesId: human.id,
          toolId: toolForGrant,
          featPicks,
        }).find((row) => row.key === "species");
        setSpeciesPick(next?.options[0]?.token ?? "");
      }
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
      <input type="hidden" name="species_pick" value={speciesPick} />
      {featPicks.map((pick, index) => (
        <input key={`feat-pick-${index}`} type="hidden" name="feat_pick" value={pick} />
      ))}

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
                onChange={(event) => chooseTool(event.target.value)}
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
          {featGrant ? (
            <ProficiencySelects
              choice={featGrant}
              values={featPicks}
              onChange={(index, token) => {
                setFeatPicks((current) => {
                  const next = Array.from({ length: featGrant.count }, (_, item) => current[item] ?? "");
                  next[index] = token;
                  return next;
                });
                if (token && token === speciesPick) setSpeciesPick("");
              }}
            />
          ) : null}
          {automaticGrantLabels(background.feat).map((label) => (
            <p key={label}>
              Weapon <span className="chip">{label}</span>
            </p>
          ))}
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
                  onClick={() => {
                    if (row.id === speciesId) return;
                    setSpeciesId(row.id);
                    setSpeciesPick("");
                  }}
                >
                  <SpeciesMark letter={label.charAt(0)} />
                  <span>{label}</span>
                  <span className="text-mute">{speciesBlurb(row.id)}</span>
                </button>
              );
            })}
          </div>
          {speciesGrant ? (
            <ProficiencySelects
              choice={speciesGrant}
              values={[speciesPick]}
              onChange={(_index, token) => setSpeciesPick(token)}
            />
          ) : null}
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
          <p>{background.feat}</p>
          <ReviewGrants
            backgroundSkills={background.skills}
            toolId={toolForGrant}
            feat={background.feat}
            grants={resolveCreationGrants(grantInput)}
          />
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

const PICK_ORDINALS = ["First", "Second", "Third"];

function ProficiencySelects({
  choice,
  values,
  onChange,
}: {
  choice: ProficiencyChoice;
  values: string[];
  onChange: (index: number, token: string) => void;
}) {
  const taken = new Set(values.filter(Boolean));
  const groups = [...new Set(choice.options.map((option) => option.group))];
  return (
    <div
      className="flex flex-col gap-3"
      data-testid={choice.key === "feat" ? "feat-proficiency-picks" : "species-proficiency-pick"}
    >
      <p id={`${choice.key}-proficiency-label`}>{choice.prompt}</p>
      {choice.options.length === 0 ? (
        <p role="alert">Leave a skill open. Those are already on your papers.</p>
      ) : (
        Array.from({ length: choice.count }, (_, index) => {
          const value = values[index] ?? "";
          const label = choice.count === 1 ? "Skill" : (PICK_ORDINALS[index] ?? `Choice ${index + 1}`);
          return (
            <label key={`${choice.key}-${index}`}>
              {label}
              <select
                aria-label={choice.count === 1 ? choice.prompt : `${label}. ${choice.prompt}`}
                value={value}
                onChange={(event) => onChange(index, event.target.value)}
              >
                <option value="">Choose</option>
                {groups.length < 2
                  ? choice.options.map((option) => (
                      <PickOption key={option.token} option={option} value={value} taken={taken} />
                    ))
                  : groups.map((group) => (
                      <optgroup key={group} label={group}>
                        {choice.options
                          .filter((option) => option.group === group)
                          .map((option) => (
                            <PickOption key={option.token} option={option} value={value} taken={taken} />
                          ))}
                      </optgroup>
                    ))}
              </select>
            </label>
          );
        })
      )}
    </div>
  );
}

function PickOption({
  option,
  value,
  taken,
}: {
  option: ProficiencyOption;
  value: string;
  taken: Set<string>;
}) {
  return (
    <option value={option.token} disabled={option.token !== value && taken.has(option.token)}>
      {option.label}
    </option>
  );
}

function ReviewGrants({
  backgroundSkills,
  toolId,
  feat,
  grants,
}: {
  backgroundSkills: readonly string[];
  toolId: string;
  feat: string;
  grants: ReturnType<typeof resolveCreationGrants>;
}) {
  const skills = [
    ...backgroundSkills.map((id) => skillLabel(id)),
    ...(grants.ok ? grants.skills.map((id) => skillLabel(id)) : []),
  ];
  const tools = [
    grantLabel(`tool:${toolId}`),
    ...(grants.ok ? grants.tools.map((id) => grantLabel(`tool:${id}`)) : []),
  ];
  const languages = grants.ok ? grants.languages.map((id) => grantLabel(`language:${id}`)) : [];
  const weapons = grants.ok ? grants.weapons.map((id) => grantLabel(`weapon:${id}`)) : automaticGrantLabels(feat);
  return (
    <>
      {skills.length > 0 ? <p>{skills.join(", ")}</p> : null}
      {tools.length > 0 ? <p>{tools.join(", ")}</p> : null}
      {languages.length > 0 ? <p>{languages.join(", ")}</p> : null}
      {weapons.length > 0 ? <p>{weapons.join(", ")}</p> : null}
    </>
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
