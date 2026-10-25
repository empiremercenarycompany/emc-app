"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { actionClient, dbError } from "@/lib/action-client";
import { publishBlockReason } from "@/lib/rules/library";
import type { ActionResult } from "@/lib/types";

async function guildId(supabase: NonNullable<Awaited<ReturnType<typeof actionClient>>["supabase"]>, userId: string) {
  const { data } = await supabase.from("guild_memberships").select("guild_id").eq("user_id", userId).maybeSingle();
  return data?.guild_id as string | undefined;
}

export async function saveDrill(formData: FormData): Promise<ActionResult> {
  const { supabase, user, error } = await actionClient();
  if (!supabase || !user || error) return { error: error ?? "Sign in first." };
  const guild = await guildId(supabase, user.id);
  if (!guild) return { error: "Join the company before editing the library." };

  const components = formData.getAll("components").map(String);
  const equipment = ["functional", "full_gym", "at_home"] as const;
  const versions = equipment.map((key) => ({
    equipment: key,
    instructions: String(formData.get(`instructions_${key}`) ?? "").trim(),
  }));
  const filled = versions.filter((version) => version.instructions.length > 0);
  const publish = formData.get("publish") === "on";
  if (publish) {
    const reason = publishBlockReason({
      attribute: String(formData.get("attribute") ?? ""),
      components,
      equipment: filled.map((version) => version.equipment),
    });
    if (reason) return { error: reason };
  }

  const { data: drill, error: insertError } = await supabase
    .from("workout_library")
    .insert({
      guild_id: guild,
      title: String(formData.get("title") ?? "").trim(),
      attribute: String(formData.get("attribute") ?? ""),
      tier: String(formData.get("tier") ?? "recruit"),
      components,
      published: false,
      author_id: user.id,
    })
    .select("id")
    .single();
  const message = dbError(insertError);
  if (message || !drill) return { error: message ?? "The drill was not saved." };

  if (filled.length > 0) {
    const { error: versionError } = await supabase.from("workout_versions").insert(
      filled.map((version) => ({
        workout_id: drill.id,
        equipment: version.equipment,
        instructions: version.instructions,
        exercises: [],
      })),
    );
    const versionMessage = dbError(versionError);
    if (versionMessage) return { error: versionMessage };
  }

  if (publish) {
    const { error: publishError } = await supabase.from("workout_library").update({ published: true }).eq("id", drill.id);
    const publishMessage = dbError(publishError);
    if (publishMessage) return { error: publishMessage };
  }

  revalidatePath("/library");
  revalidatePath("/work");
  redirect("/library");
}

export async function setPublished(formData: FormData): Promise<ActionResult> {
  const { supabase, error } = await actionClient();
  if (!supabase || error) return { error: error ?? "Sign in first." };
  const { error: updateError } = await supabase
    .from("workout_library")
    .update({ published: formData.get("published") === "true" })
    .eq("id", String(formData.get("id")));
  const message = dbError(updateError);
  if (message) return { error: message };
  revalidatePath("/library");
  revalidatePath("/work");
  return { ok: true };
}
