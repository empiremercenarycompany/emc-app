import { Page, Panel } from "@/components/ui";

export default function AboutPage() {
  return (
    <Page title="About" lede="Train. Record. Advance.">
      <Panel title="The book">
        <p>Build Your Legend. Become the Hero.</p>
        <p>
          Setting name: Bleakspire. Place description is not written in this app. TODO(lore: check with Sage/Master Canon)
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
        <p>Body text is League Spartan, under the SIL Open Font License.</p>
        <p className="text-mute">
          Headings are meant to use Corleone. That license is not cleared, so the file is not shipped. League Spartan is
          the fallback. TODO(John): Corleone license.
        </p>
      </Panel>
    </Page>
  );
}
