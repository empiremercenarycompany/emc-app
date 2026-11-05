"use client";

import { useEffect, useState } from "react";

type InstallPrompt = Event & { prompt: () => Promise<void> };

export function InstallHelp() {
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);

  useEffect(() => {
    function onPrompt(event: Event) {
      event.preventDefault();
      setPrompt(event as InstallPrompt);
    }
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  return (
    <section className="card flex flex-col gap-3">
      <h2>Add the app</h2>
      {prompt ? (
        <button
          type="button"
          className="primary"
          onClick={() => {
            void prompt.prompt();
          }}
        >
          Install
        </button>
      ) : (
        <p>On iPhone: Share, then Add to Home Screen.</p>
      )}
      <p className="text-mute">If you are offline, a saved page opens. Pages you have not opened yet wait for a signal.</p>
    </section>
  );
}
