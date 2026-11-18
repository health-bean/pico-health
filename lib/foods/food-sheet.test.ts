import { describe, expect, it } from "vitest";
import { logLink, meterSteps, protocolWhy } from "./food-sheet";

const spinach = { oxalate: "very_high", histamine: "moderate", histamine_liberator: true, nightshade: false, tyramine: "low" };

describe("protocolWhy", () => {
  it("explains a Limit in a plain sentence built from what's in the food", () => {
    expect(protocolWhy("Spinach", "Low Histamine", { tone: "limit", reasons: ["histamine"] }, spinach)).toBe(
      "On Low Histamine. Spinach has some histamine and can make your body release more."
    );
  });

  it("says 'a lot of' for high and very high", () => {
    expect(protocolWhy("Salami", "Low Histamine", { tone: "avoid", reasons: ["tyramine"] }, { tyramine: "very_high" })).toBe(
      "On Low Histamine. Salami has a lot of tyramine."
    );
  });

  it("names a yes/no property plainly", () => {
    expect(protocolWhy("Tomato", "AIP", { tone: "avoid", reasons: ["nightshade"] }, { nightshade: true })).toBe(
      "On AIP. Tomato is a nightshade."
    );
  });

  it("falls back to the protocol's own rule for food groups", () => {
    expect(protocolWhy("Rice", "AIP", { tone: "avoid", reasons: ["grains"] }, {})).toBe("On AIP. Your protocol avoids grains.");
    expect(protocolWhy("Oats", "Low FODMAP", { tone: "limit", reasons: ["grains"] }, {})).toBe(
      "On Low FODMAP. Your protocol limits grains."
    );
  });

  it("joins two reasons", () => {
    expect(
      protocolWhy("Blue Cheese", "Low Histamine", { tone: "avoid", reasons: ["tyramine", "histamine"] }, { tyramine: "very_high", histamine: "moderate" })
    ).toBe("On Low Histamine. Blue cheese has a lot of tyramine and some histamine.");
  });

  it("says plainly when a food fits or isn't rated yet", () => {
    expect(protocolWhy("Rice", "Low Histamine", { tone: "allowed", reasons: [] }, {})).toBe("Fits your Low Histamine protocol.");
    expect(protocolWhy("Kale", "Low Histamine", { tone: "unknown", reasons: [] }, {})).toBe(
      "Kale isn't rated for your Low Histamine protocol yet."
    );
  });
});

describe("logLink", () => {
  const histamine = [
    { property: "histamine", severity: "moderate", outcome: { label: "Joint pain" }, frequency: 10, totalOpportunities: 10 },
    { property: "histamine", severity: "moderate", outcome: { label: "Flare day" }, frequency: 8, totalOpportunities: 10 },
    { property: "histamine_liberator", severity: "high", outcome: { label: "Brain fog" }, frequency: 7, totalOpportunities: 10 },
  ];

  it("finds what your own log linked to a property this food has, in one plain word", () => {
    expect(logLink(spinach, histamine)).toEqual({
      noun: "histamine",
      days: 10,
      total: 10,
      lead: "Joint pain on all 10 days",
      rest: "you had histamine foods. A flare on 8, brain fog on 7.",
    });
  });

  it("only matches when the food has at least the level the pattern is about", () => {
    const highOnly = [{ property: "oxalate", severity: "high", outcome: { label: "Joint pain" }, frequency: 6, totalOpportunities: 9 }];
    expect(logLink({ oxalate: "moderate" }, highOnly)).toBeNull();
    expect(logLink({ oxalate: "very_high" }, highOnly)?.lead).toBe("Joint pain on 6 of 9 days");
  });

  it("is null when nothing in your log is linked", () => {
    expect(logLink({ oxalate: "low" }, histamine)).toBeNull();
    expect(logLink(null, histamine)).toBeNull();
    expect(logLink(spinach, [])).toBeNull();
  });
});

describe("meterSteps", () => {
  it("fills more bars as the level rises", () => {
    expect(["low", "moderate", "high", "very_high", "none", "unknown"].map(meterSteps)).toEqual([1, 2, 3, 4, 0, 0]);
  });
});
