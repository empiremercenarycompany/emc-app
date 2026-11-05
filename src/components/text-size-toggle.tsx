"use client";

import { useEffect, useState } from "react";

const KEY = "emc-text";

export function TextSizeToggle() {
  const [large, setLarge] = useState(false);

  useEffect(() => {
    const on = window.localStorage.getItem(KEY) === "large";
    setLarge(on);
    document.documentElement.dataset.font = on ? "large" : "barlow";
  }, []);

  function toggle() {
    const next = !large;
    setLarge(next);
    document.documentElement.dataset.font = next ? "large" : "barlow";
    window.localStorage.setItem(KEY, next ? "large" : "barlow");
  }

  return (
    <button type="button" className="secondary" aria-pressed={large} onClick={toggle}>
      {large ? "Larger text is on" : "Larger text"}
    </button>
  );
}
