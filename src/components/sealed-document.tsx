import { KIND_LABEL, type InWorldDocument } from "@/lib/documents";
import { Signature } from "./signature";
import { WaxSeal } from "./wax-seal";

export function SealedDocument({ document }: { document: InWorldDocument }) {
  return (
    <article className="paper sealed-document" data-testid="sealed-document">
      <p className="eyebrow">{KIND_LABEL[document.kind]}</p>
      <h2>{document.title}</h2>
      {document.paragraphs.map((paragraph) => (
        <p key={paragraph}>{paragraph}</p>
      ))}
      <div className="seal-row">
        <Signature signerId={document.signature.signerId} name={document.signature.name} />
        <WaxSeal
          factionId={document.seal.factionId}
          makerId={document.seal.makerId}
          genuine={document.seal.genuine}
          deviations={document.seal.deviations}
        />
      </div>
    </article>
  );
}
