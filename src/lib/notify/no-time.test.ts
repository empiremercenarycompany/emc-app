import { describe, expect, it } from "vitest";
import { NO_TIME_SUBJECT, OWNER_ALERT_EMAIL, noTimeNotice } from "./no-time";
import { noticeBody } from "./signup-fields";

describe("no Saturday time alert", () => {
  it("emails the owner and does not describe a player refund", () => {
    expect(OWNER_ALERT_EMAIL).toBe("empiremercenarycompany@gmail.com");
    expect(NO_TIME_SUBJECT).toBe("No Saturday time available");
    const text = noticeBody(
      noTimeNotice({ email: "recruit@example.test", name: "Recruit Example", table: "Saturday mornings" }),
    );
    expect(text).toContain("Email: recruit@example.test");
    expect(text).toContain("the owner does that manually outside the app");
    expect(text).toContain("The player is not emailed");
    expect(text.toLowerCase()).not.toContain("you will be refunded");
    expect(text.toLowerCase()).not.toContain("refund button");
  });
});
