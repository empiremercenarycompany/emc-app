import { describe, expect, it } from "vitest";
import { TOUR_STOPS } from "@/content/tour";
import {
  hasSeenTour,
  isBlockedTourRoute,
  markTourSeen,
  samePlace,
  scrollBehavior,
  shouldAutoStart,
  shouldOpenTour,
  tourSeenKey,
  visibleStops,
} from "./tour";

function memory() {
  const map = new Map<string, string>();
  return {
    getItem(key: string) {
      return map.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      map.set(key, value);
    },
  };
}

describe("tour seen once, then replay", () => {
  it("keys the flag by user id and stays unseen until the walk is closed", () => {
    const store = memory();
    expect(tourSeenKey("user-1")).toBe("emc-tour-seen:user-1");
    expect(hasSeenTour(store, "user-1")).toBe(false);
    expect(shouldAutoStart({ userId: "user-1", pathname: "/", seen: false })).toBe(true);
    expect(shouldAutoStart({ userId: "user-1", pathname: "/goals", seen: false })).toBe(false);
    expect(shouldAutoStart({ userId: null, pathname: "/", seen: false })).toBe(false);

    markTourSeen(store, "user-1");
    expect(hasSeenTour(store, "user-1")).toBe(true);
    expect(hasSeenTour(store, "user-2")).toBe(false);
    expect(shouldAutoStart({ userId: "user-1", pathname: "/", seen: true })).toBe(false);
  });

  it("lets a replay open after the walk was marked seen, including signed out", () => {
    expect(shouldOpenTour({ userId: "user-1", pathname: "/profile", seen: true, replay: true })).toBe(true);
    expect(shouldOpenTour({ userId: null, pathname: "/profile", seen: false, replay: true })).toBe(true);
    expect(shouldOpenTour({ userId: "user-1", pathname: "/", seen: true, replay: false })).toBe(false);
    expect(shouldOpenTour({ userId: "user-1", pathname: "/", seen: false, replay: false })).toBe(true);
  });

  it("ignores a store that throws", () => {
    const broken = {
      getItem() {
        throw new Error("private");
      },
      setItem() {
        throw new Error("private");
      },
    };
    expect(hasSeenTour(broken, "user-1")).toBe(false);
    expect(() => markTourSeen(broken, "user-1")).not.toThrow();
  });
});

describe("tour stops the player can actually open", () => {
  it("skips a level-gated stop and never walks staff, table, or dev login", () => {
    const stops = visibleStops(
      [
        ...TOUR_STOPS,
        {
          id: "long-term",
          title: "Longer goals",
          route: "/goals",
          target: "goals",
          minLevel: 3,
          show: "Later.",
          why: "Later.",
          how: "Later.",
        },
        {
          id: "trainer",
          title: "Trainer",
          route: "/trainer",
          target: null,
          show: "No.",
        },
        {
          id: "dev",
          title: "Dev",
          route: "/sign-in",
          target: null,
          show: "No.",
        },
      ],
      { level: 1 },
    );
    expect(stops.some((stop) => stop.id === "long-term")).toBe(false);
    expect(stops.some((stop) => stop.id === "goals")).toBe(true);
    expect(stops.some((stop) => stop.route.startsWith("/trainer"))).toBe(false);
    expect(stops.some((stop) => stop.route.startsWith("/sign-in"))).toBe(false);

    const ready = visibleStops(
      [{ id: "long-term", title: "Longer goals", route: "/goals", target: "goals", minLevel: 3, show: "Later." }],
      { level: 3 },
    );
    expect(ready.map((stop) => stop.id)).toEqual(["long-term"]);
    expect(visibleStops([{ id: "long-term", title: "Longer goals", route: "/goals", target: null, minLevel: 3 }], { level: null })).toEqual(
      [],
    );
  });

  it("blocks staff, table, preview, and dev routes", () => {
    expect(isBlockedTourRoute("/dm")).toBe(true);
    expect(isBlockedTourRoute("/dm/sirath")).toBe(true);
    expect(isBlockedTourRoute("/muster")).toBe(true);
    expect(isBlockedTourRoute("/trainer")).toBe(true);
    expect(isBlockedTourRoute("/notes")).toBe(true);
    expect(isBlockedTourRoute("/preview/group-goal")).toBe(true);
    expect(isBlockedTourRoute("/api/dev-login")).toBe(true);
    expect(isBlockedTourRoute("/auth/confirm")).toBe(true);
    expect(isBlockedTourRoute("/character")).toBe(false);
  });

  it("treats a query as part of the stop", () => {
    expect(samePlace("/character", "tab=progress", "/character?tab=progress")).toBe(true);
    expect(samePlace("/character", "", "/character")).toBe(true);
    expect(samePlace("/character", "tab=progress", "/character")).toBe(false);
    expect(samePlace("/", "", "/")).toBe(true);
    expect(samePlace("/goals", "", "/character")).toBe(false);
  });

  it("holds still when motion is reduced", () => {
    expect(scrollBehavior(true)).toBe("auto");
    expect(scrollBehavior(false)).toBe("smooth");
  });
});

