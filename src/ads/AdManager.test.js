import { describe, expect, it } from "vitest";
import { AdManager } from "./AdManager.js";

describe("AdManager.shouldShowInterstitial", () => {
  it("não mostra no zero (nenhum game over ainda)", () => {
    const ads = new AdManager();
    expect(ads.shouldShowInterstitial(0)).toBe(false);
  });

  it("mostra a cada 3 game overs (spec §5)", () => {
    const ads = new AdManager();
    expect(ads.shouldShowInterstitial(3)).toBe(true);
    expect(ads.shouldShowInterstitial(6)).toBe(true);
    expect(ads.shouldShowInterstitial(9)).toBe(true);
  });

  it("não mostra fora do ciclo de 3", () => {
    const ads = new AdManager();
    expect(ads.shouldShowInterstitial(1)).toBe(false);
    expect(ads.shouldShowInterstitial(2)).toBe(false);
    expect(ads.shouldShowInterstitial(4)).toBe(false);
    expect(ads.shouldShowInterstitial(5)).toBe(false);
  });
});
