import { resolveSeal } from "@/lib/seals/resolve";
import type { SealDeviations } from "@/lib/seals/types";
import "./seals.css";

export function WaxSeal({
  factionId,
  makerId,
  genuine,
  deviations,
  size = "document",
}: {
  factionId: string;
  makerId?: string;
  /** DM-only. Never written into the DOM. */
  genuine?: boolean;
  deviations?: SealDeviations;
  size?: "document" | "reference";
}) {
  const seal = resolveSeal({
    factionId,
    makerId,
    genuine,
    deviations,
    reference: size === "reference",
  });
  if (!seal) return null;
  return (
    <svg
      className={size === "reference" ? "wax-seal wax-seal-reference" : "wax-seal"}
      viewBox="0 0 200 210"
      role="img"
      aria-label={seal.label}
      data-testid="wax-seal"
      data-faction={seal.factionId}
      data-size={size}
    >
      <title>{seal.label}</title>
      <path d={seal.drip} fill={seal.wax} />
      <path d={seal.body} fill={seal.wax} stroke={seal.rim} strokeWidth="3" />
      <ellipse cx="78" cy="78" rx="28" ry="14" fill={seal.highlight} opacity="0.55" />
      <g transform={`rotate(${seal.rotation} 100 100)`}>
        {seal.impression.kind === "path" ? (
          <path
            d={seal.impression.d}
            transform="translate(76 76) scale(2)"
            fill="none"
            stroke={seal.rim}
            strokeWidth="1.4"
          />
        ) : (
          <>
            <circle cx="100" cy="100" r="36" fill="none" stroke={seal.rim} strokeWidth="3" />
            <circle cx="100" cy="100" r="26" fill="none" stroke={seal.rim} strokeWidth="1.5" />
          </>
        )}
      </g>
      {seal.makerMark.kind === "notch" ? (
        <MakerMark angle={seal.makerMark.angle} glyph={seal.makerMark.glyph} color={seal.rim} />
      ) : null}
    </svg>
  );
}

function MakerMark({ angle, glyph, color }: { angle: number; glyph: number; color: string }) {
  return (
    <g transform={`rotate(${angle} 100 100)`} aria-hidden="true">
      <path d="M100 28 L106 40 L94 40 Z" fill={color} />
      <g transform="translate(14 10)">
        <Glyph glyph={glyph} color={color} />
      </g>
    </g>
  );
}

function Glyph({ glyph, color }: { glyph: number; color: string }) {
  if (glyph === 0) return <circle cx="100" cy="100" r="3.5" fill={color} />;
  if (glyph === 1) return <path d="M92 100 H108" stroke={color} strokeWidth="2.5" />;
  if (glyph === 2) return <path d="M94 104 L100 94 L106 104" fill="none" stroke={color} strokeWidth="2.5" />;
  if (glyph === 3) return <path d="M100 92 V108" stroke={color} strokeWidth="2.5" />;
  return <rect x="96" y="96" width="8" height="8" fill="none" stroke={color} strokeWidth="2" />;
}