describe("tour copy locks", () => {
  const spoken = JSON.stringify(TOUR_STOPS);

  it("keeps the approved swaps and the tagline", () => {
    const byId = Object.fromEntries(TOUR_STOPS.map((stop) => [stop.id, stop]));
    expect(byId.welcome?.lines?.join(" ")).toContain("Think of the app as our hall.");
    expect(byId.welcome?.lines?.join(" ")).toContain("I'm rather proud of that.");
    expect(byId.character?.show).toContain("This is the one sheet you'll bring to the table.");
    expect(byId.goals?.show).toContain("Plain on purpose. Fancy boards get ignored.");
    expect(byId.journal?.show).toContain("This is one I'm proud of.");
    expect(byId.sirath?.show).toContain("That's on purpose.");
    expect(byId.sirath?.show).not.toContain("I love");
    expect(byId.codex?.show).toContain("Nobody here has to pretend they know what a saving throw is.");
    expect(byId.missions?.show).toContain("Worth learning the difference now, recruit. It'll save you a frown later.");
    expect(byId.shieldmate?.show).toContain("They have fourteen days to enlist.");
    expect(byId.about?.why).toContain("and credit to the rules we play by, all in one quiet place.");
    expect(byId["sign-off"]?.lines?.join(" ")).toContain("Build Your Legend. Become the Hero.");
    expect(byId.schedule?.show).toContain("A row marked Three-parter is one session.");
    expect(byId.schedule?.show).toContain("A gap marked Off-week still lets you record work.");
    expect(byId.wayfinding?.how).toContain("Staff can read it.");
    expect(byId.progress?.why).toContain("A DM or trainer confirms the change before it locks.");
  });

  it("does not carry em dashes, pride outside the two lines, or locked-out words", () => {
    expect(spoken).not.toContain("\u2014");
    expect(spoken).not.toContain("\u2013");
    expect(spoken.toLowerCase()).not.toContain("love");
    expect(spoken.toLowerCase()).not.toContain("smug");
    expect(spoken.toLowerCase()).not.toContain("personal training");
    expect(spoken.toLowerCase()).not.toContain("referral");
    expect(spoken.toLowerCase()).not.toContain("battle master");
    expect(spoken.toLowerCase()).not.toContain("bonus");
    expect(spoken.toLowerCase()).not.toMatch(/\bpoints\b/);
    expect(spoken).not.toMatch(/\$\d/);
    expect(spoken.toLowerCase()).not.toContain("next slot");
    expect(spoken).not.toMatch(/Smith|Sage|Valthar|R-173|Corleone/);

    const proud = TOUR_STOPS.filter((stop) => JSON.stringify(stop).toLowerCase().includes("proud")).map((stop) => stop.id);
    expect(proud).toEqual(["welcome", "journal"]);
    expect(TOUR_STOPS).toHaveLength(22);
    expect(TOUR_STOPS.some((stop) => stop.id === "gates" || stop.route === "/sign-in" || stop.route.startsWith("/auth"))).toBe(false);
    expect(TOUR_STOPS.every((stop) => (stop.lines?.length ? !stop.show : Boolean(stop.show && stop.why && stop.how)))).toBe(true);
  });
});
