import { Page, Panel } from "@/components/ui";

export default function AboutPage() {
  return (
    <Page badge tour="about" title="About" lede="A squad, a story, and a reason to keep showing up.">
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
        <p>Body text is Nunito Sans. Headlines, buttons, and labels are Bebas Neue. The sign-off is the one Corleone accent, when that file is present.</p>
        <p className="text-mute">The Sirath journal uses EB Garamond.</p>
      </Panel>
    </Page>
  );
}
