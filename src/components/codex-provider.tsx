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

function helpKey(userId: string | null): string {
  return userId ? `emc-help:${userId}` : "emc-help:signed-out";
}

export function CodexProviders({
  beginner,
  userId,
  children,
}: {
  beginner: boolean;
  userId: string | null;
  children: ReactNode;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [help, setHelp] = useState(false);
  const key = helpKey(userId);

  useEffect(() => {
    setHelp(window.sessionStorage.getItem(key) === "on");
  }, [key]);

  useEffect(() => {
    document.documentElement.dataset.help = help ? "on" : "off";
    document.documentElement.dataset.beginner = beginner ? "on" : "off";
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
    <HelpContext.Provider
      value={{
        help,
        toggle: () =>
          setHelp((value) => {
            const next = !value;
            window.sessionStorage.setItem(key, next ? "on" : "off");
            return next;
          }),
      }}
    >
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
