import { describe, expect, it } from "vitest";
import {
  emptyPublicAvailability,
  publicAvailabilityFromRows,
  publicAvailabilityHeaders,
  publicAvailabilityOrigin,
  PUBLIC_AVAILABILITY_PATH,
} from "./public-availability";

describe("public Saturday availability", () => {
  it("is a no-login GET at one path", () => {
    expect(PUBLIC_AVAILABILITY_PATH).toBe("/api/availability");
  });

  it("returns only the three site slot keys and clock labels", () => {
    const body = publicAvailabilityFromRows([
      { timeslot_id: "morning", open: 6 },
      { timeslot_id: "morning", open: 2 },
      { timeslot_id: "afternoon", open: 0 },
      { timeslot_id: "daytime", open: 1 },
      { timeslot_id: "evening", open: 0 },
    ]);
    expect(Object.keys(body)).toEqual(["slots"]);
    expect(Object.keys(body.slots)).toEqual(["morning", "afternoon", "evening"]);
    expect(body.slots.morning).toEqual({ open: true, label: "9 AM–12 PM", seats_open: 8 });
    expect(body.slots.afternoon).toEqual({ open: true, label: "2–5 PM", seats_open: 1 });
    expect(body.slots.evening).toEqual({ open: false, label: "7–10 PM", seats_open: 0 });
    expect(JSON.stringify(body)).not.toMatch(/email|squad|name|@/i);
    expect(body.slots.morning.label).toBe("9 AM\u201312 PM");
  });

  it("stays closed when the count is missing", () => {
    expect(emptyPublicAvailability().slots.morning).toEqual({ open: false, label: "9 AM–12 PM", seats_open: 0 });
  });

  it("allows the company site and that team's Vercel previews", () => {
    expect(publicAvailabilityOrigin("https://empiremercenarycompany.com")).toBe("https://empiremercenarycompany.com");
    expect(publicAvailabilityOrigin("https://emc-site-git-main-empiremercenarycompany-7134.vercel.app")).toBe(
      "https://emc-site-git-main-empiremercenarycompany-7134.vercel.app",
    );
    expect(publicAvailabilityOrigin("https://empiremercenarycompany-7134.vercel.app")).toBe(
      "https://empiremercenarycompany-7134.vercel.app",
    );
    expect(publicAvailabilityOrigin("https://evil.vercel.app")).toBeNull();
    expect(publicAvailabilityOrigin("https://empiremercenarycompany.com.evil.test")).toBeNull();
    expect(publicAvailabilityOrigin("http://empiremercenarycompany.com")).toBeNull();
    expect(publicAvailabilityOrigin("https://other-team.vercel.app")).toBeNull();
  });

  it("caches a successful read for about 30 seconds and varies on origin", () => {
    const headers = publicAvailabilityHeaders("https://empiremercenarycompany.com", true);
    expect(headers["Cache-Control"]).toBe("public, max-age=30, s-maxage=30");
    expect(headers["Vercel-CDN-Cache-Control"]).toBe("public, s-maxage=30");
    expect(headers.Vary).toBe("Origin");
    expect(headers["Access-Control-Allow-Origin"]).toBe("https://empiremercenarycompany.com");
    expect(headers["Access-Control-Allow-Methods"]).toBe("GET, OPTIONS");
    expect(publicAvailabilityHeaders("https://evil.example", true)["Access-Control-Allow-Origin"]).toBeUndefined();
    expect(publicAvailabilityHeaders(null, false)["Cache-Control"]).toBe("no-store");
  });
});
