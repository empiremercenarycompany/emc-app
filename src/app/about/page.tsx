import { Page, Panel } from "@/components/ui";

export default function AboutPage() {
  return (
    <Page badge title="About" lede="A squad, a story, and a reason to keep showing up.">
      <Panel title="The Company">
        <p>Train. Record. Advance.</p>
        <p>Bleakspire is a fortress with a small city around it.</p>
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
        <p>Body text is Barlow. Buttons and labels are Barlow Condensed. Both are under the SIL Open Font License.</p>
        <p className="text-mute">
          Screen titles use Corleone when the file is on this machine, and Barlow Condensed 800 when it is not. The font file is not in this repo.
        </p>
      </Panel>
    </Page>
  );
}
