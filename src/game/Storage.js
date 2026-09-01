import { STORAGE_KEYS } from "./constants.js";

// Wrapper de localStorage tolerante a falha (modo privado, cota cheia,
// storage indisponível) — persistência nunca pode derrubar o jogo.
function safeGet(key) {
  try {
    return globalThis.localStorage?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

function safeSet(key, value) {
  try {
    globalThis.localStorage?.setItem(key, value);
  } catch {
    // armazenamento indisponível — o jogo segue sem recorde salvo
  }
}

export function getBestScore() {
  const raw = safeGet(STORAGE_KEYS.BEST_SCORE);
  const parsed = Number.parseInt(raw ?? "0", 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

/**
 * Salva o score como novo recorde se ele superar o atual.
 * @param {number} score
 * @returns {{ best: number, isNewRecord: boolean }}
 */
export function saveScoreIfBest(score) {
  const currentBest = getBestScore();
  if (score > currentBest) {
    safeSet(STORAGE_KEYS.BEST_SCORE, String(score));
    return { best: score, isNewRecord: true };
  }
  return { best: currentBest, isNewRecord: false };
}

export function getMuted() {
  return safeGet(STORAGE_KEYS.MUTED) === "1";
}

export function setMuted(muted) {
  safeSet(STORAGE_KEYS.MUTED, muted ? "1" : "0");
}

export function getGameOverCount() {
  const raw = safeGet(STORAGE_KEYS.GAMEOVER_COUNT);
  const parsed = Number.parseInt(raw ?? "0", 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

/** Incrementa e persiste o contador total de game overs. Retorna o novo total. */
export function incrementGameOverCount() {
  const next = getGameOverCount() + 1;
  safeSet(STORAGE_KEYS.GAMEOVER_COUNT, String(next));
  return next;
}
