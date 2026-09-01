// Catálogo de skins do pássaro — dado, não código (spec §5: "loja de
// skins... compra única (R$) ou desbloqueio via anúncio recompensado").
// A skin "classic" é a única que já vem liberada.
export const DEFAULT_SKIN_ID = "classic";

export const SKINS = [
  { id: "classic", name: "Clássico", color: 0xffd166, unlock: "free" },
  { id: "sky", name: "Azul Céu", color: 0x4fc3f7, unlock: "ad" },
  { id: "ember", name: "Brasa", color: 0xef5350, unlock: "purchase", priceLabel: "R$ 2,90" },
];
