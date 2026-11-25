"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import type { TourStop } from "@/content/tour";
import {
  hasSeenTour,
  markTourSeen,
  playerStops,
  samePlace,
  scrollBehavior,
  shouldAutoStart,
} from "@/lib/tour";

const TOUR_EVENT = "emc-start-tour";

export function TourReplay({ className, onStart }: { className?: string; onStart?: () => void }) {
  return (
    <button
      type="button"
      className={className ?? "tour-replay"}
      onClick={() => {
        onStart?.();
        window.dispatchEvent(new Event(TOUR_EVENT));
      }}
    >
      Take the tour
    </button>
  );
}

export function TourHost({ userId, level }: { userId: string | null; level: number | null }) {
  const router = useRouter();
  const pathname = usePathname() || "/";
  const search = useSearchParams();
  const query = search.toString();
  const stops = playerStops(level);
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const stop = stops[index] ?? stops[0];

  useEffect(() => {
    function onReplay() {
      setIndex(0);
      setOpen(true);
    }
    window.addEventListener(TOUR_EVENT, onReplay);
    return () => window.removeEventListener(TOUR_EVENT, onReplay);
  }, []);

  useEffect(() => {
    if (open || !userId) return;
    let seen = false;
    try {
      seen = hasSeenTour(window.localStorage, userId);
    } catch {
      seen = false;
    }
    if (!shouldAutoStart({ userId, pathname, seen })) return;
    setIndex(0);
    setOpen(true);
  }, [open, pathname, userId]);

  useEffect(() => {
    if (!open || !stop) return;
    if (samePlace(pathname, query, stop.route)) return;
    router.push(stop.route);
  }, [open, pathname, query, router, stop]);

  if (!open || !stop) return null;

  function close(remember: boolean) {
    if (remember && userId) {
      try {
        markTourSeen(window.localStorage, userId);
      } catch {
        /* the walk still closes */
      }
    }
    setOpen(false);
    const menu = document.querySelector<HTMLElement>('button[aria-label="Menu"]');
    menu?.focus();
  }

  function go(nextIndex: number) {
    setIndex(Math.max(0, Math.min(stops.length - 1, nextIndex)));
  }

  return (
    <TourCard
      stop={stop}
      index={index}
      total={stops.length}
      onBack={() => go(index - 1)}
      onNext={() => {
        if (index >= stops.length - 1) close(true);
        else go(index + 1);
      }}
      onSkip={() => close(true)}
    />
  );
}

type TourFrame = {
  dock: "top" | "bottom" | "center";
  spot: { top: number; left: number; width: number; height: number } | null;
};

function TourCard({
  stop,
  index,
  total,
  onBack,
  onNext,
  onSkip,
}: {
  stop: TourStop;
  index: number;
  total: number;
  onBack: () => void;
  onNext: () => void;
  onSkip: () => void;
}) {
  const pathname = usePathname() || "/";
  const query = useSearchParams().toString();
  const titleId = useId();
  const cardRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [frame, setFrame] = useState<TourFrame>({ dock: "center", spot: null });
  const onRoute = samePlace(pathname, query, stop.route);

  useEffect(() => {
    const heading = headingRef.current;
    heading?.focus();
  }, [stop.id]);

  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;
    function focusable() {
      return [...card!.querySelectorAll<HTMLElement>("button:not([disabled]), a[href]")].filter(
        (el) => !el.hasAttribute("disabled"),
      );
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        onSkip();
        return;
      }
      if (event.key !== "Tab") return;
      const items = focusable();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onSkip, stop.id]);

  useEffect(() => {
    const blocked = [...document.querySelectorAll<HTMLElement>("header.app-header, nav.tab-bar, #main, .feedback-fab, .help-banner, .menu-overlay")];
    for (const node of blocked) node.setAttribute("inert", "");
    return () => {
      for (const node of blocked) node.removeAttribute("inert");
    };
  }, []);

  useEffect(() => {
    if (!stop.target || !onRoute) {
      setFrame({ dock: "center", spot: null });
      return;
    }
    const selector = `[data-tour="${CSS.escape(stop.target)}"]`;
    let timer = 0;
    let raf = 0;
    let tries = 0;

    function measure(el: HTMLElement, scrollFirst: boolean) {
      let box = el.getBoundingClientRect();
      if (scrollFirst && (box.top < 76 || box.top > window.innerHeight * 0.42)) {
        window.scrollBy({ top: box.top - 96, behavior: scrollBehavior(true) });
        box = el.getBoundingClientRect();
      }
      if (box.width < 1 && box.height < 1) {
        setFrame({ dock: "center", spot: null });
        return;
      }
      const pad = 6;
      const spot = {
        top: Math.max(4, box.top - pad),
        left: Math.max(4, box.left - pad),
        width: box.width + pad * 2,
        height: box.height + pad * 2,
      };
      const dock = box.top < window.innerHeight * 0.48 ? "bottom" : "top";
      setFrame((prev) => {
        if (
          prev.dock === dock &&
          prev.spot &&
          Math.abs(prev.spot.top - spot.top) < 1 &&
          Math.abs(prev.spot.left - spot.left) < 1 &&
          Math.abs(prev.spot.width - spot.width) < 1 &&
          Math.abs(prev.spot.height - spot.height) < 1
        ) {
          return prev;
        }
        return { dock, spot };
      });
    }

    function look() {
      const el = document.querySelector(selector);
      if (!(el instanceof HTMLElement)) {
        if (tries < 24) {
          tries += 1;
          timer = window.setTimeout(look, 50);
          return;
        }
        setFrame({ dock: "center", spot: null });
        return;
      }
      measure(el, true);
    }

    function onMove() {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const el = document.querySelector(selector);
        if (el instanceof HTMLElement) measure(el, false);
      });
    }

    look();
    window.addEventListener("scroll", onMove, { passive: true, capture: true });
    window.addEventListener("resize", onMove);
    return () => {
      window.clearTimeout(timer);
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onMove, true);
      window.removeEventListener("resize", onMove);
    };
  }, [onRoute, stop.target, stop.id]);

  const counter = `${index + 1} of ${total}`;

  return (
    <div className="tour-layer">
      <div className="tour-shade" hidden={frame.spot != null} />
      {frame.spot ? (
        <div
          className="tour-spot"
          data-tour-spot={stop.target ?? ""}
          style={{ top: frame.spot.top, left: frame.spot.left, width: frame.spot.width, height: frame.spot.height }}
        />
      ) : null}
      <div
        ref={cardRef}
        className="tour-card"
        data-dock={frame.dock}
        data-tour-step={stop.id}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="tour-scroll" aria-live="polite" aria-atomic="true">
          <p className="tour-kicker">Alexandria</p>
          <h2 id={titleId} ref={headingRef} tabIndex={-1}>
            {stop.title}
          </h2>
          {stop.lines ? (
            stop.lines.map((line) => <p key={line}>{line}</p>)
          ) : (
            <>
              <h3>Show</h3>
              <p>{stop.show}</p>
              <h3>Why it helps</h3>
              <p>{stop.why}</p>
              <h3>How to use it</h3>
              <p>{stop.how}</p>
            </>
          )}
        </div>
        <div className="tour-foot">
          <p className="tour-count">{counter}</p>
          <div className="tour-actions">
            <button type="button" className="secondary" onClick={onBack} disabled={index === 0}>
              Back
            </button>
            <button type="button" className="secondary" onClick={onSkip}>
              Skip tour
            </button>
            <button type="button" className="primary" onClick={onNext}>
              Next
            </button>
          </div>
          <p className="tour-sign">Alexandria</p>
        </div>
      </div>
    </div>
  );
}
