import { PORTRAIT_BUCKET, isPortraitObjectPath } from "@/lib/rules/portrait";

type StorageClient = {
  storage: {
    from: (bucket: string) => {
      createSignedUrl: (path: string, expiresIn: number) => Promise<{ data: { signedUrl: string } | null; error: { message: string } | null }>;
    };
  };
};

const HOUR = 60 * 60;

/** A private object path becomes a short-lived URL. A missing bucket stays a blank. */
export async function signedPortraitUrl(supabase: StorageClient, path: string | null | undefined): Promise<string | null> {
  if (!isPortraitObjectPath(path)) return null;
  const { data, error } = await supabase.storage.from(PORTRAIT_BUCKET).createSignedUrl(path, HOUR);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

export async function signedPortraitMap(
  supabase: StorageClient,
  paths: { id: string; path: string | null | undefined }[],
): Promise<Map<string, string>> {
  const entries = await Promise.all(
    paths.map(async (row) => [row.id, await signedPortraitUrl(supabase, row.path)] as const),
  );
  return new Map(entries.filter((entry): entry is [string, string] => Boolean(entry[1])));
}
