export const PORTRAIT_BUCKET = "character-portraits";
export const PORTRAIT_EDGE = 512;
export const PORTRAIT_MAX_STORED = 300 * 1024;
export const PORTRAIT_MAX_UPLOAD = 2 * 1024 * 1024;

const MIME = ["image/jpeg", "image/png", "image/webp"] as const;
export type PortraitMime = (typeof MIME)[number];

const OBJECT_PATH =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/portrait\.(webp|jpe?g|png)$/i;

export function portraitRejection(file: { type: string; size: number }): string | null {
  if (!MIME.includes(file.type as PortraitMime)) return "Use a JPEG, PNG, or WebP.";
  if (file.size > PORTRAIT_MAX_UPLOAD) return "That image is over 2MB.";
  if (file.size < 1) return "That image is empty.";
  return null;
}

export function isPortraitObjectPath(value: string | null | undefined): value is string {
  return Boolean(value && OBJECT_PATH.test(value));
}

export function portraitObjectName(characterId: string, ext: "webp" | "jpg" | "png"): string | null {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(characterId)) return null;
  return `${characterId}/portrait.${ext}`;
}

export function portraitExtension(type: string): "webp" | "jpg" | "png" | null {
  if (type === "image/webp") return "webp";
  if (type === "image/png") return "png";
  if (type === "image/jpeg") return "jpg";
  return null;
}
