import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import type { NoticeField } from "./signup-fields";
import { recordVisit } from "./record-visit";

const notice: NoticeField[] = [{ label: "Email", value: "recruit@example.test" }];

function fakeClient(claim: { data: { id: string } | null; error: { message: string } | null }, seenError = false) {
  const calls: string[] = [];
  const client = {
    from: () => ({
      update: (values: Record<string, string>) => {
        const kind = "last_seen_at" in values ? "seen" : "claim";
        calls.push(kind);
        const result = kind === "seen" ? { data: null, error: seenError ? { message: "jwt secret recruit@example.test" } : null } : claim;
        const builder = {
          eq: () => builder,
          is: () => builder,
          select: () => builder,
          maybeSingle: () => Promise.resolve(result),
          then: (resolve: (value: typeof result) => unknown, reject?: (reason: unknown) => unknown) => Promise.resolve(result).then(resolve, reject),
        };
        return builder;
      },
    }),
  };
  return { client: client as unknown as SupabaseClient, calls };
}

describe("record visit", () => {
  it("updates last_seen and does not send when there is no notice", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const { client, calls } = fakeClient({ data: { id: "user-1" }, error: null });
    await recordVisit(client, "user-secret-id", null, vi.fn());
    expect(calls).toEqual(["seen"]);
    expect(error).not.toHaveBeenCalled();
    error.mockRestore();
  });

  it("sends only after the notice flag is claimed", async () => {
    const send = vi.fn(async () => {});
    const { client, calls } = fakeClient({ data: { id: "user-1" }, error: null });
    await recordVisit(client, "user-1", notice, send);
    expect(calls).toEqual(["seen", "claim"]);
    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith(notice);
  });

  it("does not send when the claim matches no row", async () => {
    const send = vi.fn();
    const { client, calls } = fakeClient({ data: null, error: null });
    await recordVisit(client, "user-1", notice, send);
    expect(calls).toEqual(["seen", "claim"]);
    expect(send).not.toHaveBeenCalled();
  });

  it("does not send or log the database error when the claim fails", async () => {
    const send = vi.fn();
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const { client } = fakeClient({ data: null, error: { message: "jwt secret recruit@example.test" } });
    await recordVisit(client, "user-secret-id", notice, send);
    expect(send).not.toHaveBeenCalled();
    expect(error.mock.calls.flat().join(" ")).toBe("Signup notice was not recorded.");
    error.mockRestore();
  });

  it("still updates last_seen when that write reports an error", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const send = vi.fn(async () => {});
    const { client, calls } = fakeClient({ data: { id: "user-1" }, error: null }, true);
    await recordVisit(client, "user-secret-id", notice, send);
    expect(calls).toEqual(["seen", "claim"]);
    expect(send).toHaveBeenCalledTimes(1);
    expect(error.mock.calls.flat().join(" ")).toBe("last_seen was not updated.");
    error.mockRestore();
  });

  it("does not throw or log the payload when the send throws", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const { client } = fakeClient({ data: { id: "user-1" }, error: null });
    await expect(
      recordVisit(client, "user-secret-id", notice, async () => {
        throw new Error("smtp secret recruit@example.test");
      }),
    ).resolves.toBeUndefined();
    const line = error.mock.calls.flat().join(" ");
    expect(line).toBe(JSON.stringify({ status: "failed", messageId: null }));
    expect(line).not.toContain("recruit@example.test");
    expect(line).not.toContain("secret");
    error.mockRestore();
  });
});
