import { beforeEach, describe, expect, it } from "vitest";
import {
  addOwnedSkin,
  getBestScore,
  getGameOverCount,
  getMuted,
  getOwnedSkins,
  getSelectedSkin,
  incrementGameOverCount,
  saveScoreIfBest,
  setMuted,
  setSelectedSkin,
} from "./Storage.js";
import { STORAGE_KEYS } from "./constants.js";

function createMemoryStorage() {
  const store = new Map();
  return {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key),
    clear: () => store.clear(),
  };
}

beforeEach(() => {
  globalThis.localStorage = createMemoryStorage();
});

describe("getBestScore", () => {
  it("retorna 0 quando não há recorde salvo", () => {
    expect(getBestScore()).toBe(0);
  });

  it("retorna o valor salvo anteriormente", () => {
    globalThis.localStorage.setItem(STORAGE_KEYS.BEST_SCORE, "42");
    expect(getBestScore()).toBe(42);
  });

  it("ignora valor corrompido e retorna 0", () => {
    globalThis.localStorage.setItem(STORAGE_KEYS.BEST_SCORE, "não-é-número");
    expect(getBestScore()).toBe(0);
  });
});

describe("saveScoreIfBest", () => {
  it("salva e marca novo recorde quando o score supera o atual", () => {
    const result = saveScoreIfBest(10);
    expect(result).toEqual({ best: 10, isNewRecord: true });
    expect(getBestScore()).toBe(10);
  });

  it("mantém o recorde antigo quando o score é menor ou igual", () => {
    saveScoreIfBest(10);
    const result = saveScoreIfBest(5);
    expect(result).toEqual({ best: 10, isNewRecord: false });
    expect(getBestScore()).toBe(10);
  });

  it("empate não conta como novo recorde", () => {
    saveScoreIfBest(7);
    const result = saveScoreIfBest(7);
    expect(result.isNewRecord).toBe(false);
  });

  it("não lança erro se o localStorage estiver indisponível", () => {
    globalThis.localStorage = {
      getItem: () => {
        throw new Error("indisponível");
      },
      setItem: () => {
        throw new Error("indisponível");
      },
    };
    expect(() => saveScoreIfBest(5)).not.toThrow();
  });
});

describe("getMuted / setMuted", () => {
  it("retorna falso por padrão (som ligado)", () => {
    expect(getMuted()).toBe(false);
  });

  it("persiste true/false entre chamadas", () => {
    setMuted(true);
    expect(getMuted()).toBe(true);
    setMuted(false);
    expect(getMuted()).toBe(false);
  });
});

describe("getGameOverCount / incrementGameOverCount", () => {
  it("começa em 0", () => {
    expect(getGameOverCount()).toBe(0);
  });

  it("incrementa e persiste a cada chamada", () => {
    expect(incrementGameOverCount()).toBe(1);
    expect(incrementGameOverCount()).toBe(2);
    expect(incrementGameOverCount()).toBe(3);
    expect(getGameOverCount()).toBe(3);
  });
});

describe("getOwnedSkins / addOwnedSkin", () => {
  it("começa só com a skin padrão (classic)", () => {
    expect(getOwnedSkins()).toEqual(["classic"]);
  });

  it("adiciona uma skin nova à lista", () => {
    addOwnedSkin("sky");
    expect(getOwnedSkins()).toEqual(["classic", "sky"]);
  });

  it("não duplica skin já possuída", () => {
    addOwnedSkin("sky");
    addOwnedSkin("sky");
    expect(getOwnedSkins()).toEqual(["classic", "sky"]);
  });

  it("ignora JSON corrompido e volta pro padrão", () => {
    globalThis.localStorage.setItem(STORAGE_KEYS.OWNED_SKINS, "{não é json válido");
    expect(getOwnedSkins()).toEqual(["classic"]);
  });
});

describe("getSelectedSkin / setSelectedSkin", () => {
  it("começa com a skin padrão (classic) selecionada", () => {
    expect(getSelectedSkin()).toBe("classic");
  });

  it("persiste a skin selecionada", () => {
    setSelectedSkin("sky");
    expect(getSelectedSkin()).toBe("sky");
  });
});
