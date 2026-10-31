import { CodexBrowser } from "@/components/codex-browser";
import { Notice, Page } from "@/components/ui";
import { loadViewer, setupMessage } from "@/lib/company";
import { visibleCodex } from "@/lib/rules/codex";

export default async function CodexPage() {
  const viewer = await loadViewer();
  const setup = setupMessage(viewer);
  return (
    <Page hero title="The Company Codex" lede="Plain answers" mark={false}>
      {setup ? <Notice>{setup}</Notice> : null}
      <p className="span-all text-center">Every word in the app, explained.</p>
      {viewer.beginner ? (
        <Notice>Dotted words open a plain meaning. Help mode, the ? in the header, outlines every one of them.</Notice>
      ) : null}
      <CodexBrowser terms={visibleCodex()} />
    </Page>
  );
}
