"use client";

import { useEffect } from "react";

/** Headlines are Bebas Neue. Corleone Due is the sign-off accent only, and only when that file is present. */
export function DisplayFace() {
  useEffect(() => {
    let cancel = false;
    const mark = () => {
      if (cancel) return;
      const due = document.fonts.check('400 16px "Corleone Due"');
      const regular = document.fonts.check('400 16px "Corleone"');
      if (due || regular) document.documentElement.dataset.displayFace = "corleone";
    };
    void Promise.allSettled([
      document.fonts.load('400 16px "Corleone Due"'),
      document.fonts.load('400 16px "Corleone"'),
    ]).then(mark);
    void document.fonts.ready.then(mark);
    return () => {
      cancel = true;
    };
  }, []);
  return null;
}
