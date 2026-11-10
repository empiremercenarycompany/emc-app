import { ResultForm } from "@/components/result-form";
import type { DmTable } from "@/lib/dm/load";
import type { ActionResult } from "@/lib/types";

export function DmBoard({
  action,
  ...table
}: DmTable & { action: (formData: FormData) => Promise<ActionResult> }) {
  return (
    <div className="dm-grid">
      <div className="dm-pick">
        {table.sessionsFailed ? (
          <p className="dm-empty">Sessions could not be loaded.</p>
        ) : table.sessions.length === 0 ? (
          <p className="dm-empty">No sessions yet.</p>
        ) : (
          <form method="get" action="/dm" className="dm-filters">
            <label>
              Session
              <select name="session" defaultValue={table.sessionId}>
                {table.sessions.map((session) => (
                  <option key={session.id} value={session.id}>
                    {session.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Skill
              <select name="skill" defaultValue={table.skillId}>
                <option value="">Choose a skill</option>
                {table.skills.map((skill) => (
                  <option key={skill.id} value={skill.id}>
                    {skill.label}
                  </option>
                ))}
              </select>
            </label>
            <button className="secondary" type="submit">
              Show
            </button>
          </form>
        )}
      </div>

      <details className="dm-panel dm-players" open>
        <summary>
          <span className="dm-label">Players</span>
          <span className="dm-chev" aria-hidden="true">
            ▾
          </span>
        </summary>
        <div className="dm-body">
          <p className="dm-empty">Character names checked in or counted at muster.</p>
          {table.rosterFailed ? (
            <p className="dm-empty">The roster could not be loaded.</p>
          ) : table.attendees.length === 0 ? (
            <p className="dm-empty">No one is checked in for this session.</p>
          ) : (
            <ul className="dm-stack">
              {table.attendees.map((person) => (
                <li key={person.id} className="dm-card">
                  <p className="dm-name">{person.name}</p>
                  <p className="dm-sub">
                    {person.classLabel} · Level {person.level}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </details>

      <details className="dm-panel dm-skill" open>
        <summary>
          <span className="dm-label">Skill</span>
          <span className="dm-chev" aria-hidden="true">
            ▾
          </span>
        </summary>
        <div className="dm-body">
          {table.skillId ? (
            <>
              <p className="dm-k">Trained in {table.skillLabel}</p>
              <p className="dm-k">At the table</p>
              <NameList people={table.proficient} />
              <p className="dm-k">NPCs</p>
              <NameList people={table.npcProficient} />
            </>
          ) : (
            <p className="dm-empty">Choose a skill to see who at this table is trained in it.</p>
          )}
        </div>
      </details>

      <details className="dm-panel dm-npcs">
        <summary>
          <span className="dm-label">NPCs</span>
          <span className="dm-chev" aria-hidden="true">
            ▾
          </span>
        </summary>
        <div className="dm-body">
          {table.npcState === "missing" ? (
            <p className="dm-empty">NPC dossiers are not in the company book yet.</p>
          ) : table.npcState === "failed" ? (
            <p className="dm-empty">NPC dossiers could not be loaded.</p>
          ) : table.npcs.length === 0 ? (
            <p className="dm-empty">No NPC dossiers yet. Blank fields stay blank. Example rows are marked example.</p>
          ) : (
            <ul className="dm-stack">
              {table.npcs.map((npc) => (
                <li key={npc.id} className="dm-card">
                  <p className="dm-name">
                    {npc.name}
                    {npc.example ? <span className="dm-example"> Example</span> : null}
                    {npc.dmOnly ? <span className="dm-flag"> DM only</span> : null}
                  </p>
                  <Field label="Description" value={npc.description} />
                  <Field label="Personality" value={npc.personality} />
                  <Field label="Voice" value={npc.voice} />
                  <Field label="Looks" value={npc.looks} />
                  <Banter lines={npc.banter} />
                  <Field label="Encounters" value={npc.encounters} />
                  <Field label="Secrets" value={npc.secrets} />
                  {npc.trained.length > 0 ? (
                    <p>
                      {npc.trained.map((label) => (
                        <span key={label} className="dm-chip">
                          {label}
                        </span>
                      ))}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      </details>

      <details className="dm-panel dm-notes">
        <summary>
          <span className="dm-label">Notes</span>
          <span className="dm-chev" aria-hidden="true">
            ▾
          </span>
        </summary>
        <div className="dm-body">
          <p className="dm-empty">Players do not see these notes.</p>
          {table.sessionId ? (
            <ResultForm action={action} submit="Save note" secondary done="Saved.">
              <input type="hidden" name="session_id" value={table.sessionId} />
              <textarea name="body" required maxLength={4000} placeholder="Note" />
            </ResultForm>
          ) : (
            <p className="dm-empty">No session yet.</p>
          )}
          {table.notesFailed ? (
            <p className="dm-empty">Notes could not be loaded.</p>
          ) : table.notes.length === 0 ? (
            <p className="dm-empty">No notes for this session.</p>
          ) : (
            <ul className="dm-stack">
              {table.notes.map((note) => (
                <li key={note.id} className="dm-card">
                  <p>{note.body}</p>
                  {note.createdAt ? <p className="dm-k">{note.createdAt.slice(0, 10)}</p> : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      </details>
    </div>
  );
}

function NameList({ people }: { people: { name: string; example: boolean }[] }) {
  if (people.length === 0) return <p className="dm-empty">None</p>;
  return (
    <ul className="dm-names">
      {people.map((person, index) => (
        <li key={`${person.name}-${index}`}>
          {person.name}
          {person.example ? <span className="dm-example"> Example</span> : null}
        </li>
      ))}
    </ul>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  const text = value.trim();
  if (!text) return null;
  return (
    <p>
      <span className="dm-k">{label}</span> {text}
    </p>
  );
}

function Banter({ lines }: { lines: string[] }) {
  const kept = lines.map((line) => line.trim()).filter((line) => line.length > 0);
  if (kept.length === 0) return null;
  return (
    <div>
      <p className="dm-k">Banter</p>
      <ul>
        {kept.map((line, index) => (
          <li key={`${line}-${index}`}>{line}</li>
        ))}
      </ul>
    </div>
  );
}
