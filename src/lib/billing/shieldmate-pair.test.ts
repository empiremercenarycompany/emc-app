import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { confirmedShieldmatePair } from "./shieldmate-pair";

const USER = "11111111-1111-4111-8111-111111111111";
const CHARACTER = "22222222-2222-4222-8222-222222222222";

function client(options: {
  characterId?: string | null;
  characterError?: boolean;
  rows?: { id: string }[];
  rowError?: boolean;
  onFilter?: (filter: string) => void;
}): SupabaseClient {
  return {
    from(table: string) {
      return {
        select() {
          return {
            eq(column: string, value: string) {
              if (table === "characters") {
                return {
                  maybeSingle: async () => ({
                    data: options.characterError ? null : options.characterId ? { id: options.characterId } : null,
                    error: options.characterError ? { message: "missing" } : null,
                  }),
                };
              }
              return {
                or(filter: string) {
                  options.onFilter?.(filter);
                  expect(column).toBe("status");
                  expect(value).toBe("approved");
                  return {
                    limit: async () => ({
                      data: options.rowError ? null : (options.rows ?? []),
                      error: options.rowError ? { message: "missing" } : null,
                    }),
                  };
                },
              };
            },
          };
        },
      };
    },
  } as unknown as SupabaseClient;
}

describe("confirmed Shieldmate pair", () => {
  it("is true only for this player's approved request", async () => {
    const seen: string[] = [];
    const yes = await confirmedShieldmatePair(
      client({ characterId: CHARACTER, rows: [{ id: "row" }], onFilter: (filter) => seen.push(filter) }),
      USER,
    );
    expect(yes).toBe(true);
    expect(seen[0]).toContain(`requested_by.eq.${USER}`);
    expect(seen[0]).toContain(`partner_character_id.eq.${CHARACTER}`);

    expect(await confirmedShieldmatePair(client({ characterId: CHARACTER, rows: [] }), USER)).toBe(false);
    expect(await confirmedShieldmatePair(client({ characterError: true, rows: [{ id: "row" }] }), USER)).toBe(false);
    expect(await confirmedShieldmatePair(client({ characterId: CHARACTER, rowError: true }), USER)).toBe(false);
    expect(await confirmedShieldmatePair(client({ rows: [{ id: "row" }] }), "not-a-user")).toBe(false);
  });
});
