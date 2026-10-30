import { LogoSlot } from "@/components/ui";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-lg px-4 py-10">
      <LogoSlot />
      <h1 className="mt-4 text-4xl">Missing page</h1>
      <p className="mt-3 text-mute">That path is not in the Company book.</p>
      <p className="signoff">Go forth and conquer.</p>
    </main>
  );
}
