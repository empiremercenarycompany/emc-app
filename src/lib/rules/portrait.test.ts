import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  PORTRAIT_MAX_UPLOAD,
  isPortraitObjectPath,
  portraitExtension,
  portraitObjectName,
  portraitRejection,
} from "./portrait";

describe("character portraits", () => {
  const id = "55555555-5555-4555-8555-555555555552";

  it("accepts jpeg, png, and webp under 2MB and rejects the rest", () => {
    expect(portraitRejection({ type: "image/jpeg", size: 1000 })).toBeNull();
    expect(portraitRejection({ type: "image/png", size: PORTRAIT_MAX_UPLOAD })).toBeNull();
    expect(portraitRejection({ type: "image/webp", size: 300 * 1024 })).toBeNull();
    expect(portraitRejection({ type: "image/gif", size: 1000 })).toBe("Use a JPEG, PNG, or WebP.");
    expect(portraitRejection({ type: "image/jpeg", size: PORTRAIT_MAX_UPLOAD + 1 })).toBe("That image is over 2MB.");
    expect(portraitRejection({ type: "image/png", size: 0 })).toBe("That image is empty.");
  });

  it("keeps the file under the character's own folder", () => {
    expect(portraitObjectName(id, "webp")).toBe(`${id}/portrait.webp`);
    expect(portraitObjectName("../other", "jpg")).toBeNull();
    expect(portraitExtension("image/jpeg")).toBe("jpg");
    expect(isPortraitObjectPath(`${id}/portrait.webp`)).toBe(true);
    expect(isPortraitObjectPath(`${id}/notes.html`)).toBe(false);
    expect(isPortraitObjectPath("https://example.test/portrait.webp")).toBe(false);
  });

  it("ships a private bucket with a 2MB cap", () => {
    const sql = readFileSync(
      path.resolve(__dirname, "../../../supabase/migrations/20261104140000_character_portraits_private.sql"),
      "utf8",
    );
    expect(sql).toContain("public = false");
    expect(sql).toContain("2097152");
    expect(sql).toContain("image/webp");
    expect(sql).toContain("owns_character");
    expect(sql).toContain("is_staff()");
    expect(sql).not.toMatch(/for select[\s\S]{0,80}using \(bucket_id = 'character-portraits'\)/);
  });
});
