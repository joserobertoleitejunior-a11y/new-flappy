import { addOwnedSkin, getOwnedSkins, getSelectedSkin, setSelectedSkin } from "../game/Storage.js";
import { SKINS } from "../game/skins.js";

// Loja de skins (spec §5): compra única (R$, ainda sem provedor de
// pagamento configurado — botão fica desabilitado com aviso) ou
// desbloqueio via anúncio recompensado (já funcional, reaproveita o
// AdManager da fase 5).
export class Shop {
  /** @param {{ ads: import("../ads/AdManager.js").AdManager, onSkinChange: (skin: object) => void }} deps */
  constructor({ ads, onSkinChange }) {
    this.ads = ads;
    this.onSkinChange = onSkinChange;
    this.listEl = document.getElementById("shop-list");
  }

  render() {
    const owned = getOwnedSkins();
    const selected = getSelectedSkin();
    this.listEl.replaceChildren(...SKINS.map((skin) => this._buildItem(skin, owned, selected)));
  }

  _buildItem(skin, owned, selectedId) {
    const isOwned = owned.includes(skin.id);
    const isSelected = skin.id === selectedId;

    const row = document.createElement("div");
    row.className = "shop-item";
    row.dataset.selected = String(isSelected);

    const swatch = document.createElement("span");
    swatch.className = "shop-item-swatch";
    swatch.style.background = `#${skin.color.toString(16).padStart(6, "0")}`;
    swatch.setAttribute("aria-hidden", "true");

    const label = document.createElement("span");
    label.className = "shop-item-label";
    label.textContent = skin.name;

    row.append(swatch, label, this._buildActionButton(skin, isOwned, isSelected));
    return row;
  }

  _buildActionButton(skin, isOwned, isSelected) {
    const button = document.createElement("button");
    button.type = "button";

    if (isSelected) {
      button.textContent = "Selecionada";
      button.disabled = true;
    } else if (isOwned) {
      button.textContent = "Usar";
      button.addEventListener("click", () => this._select(skin.id));
    } else if (skin.unlock === "ad") {
      button.textContent = "Desbloquear (anúncio)";
      button.addEventListener("click", () => this._unlockWithAd(skin.id));
    } else {
      button.textContent = skin.priceLabel ?? "Comprar";
      button.disabled = true;
      button.title = "Compra em breve — aguardando provedor de pagamento configurado";
    }

    return button;
  }

  async _unlockWithAd(skinId) {
    const rewarded = await this.ads.showRewarded();
    if (!rewarded) return;
    addOwnedSkin(skinId);
    this._select(skinId);
  }

  _select(skinId) {
    setSelectedSkin(skinId);
    const skin = SKINS.find((item) => item.id === skinId);
    this.onSkinChange?.(skin);
    this.render();
  }
}
