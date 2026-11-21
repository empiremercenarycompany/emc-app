/** Matches `h2 { font-size: 1.35rem }` in src/app/globals.css. The subheading floor. */
export const SUBHEADING_SIZE = "1.35rem";

/**
 * Signature size by signer id. Add a line here to tune one person.
 * Anyone not listed uses `default`.
 */
export const SIGNATURE_SIZES = {
  /** Larger than body text, and at least a subheading. */
  default: "1.75rem",
  /** Valthar Brightlance. A big signature, at least a subheading. */
  valthar: "2.4rem",
} as const;

type SignerId = keyof typeof SIGNATURE_SIZES;

export function signatureSize(signerId: string): string {
  if (Object.prototype.hasOwnProperty.call(SIGNATURE_SIZES, signerId)) {
    return SIGNATURE_SIZES[signerId as SignerId];
  }
  return SIGNATURE_SIZES.default;
}

export function rem(value: string): number {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}
