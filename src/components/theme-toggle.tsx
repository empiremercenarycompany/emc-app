"use client";

import { useLayoutEffect, useSyncExternalStore } from "react";
import { THEME_CHOICES, THEME_KEY, applyTheme, parseThemeChoice, type ThemeChoice } from "@/lib/theme";

function subscribe(onStoreChange: () => void) {
  window.addEventListener("emc-theme", onStoreChange);
  window.addEventListener("storage", onStoreChange);
  return () => {
    window.removeEventListener("emc-theme", onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

function readChoice(): ThemeChoice {
  try {
    return parseThemeChoice(window.localStorage.getItem(THEME_KEY));
  } catch {
    return "system";
  }
}

function prefersDark() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function paint(choice: ThemeChoice) {
  const metas = Array.from(document.querySelectorAll('meta[name="theme-color"]'));
  applyTheme(choice, prefersDark(), document.documentElement, metas);
}

/** Keeps the root attribute in sync after hydration, including a system change. */
export function ThemeSync() {
  useLayoutEffect(() => {
    paint(readChoice());
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onMedia = () => {
      if (readChoice() === "system") paint("system");
    };
    const onChoice = () => paint(readChoice());
    media.addEventListener("change", onMedia);
    window.addEventListener("emc-theme", onChoice);
    return () => {
      media.removeEventListener("change", onMedia);
      window.removeEventListener("emc-theme", onChoice);
    };
  }, []);
  return null;
}

const LABEL: Record<ThemeChoice, string> = {
  system: "System",
  light: "Light",
  dark: "Dark",
};

export function ThemeToggle() {
  const choice = useSyncExternalStore(subscribe, readChoice, () => "system" as ThemeChoice);

  function choose(next: ThemeChoice) {
    try {
      window.localStorage.setItem(THEME_KEY, next);
    } catch {
      /* private mode still paints for this visit */
    }
    paint(next);
    window.dispatchEvent(new Event("emc-theme"));
  }

  return (
    <div className="theme-toggle" role="radiogroup" aria-label="Theme">
      {THEME_CHOICES.map((item) => (
        <button key={item} type="button" role="radio" aria-checked={choice === item} onClick={() => choose(item)}>
          {LABEL[item]}
        </button>
      ))}
    </div>
  );
}
