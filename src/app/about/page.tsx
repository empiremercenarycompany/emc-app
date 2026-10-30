import { Page, Panel } from "@/components/ui";

export default function AboutPage() {
  return (
    <Page title="About" lede="A squad, a story, and a reason to keep showing up.">
      <Panel title="The Company">
        <p>Train. Record. Advance.</p>
        <p>
          Bleakspire is a fortress with a small city around it.
        </p>
        <p className="text-mute">Skill labels come from company config. A rename of one label is still open.</p>
      </Panel>
      <Panel title="Rules source">
        <p>
          Species names, skill names, and tool names marked srd-5.2 are from the System Reference Document 5.2 by Wizards
          of the Coast LLC, licensed under Creative Commons Attribution 4.0 International (CC BY 4.0).
        </p>
        <p>
          <a href="https://creativecommons.org/licenses/by/4.0/">creativecommons.org/licenses/by/4.0</a>
        </p>
        <p>Homebrew rows use their own source and attribution columns. This app does not copy rules text.</p>
      </Panel>
      <Panel title="Type">
        <p>Body text is Barlow. Subheads, buttons, and labels are Barlow Condensed. Both are under the SIL Open Font License.</p>
        <p className="text-mute">
          Big titles use Barlow Condensed. Corleone is a local file only, and only when the switch asks for it. That file is not in this repo.
        </p>
      </Panel>
    </Page>
  );
}
