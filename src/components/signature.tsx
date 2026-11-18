import { signatureSize } from "@/lib/seals/signatures";
import "./seals.css";

export function Signature({ signerId, name }: { signerId: string; name: string }) {
  const trimmed = name.trim();
  if (!trimmed) return null;
  return (
    <p className="signature" style={{ fontSize: signatureSize(signerId) }} data-testid="signature" data-signer={signerId}>
      {trimmed}
    </p>
  );
}
