"use client";

import { useActionState, useEffect, useState } from "react";
import { ENLIST_BACKSTORY_PROMPT, ENLIST_CITY_BLURB } from "@/content/enlist";
import { SATURDAY_TABLE_COPY } from "@/content/saturday-tables";
import { Choice } from "@/components/choice";
import { SaturdayHall } from "@/components/saturday-hall";
import { saveIntake } from "@/lib/actions/intake";
import {
  GYM_MEMBER_HELPER,
  GYM_MEMBER_OPTIONS,
  MEMBERSHIP_NUMBER_HINT,
  MEMBERSHIP_NUMBER_LABEL,
  PRICE_ONE_LINE,
  membershipNumberError,
  isGameGridSrc,
  type GymMember,
} from "@/lib/rules/public-copy";
import { AGE_BANDS, DND_LEVELS, ENLIST_LIMITS, GOAL_CHIPS, GYM_LEVELS, intakeError } from "@/lib/rules/intake";
import { SECOND_CHOICE_HINT } from "@/lib/rules/seat-choice";
import { tableRequest, type SaturdayTable } from "@/lib/rules/saturday-tables";
import type { ActionResult } from "@/lib/types";

export function IntakeForm({
  tables,
  canSave = true,
  signupSrc = "",
  initial,
}: {
  tables: SaturdayTable[];
  canSave?: boolean;
  signupSrc?: string;
  initial?: {
    dnd: string;
    gym: string;
    goals: string[];
    timeslot: string;
    tableKey?: string;
    secondKey?: string;
    age?: string;
    gymMember?: string;
    membershipNumber?: string;
    reminders: boolean;
    phone: string;
    species: string;
    classIdea: string;
    fitness: string;
    backstory: string;
    withFriend?: boolean;
    friendName?: string;
    anyOpen?: boolean;
  };
}) {
  const [dnd, setDnd] = useState(initial?.dnd ?? "never");
  const [gym, setGym] = useState(initial?.gym ?? "new");
  const [goals, setGoals] = useState<string[]>(initial?.goals ?? ["Sleep 7 hours"]);
  const [custom, setCustom] = useState("");
  const [age, setAge] = useState(initial?.age ?? "");
  const [gymMember, setGymMember] = useState<GymMember | "">(
    initial?.gymMember === "current" || initial?.gymMember === "former" || initial?.gymMember === "not_yet"
      ? initial.gymMember
      : "",
  );
  const [membershipNumber, setMembershipNumber] = useState(initial?.membershipNumber ?? "");
  const [selectedKey, setSelectedKey] = useState(
    tables.some((table) => table.key === initial?.tableKey) ? (initial?.tableKey ?? "") : "",
  );
  const [secondKey, setSecondKey] = useState(
    tables.some((table) => table.key === initial?.secondKey && table.key !== initial?.tableKey) ? (initial?.secondKey ?? "") : "",
  );
  const [withFriend, setWithFriend] = useState(initial?.withFriend ?? false);
  const [friendName, setFriendName] = useState(initial?.friendName ?? "");
  const [anyOpen, setAnyOpen] = useState(initial?.anyOpen ?? false);
  const [reminders, setReminders] = useState(initial?.reminders ?? false);
  const [writNumber, setWritNumber] = useState("");
  const [showErrors, setShowErrors] = useState(false);
  const [draftReady, setDraftReady] = useState(Boolean(initial));
  const [state, formAction, pending] = useActionState(
    async (_previous: ActionResult | null, formData: FormData) => saveIntake(formData),
    null,
  );
  const chosen = custom.trim() ? [...goals.filter((goal) => goal !== custom.trim()), custom.trim()] : goals;
  const selected = tables.find((table) => table.key === selectedKey) ?? null;
  const second = tables.find((table) => table.key === secondKey && table.key !== selectedKey) ?? null;
  const request = selected ? tableRequest(selected.seatsLeft, withFriend) : "";
  const waiting = age === "under_16";
  const gamegrid = isGameGridSrc(signupSrc);
  const errors: Record<string, string> = {};
  if (!age) errors.age = "Say your age.";
  if (!waiting && !gymMember) errors.gym_member = "Say which rate is yours.";
  if (!waiting && gymMember === "current") {
    const numberProblem = membershipNumberError(membershipNumber);
    if (numberProblem) errors.gym_membership_number = numberProblem;
  }
  const intakeProblem = intakeError({
    dnd,
    gym,
    goals: chosen,
    timeslot: waiting ? "" : (selected?.timeslotId ?? ""),
    age,
  });
  if (!waiting && !selected) errors.table = intakeProblem ?? "Pick your Saturday table.";
  if (!waiting && secondKey && secondKey === selectedKey) errors.second = "Pick a different second time.";
  else if (intakeProblem && intakeProblem !== "Pick your Saturday table." && intakeProblem !== "Say your age.") {
    errors.form = intakeProblem;
  }
  const firstError = Object.keys(errors)[0];

  useEffect(() => {
    if (initial) return;
    try {
      const raw = window.localStorage.getItem("emc-intake-draft");
      if (!raw) {
        setDraftReady(true);
        return;
      }
      const draft = JSON.parse(raw) as {
        age?: string;
        gymMember?: string;
        membershipNumber?: string;
        selectedKey?: string;
        secondKey?: string;
        withFriend?: boolean;
        friendName?: string;
        writNumber?: string;
      };
      if (draft.age) setAge(draft.age);
      if (draft.gymMember === "current" || draft.gymMember === "former" || draft.gymMember === "not_yet") {
        setGymMember(draft.gymMember);
      }
      if (draft.membershipNumber) setMembershipNumber(draft.membershipNumber);
      if (draft.selectedKey) setSelectedKey(draft.selectedKey);
      if (draft.secondKey && draft.secondKey !== draft.selectedKey) setSecondKey(draft.secondKey);
      if (draft.withFriend) setWithFriend(true);
      if (draft.friendName) setFriendName(draft.friendName);
      if (draft.writNumber) setWritNumber(draft.writNumber);
    } catch {
      // A bad draft is ignored.
    }
    setDraftReady(true);
  }, [initial]);

  useEffect(() => {
    if (!draftReady || initial) return;
    window.localStorage.setItem(
      "emc-intake-draft",
      JSON.stringify({ age, gymMember, membershipNumber, selectedKey, secondKey, withFriend, friendName, writNumber, signupSrc }),
    );
  }, [draftReady, initial, age, gymMember, membershipNumber, selectedKey, secondKey, withFriend, friendName, writNumber, signupSrc]);

  function toggleGoal(goal: string) {
    setGoals((current) => (current.includes(goal) ? current.filter((item) => item !== goal) : [...current, goal]));
  }

  return (
    <form
      action={formAction}
      className="flex flex-col gap-4 span-all"
      onSubmit={(event) => {
        if (firstError) {
          event.preventDefault();
          setShowErrors(true);
          document.getElementById(`field-${firstError}`)?.scrollIntoView({ block: "center" });
        }
      }}
    >
      <section id="enlist-details" aria-labelledby="enlist-heading" className="flex flex-col gap-4">
        <h2 id="enlist-heading">Enlist details</h2>
        <fieldset className="score-card" id="field-age">
          <legend>Age</legend>
          <div className="score-taps" role="radiogroup" aria-label="Age">
            {AGE_BANDS.map((band) => (
              <button
                key={band.id}
                type="button"
                className={age === band.id ? "primary" : "secondary"}
                aria-pressed={age === band.id}
                onClick={() => setAge(band.id)}
              >
                {band.label}
              </button>
            ))}
          </div>
          {showErrors && errors.age ? <p role="alert">{errors.age}</p> : null}
          {waiting ? <p>{SATURDAY_TABLE_COPY.under16}</p> : null}
          {age === "16_17" ? <p>{SATURDAY_TABLE_COPY.waiver16}</p> : null}
        </fieldset>
        {waiting ? null : (
        <fieldset className="score-card" id="field-gym_member">
          <legend>Which rate is yours?</legend>
          {gamegrid ? <p>{PRICE_ONE_LINE}</p> : null}
          {GYM_MEMBER_OPTIONS.map((option) => (
            <label key={option.id} className="choice">
              <input
                type="radio"
                name="gym_member"
                value={option.id}
                checked={gymMember === option.id}
                onChange={() => setGymMember(option.id)}
              />
              <span className="choice-mark radio" aria-hidden="true" />
              <span className="choice-label">{option.label}</span>
            </label>
          ))}
          <p className="text-mute">{GYM_MEMBER_HELPER}</p>
          {showErrors && errors.gym_member ? <p role="alert">{errors.gym_member}</p> : null}
          {gymMember === "current" ? (
            <label id="field-gym_membership_number">
              {MEMBERSHIP_NUMBER_LABEL}
              <input
                name="gym_membership_number"
                value={membershipNumber}
                onChange={(event) => setMembershipNumber(event.target.value)}
                maxLength={40}
                autoComplete="off"
                aria-describedby="membership-number-hint"
              />
              <p className="text-mute" id="membership-number-hint">
                {MEMBERSHIP_NUMBER_HINT}
              </p>
              {showErrors && errors.gym_membership_number ? <p role="alert">{errors.gym_membership_number}</p> : null}
            </label>
          ) : null}
        </fieldset>
        )}
        {waiting ? null : (
          <>
            <Choice checked={withFriend} onChange={setWithFriend}>
              {SATURDAY_TABLE_COPY.friendAsk}
            </Choice>
            {withFriend ? (
              <label>
                {SATURDAY_TABLE_COPY.friendName}
                <input
                  name="friend_name_field"
                  value={friendName}
                  onChange={(event) => setFriendName(event.target.value)}
                  maxLength={80}
                  autoComplete="name"
                />
              </label>
            ) : null}
            <div id="field-table">
            <SaturdayHall
              tables={tables}
              mode="pick"
              withFriend={withFriend}
              selectedKey={selectedKey}
              onSelect={(key) => {
                setSelectedKey(key);
                if (key === secondKey) setSecondKey("");
              }}
            />
            {showErrors && errors.table ? <p role="alert">{errors.table}</p> : null}
            </div>
            <label id="field-second">
              Second choice
              <select
                value={second?.key ?? ""}
                onChange={(event) => setSecondKey(event.target.value)}
                aria-describedby="second-choice-hint"
              >
                <option value="">No second time</option>
                {tables
                  .filter((table) => table.key !== selectedKey)
                  .map((table) => (
                    <option key={table.key} value={table.key}>
                      {table.label}
                    </option>
                  ))}
              </select>
              <p className="text-mute" id="second-choice-hint">
                {SECOND_CHOICE_HINT}
              </p>
              {showErrors && errors.second ? <p role="alert">{errors.second}</p> : null}
            </label>
            <Choice checked={anyOpen} onChange={setAnyOpen}>
              {SATURDAY_TABLE_COPY.anyOpen}
            </Choice>
          </>
        )}
        {waiting ? null : (
          <>
        <label>
          Phone
          <input
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            maxLength={ENLIST_LIMITS.phone}
            defaultValue={initial?.phone ?? ""}
            aria-describedby="phone-optional"
          />
        </label>
        <p className="text-mute" id="phone-optional">
          Optional.
        </p>
        <label>
          Species idea
          <input name="species" maxLength={ENLIST_LIMITS.species} defaultValue={initial?.species ?? ""} />
        </label>
        <label>
          A class you would like to grow into (optional)
          <input name="class_idea" maxLength={ENLIST_LIMITS.classIdea} defaultValue={initial?.classIdea ?? ""} />
          <p className="text-mute">You start as a commoner, grow by training, and choose a class at the week 6 ceremony.</p>
        </label>
          </>
        )}
        <fieldset className="score-card">
          <legend>Fitness goals and experience</legend>
          <p className="text-mute">Pick any that fit. You can add your own.</p>
          <div className="score-taps">
            {GOAL_CHIPS.map((goal) => (
              <button
                key={goal}
                type="button"
                className={goals.includes(goal) ? "primary" : "secondary"}
                aria-pressed={goals.includes(goal)}
                onClick={() => toggleGoal(goal)}
              >
                {goal}
              </button>
            ))}
          </div>
          <label>
            Or write your own
            <input value={custom} onChange={(event) => setCustom(event.target.value)} maxLength={80} />
          </label>
          <p className="text-mute">Gym experience</p>
          <div className="score-taps" role="radiogroup" aria-label="Gym experience">
            {GYM_LEVELS.map((level) => (
              <button
                key={level.id}
                type="button"
                className={gym === level.id ? "primary" : "secondary"}
                aria-pressed={gym === level.id}
                onClick={() => setGym(level.id)}
              >
                {level.label}
              </button>
            ))}
          </div>
          <label>
            Fitness experience
            <textarea
              name="fitness"
              rows={3}
              maxLength={ENLIST_LIMITS.fitness}
              defaultValue={initial?.fitness ?? ""}
            />
          </label>
        </fieldset>
        <fieldset className="score-card">
          <legend>D&amp;D experience</legend>
          <div className="score-taps" role="radiogroup" aria-label="D&D experience">
            {DND_LEVELS.map((level) => (
              <button
                key={level.id}
                type="button"
                className={dnd === level.id ? "primary" : "secondary"}
                aria-pressed={dnd === level.id}
                onClick={() => setDnd(level.id)}
              >
                {level.label}
              </button>
            ))}
          </div>
        </fieldset>
        {waiting ? null : (
          <>
        <p className="enlist-copy">{ENLIST_CITY_BLURB}</p>
        <p className="enlist-copy" id="backstory-prompt">
          {ENLIST_BACKSTORY_PROMPT}
        </p>
          </>
        )}
        {waiting ? null : (
        <label>
          Life before you enlisted
          <textarea
            name="backstory"
            rows={5}
            maxLength={ENLIST_LIMITS.backstory}
            aria-describedby="backstory-prompt"
            defaultValue={initial?.backstory ?? ""}
          />
        </label>
        )}
      </section>
      <Choice name="reminders" checked={reminders} onChange={setReminders}>
        Session reminders
      </Choice>
      <p className="text-mute">The Company keeps this preference. This app does not send mail.</p>
      {/* JOHN: undecided. Do not add injuries, medical info, or emergency contact until that decision is made. */}
      <p className="text-mute" data-john="undecided-intake">
        This form does not ask about injuries, medical notes, or an emergency contact.
      </p>
      <input type="hidden" name="enlist" value="1" />
      <input type="hidden" name="dnd" value={dnd} />
      <input type="hidden" name="gym" value={gym} />
      <input type="hidden" name="age" value={age} />
      <input type="hidden" name="signup_src" value={signupSrc.slice(0, 80)} />
      {gamegrid ? (
        <label id="field-writ">
          Writ number (optional)
          <input
            name="writ_number"
            value={writNumber}
            onChange={(event) => setWritNumber(event.target.value)}
            maxLength={20}
            autoComplete="off"
          />
        </label>
      ) : (
        <input type="hidden" name="writ_number" value="" />
      )}
      <input type="hidden" name="timeslot" value={waiting ? "" : (selected?.timeslotId ?? "")} />
      <input type="hidden" name="starts_on" value={waiting ? "" : (selected?.startsOn ?? "")} />
      <input type="hidden" name="second_timeslot" value={waiting ? "" : (second?.timeslotId ?? "")} />
      <input type="hidden" name="second_starts_on" value={waiting ? "" : (second?.startsOn ?? "")} />
      <input type="hidden" name="squad_id" value={waiting ? "" : (selected?.squadId ?? "")} />
      <input type="hidden" name="table_request" value={waiting ? "" : request} />
      <input type="hidden" name="with_friend" value={!waiting && withFriend ? "1" : "0"} />
      <input type="hidden" name="friend_name" value={!waiting && withFriend ? friendName : ""} />
      <input type="hidden" name="any_open" value={!waiting && anyOpen ? "1" : "0"} />
      {chosen.map((goal) => (
        <input key={goal} type="hidden" name="goal" value={goal} />
      ))}
      {showErrors && errors.form ? <p role="alert">{errors.form}</p> : null}
      <button className="primary" type="submit" disabled={pending || !canSave}>
        {pending ? "Saving" : canSave ? "Save" : "Sign in to save"}
      </button>
      {state && "error" in state ? <p role="alert">{state.error}</p> : null}
    </form>
  );
}
