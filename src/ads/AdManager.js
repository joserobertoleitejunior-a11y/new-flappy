// Camada de anúncios (AdMob). Hoje roda em modo simulado, sem SDK nativo —
// o app ainda não foi empacotado com Capacitor (spec §6/§7). Estrutura já
// pronta pra José plugar @capacitor-community/admob depois: só implementar
// os dois métodos marcados com TODO usando os IDs reais.
//
// Nenhuma chave/ID entra hardcoded no código-fonte (PADROES-AGENCIA.md §4)
// — tudo vem de variáveis de ambiente VITE_ADMOB_* (ver .env.example).
const ADMOB_CONFIG = {
  appId: import.meta.env.VITE_ADMOB_APP_ID ?? "",
  interstitialUnitId: import.meta.env.VITE_ADMOB_INTERSTITIAL_UNIT_ID ?? "",
  rewardedUnitId: import.meta.env.VITE_ADMOB_REWARDED_UNIT_ID ?? "",
};

const INTERSTITIAL_EVERY_N_GAMEOVERS = 3; // spec §5: "a cada X game overs (ex: a cada 3 mortes)"
const SIMULATED_AD_MS = { interstitial: 1400, rewarded: 2000 };

function hasRealAdMobKeys() {
  return Boolean(
    ADMOB_CONFIG.appId && ADMOB_CONFIG.interstitialUnitId && ADMOB_CONFIG.rewardedUnitId,
  );
}

function isCapacitorNativeAdMobAvailable() {
  return Boolean(
    globalThis.Capacitor?.isNativePlatform?.() && globalThis.Capacitor?.Plugins?.AdMob,
  );
}

export class AdManager {
  constructor() {
    this.configured = hasRealAdMobKeys();
    this.native = isCapacitorNativeAdMobAvailable();

    if (!this.configured) {
      // Aviso só em desenvolvimento — não é erro, é o estado esperado até
      // o José configurar as variáveis VITE_ADMOB_* de verdade.
      console.info("[AdManager] VITE_ADMOB_* não configurado — anúncios rodam em modo simulado.");
    }
  }

  /** @param {number} gameOverCount - total de game overs acumulado (persistido) */
  shouldShowInterstitial(gameOverCount) {
    return gameOverCount > 0 && gameOverCount % INTERSTITIAL_EVERY_N_GAMEOVERS === 0;
  }

  /** Mostra o intersticial e resolve quando ele fecha. */
  async showInterstitial() {
    if (this.native && this.configured) {
      // TODO(Capacitor/AdMob real): trocar pela chamada nativa, ex.:
      // const { AdMob } = Capacitor.Plugins;
      // await AdMob.prepareInterstitial({ adId: ADMOB_CONFIG.interstitialUnitId });
      // await AdMob.showInterstitial();
      return;
    }
    await this._showSimulatedAd("📺 Anúncio intersticial (simulado)", SIMULATED_AD_MS.interstitial);
  }

  /**
   * Mostra o anúncio recompensado.
   * @returns {Promise<boolean>} true se o jogador assistiu até o fim (ganhou a recompensa)
   */
  async showRewarded() {
    if (this.native && this.configured) {
      // TODO(Capacitor/AdMob real): trocar pela chamada nativa, ex.:
      // const { AdMob } = Capacitor.Plugins;
      // await AdMob.prepareRewardVideoAd({ adId: ADMOB_CONFIG.rewardedUnitId });
      // const result = await AdMob.showRewardVideoAd();
      // return Boolean(result?.type); // "reward" recebido
      return true;
    }
    await this._showSimulatedAd(
      "🎬 Anúncio recompensado (simulado) — continuando...",
      SIMULATED_AD_MS.rewarded,
    );
    return true;
  }

  _showSimulatedAd(label, durationMs) {
    return new Promise((resolve) => {
      const overlay = document.createElement("div");
      overlay.className = "ad-simulated-overlay";
      overlay.textContent = label;
      document.body.appendChild(overlay);
      setTimeout(() => {
        overlay.remove();
        resolve();
      }, durationMs);
    });
  }
}
