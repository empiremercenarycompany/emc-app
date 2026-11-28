import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { confirmedShieldmatePair } from "./shieldmate-pair";

const USER = "11111111-1111-4111-8111-111111111111";

function client(options: {
  rows?: { paired_at: string; expires_at: string }[];
  rowError?: boolean;
}): SupabaseClient {
  return {
    from() {
      return {
        select() {
          return {
            eq() {
              return {
                or() {
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
  it("is true only when the invite was accepted before it expired", async () => {
    const yes = await confirmedShieldmatePair(
      client({
        rows: [{ paired_at: "2026-11-20T00:00:00.000Z", expires_at: "2026-12-04T00:00:00.000Z" }],
      }),
      USER,
    );
    expect(yes).toBe(true);
    expect(
      await confirmedShieldmatePair(
        client({
          rows: [{ paired_at: "2026-12-05T00:00:00.000Z", expires_at: "2026-12-04T00:00:00.000Z" }],
        }),
        USER,
      ),
    ).toBe(false);
    expect(await confirmedShieldmatePair(client({ rows: [] }), USER)).toBe(false);
    expect(await confirmedShieldmatePair(client({ rowError: true }), USER)).toBe(false);
    expect(await confirmedShieldmatePair(client({ rows: [] }), "not-a-user")).toBe(false);
  });
});
