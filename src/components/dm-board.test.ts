import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { DmBoard } from "./dm-board";
import type { DmTable } from "@/lib/dm/load";

const table: DmTable = {
  sessions: [{ id: "11111111-1111-4111-8111-111111111111", label: "First table" }],
  sessionsFailed: false,
  sessionId: "11111111-1111-4111-8111-111111111111",
  skills: [{ id: "stealth", label: "Stealth" }],
  skillId: "stealth",
  skillLabel: "Stealth",
  attendees: [{ id: "c1", name: "Example Fighter", classLabel: "Fighter", level: 3 }],
  rosterFailed: false,
  proficient: [{ name: "Example Fighter", example: false }],
  npcProficient: [{ name: "Example NPC", example: true }],
  npcs: [
    {
      id: "n1",
      name: "Example NPC",
      description: "",
      example: true,
      dmOnly: true,
      personality: "",
      voice: "quiet",
      looks: "",
      encounters: "",
      secrets: "closed example secret",
      banter: ["example line"],
      trained: ["Stealth"],
    },
  ],
  npcState: "ready",
  notes: [],
  notesFailed: false,
};

describe("dm board", () => {
  it("shows character names, class, and a closed example dossier", () => {
    const html = renderToStaticMarkup(createElement(DmBoard, { ...table, action: async () => ({ ok: true as const }) }));
    expect(html).toContain("Example Fighter");
    expect(html).toContain("Fighter");
    expect(html).toContain("Level 3");
    expect(html).toContain("Trained in Stealth");
    expect(html).toContain("Example NPC");
    expect(html).toContain("Example");
    expect(html).toContain("DM only");
    expect(html).toContain("quiet");
    expect(html).toContain("example line");
    expect(html).toContain("closed example secret");
    expect(html).not.toContain("Personality");
    expect(html).not.toContain("Looks");
    expect(html).not.toContain("@");
  });

  it("stays blank when the npc book is missing", () => {
    const html = renderToStaticMarkup(
      createElement(DmBoard, {
        ...table,
        npcState: "missing",
        npcs: [],
        npcProficient: [],
        action: async () => ({ ok: true as const }),
      }),
    );
    expect(html).toContain("NPC dossiers are not in the company book yet.");
    expect(html).not.toContain("closed example secret");
  });
});
