"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { TermSheet } from "@/components/term-sheet";

type TermApi = { activeId: string | null; open: (id: string) => void; close: () => void };
type HelpApi = { help: boolean; toggle: () => void };

const TermContext = createContext<TermApi>({ activeId: null, open: () => {}, close: () => {} });
const HelpContext = createContext<HelpApi>({ help: false, toggle: () => {} });

export function useTermSheet(): TermApi {
  return useContext(TermContext);
}

export function useHelpMode(): HelpApi {
  return useContext(HelpContext);
}

export function CodexProviders({ beginner, children }: { beginner: boolean; children: ReactNode }) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [help, setHelp] = useState(false);

  useEffect(() => {
    const stored = window.sessionStorage.getItem("emc-help");
    if (stored === "on") setHelp(true);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.help = help ? "on" : "off";
    document.documentElement.dataset.beginner = beginner ? "on" : "off";
    window.sessionStorage.setItem("emc-help", help ? "on" : "off");
  }, [help, beginner]);

  useEffect(() => {
    if (!activeId) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setActiveId(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeId]);

  return (
    <HelpContext.Provider value={{ help, toggle: () => setHelp((value) => !value) }}>
      <TermContext.Provider
        value={{
          activeId,
          open: (id) => setActiveId(id),
          close: () => setActiveId(null),
        }}
      >
        {children}
        {activeId ? <TermSheet id={activeId} onClose={() => setActiveId(null)} /> : null}
      </TermContext.Provider>
    </HelpContext.Provider>
  );
}
