"use server";

import { revalidatePath } from "next/cache";
import { actionClient, dbError } from "@/lib/action-client";
import {
  PORTRAIT_BUCKET,
  portraitExtension,
  portraitObjectName,
  portraitRejection,
} from "@/lib/rules/portrait";
import type { ActionResult } from "@/lib/types";

const CLOSED = "Portraits aren't open yet. Tell your coach in person.";

function closed(message: string): boolean {
  return /bucket|not found|character-portraits|row-level security|schema cache|does not exist/i.test(message);
}

export async function savePortrait(formData: FormData): Promise<ActionResult> {
  const { supabase, user, error } = await actionClient();
  if (!supabase || !user || error) return { error: error ?? "Sign in first." };
  const file = formData.get("portrait");
  if (!(file instanceof File)) return { error: "Choose an image." };
  const rejection = portraitRejection({ type: file.type, size: file.size });
  if (rejection) return { error: rejection };
  const ext = portraitExtension(file.type);
  const { data: character } = await supabase.from("characters").select("id").eq("user_id", user.id).maybeSingle();
  if (!character) return { error: "Create a character first." };
  const objectName = ext ? portraitObjectName(character.id, ext) : null;
  if (!objectName) return { error: "Create a character first." };
  const bytes = new Uint8Array(await file.arrayBuffer());
  const { error: uploadError } = await supabase.storage.from(PORTRAIT_BUCKET).upload(objectName, bytes, {
    upsert: true,
    contentType: file.type,
    cacheControl: "3600",
  });
  if (uploadError) {
    if (closed(uploadError.message)) return { error: CLOSED };
    return { error: dbError(uploadError) ?? CLOSED };
  }
  const siblings = ["webp", "jpg", "png"].filter((item) => item !== ext);
  await Promise.all(
    siblings.map((item) => supabase.storage.from(PORTRAIT_BUCKET).remove([`${character.id}/portrait.${item}`])),
  );
  const { error: updateError } = await supabase.from("characters").update({ portrait_url: objectName }).eq("id", character.id);
  const message = dbError(updateError);
  if (message) return { error: message };
  revalidatePath("/");
  revalidatePath("/character");
  return { ok: true };
}

export async function removePortrait(formData: FormData): Promise<ActionResult> {
  const { supabase, user, error } = await actionClient();
  if (!supabase || !user || error) return { error: error ?? "Sign in first." };
  if (String(formData.get("confirm") ?? "") !== "yes") return { error: "Confirm the delete first." };
  const { data: character } = await supabase.from("characters").select("id, portrait_url").eq("user_id", user.id).maybeSingle();
  if (!character) return { error: "Create a character first." };
  const names = ["webp", "jpg", "png"].map((ext) => `${character.id}/portrait.${ext}`);
  const { error: removeError } = await supabase.storage.from(PORTRAIT_BUCKET).remove(names);
  if (removeError && !closed(removeError.message) && !/not found/i.test(removeError.message)) {
    return { error: dbError(removeError) ?? CLOSED };
  }
  const { error: updateError } = await supabase.from("characters").update({ portrait_url: null }).eq("id", character.id);
  const message = dbError(updateError);
  if (message) return { error: message };
  revalidatePath("/");
  revalidatePath("/character");
  return { ok: true };
}
