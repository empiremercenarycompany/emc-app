import { GenuineSeal } from "@/components/genuine-seal";
import { SealedDocument } from "@/components/sealed-document";
import { Page } from "@/components/ui";
import { COMPANY_DOCUMENTS } from "@/lib/documents";

export default function DocumentsPage() {
  const factions = [...new Set(COMPANY_DOCUMENTS.map((document) => document.seal.factionId))];
  return (
    <Page inWorld title="Papers" lede="What the Company has signed.">
      {COMPANY_DOCUMENTS.map((document) => (
        <SealedDocument key={document.id} document={document} />
      ))}
      {factions.map((factionId) => (
        <GenuineSeal key={factionId} factionId={factionId} framed />
      ))}
    </Page>
  );
}
