// Constantes de gameplay e performance — únicas fontes de verdade pros números
// usados em física, dificuldade e orçamento gráfico (ver PADROES-AGENCIA.md §9.1).

export const WORLD = {
  FORWARD_SPEED_MIN: 6, // unidades/seg — velocidade de avanço no início
  FORWARD_SPEED_MAX: 11, // velocidade de avanço no pico de dificuldade
  DIFFICULTY_RAMP_DISTANCE: 400, // distância (unidades) até atingir dificuldade máxima
  FOG_NEAR: 18,
  FOG_FAR: 55,
  GROUND_Y: -1.6, // altura do chão — bater aqui é game over
  CEILING_Y: 9, // altura "invisível" onde os obstáculos terminam (escondida no fog/céu)
};

export const BIRD = {
  GRAVITY: -22, // unidades/seg² — puxão constante pra baixo
  FLAP_IMPULSE: 8.5, // unidades/seg — impulso vertical instantâneo por toque
  MAX_FALL_SPEED: -18,
  MAX_RISE_SPEED: 9,
  RADIUS: 0.35, // raio de colisão (esfera simplificada)
  LATERAL_LIMIT: 3.2, // limite lateral pra manobra manual (fase futura)
  MAX_TRIANGLES: 5000, // orçamento de polígonos (spec 9.1)
};

export const OBSTACLES = {
  SPAWN_INTERVAL: 5.5, // distância entre obstáculos no início
  MIN_SPAWN_INTERVAL: 4.2, // distância mínima entre obstáculos no pico
  GAP_HEIGHT_START: 3.4, // altura do vão no início (fácil)
  GAP_HEIGHT_MIN: 2.2, // altura mínima do vão (difícil)
  GAP_Y_MIN: -1.2,
  GAP_Y_MAX: 2.4,
  POOL_SIZE: 8, // obstáculos reciclados via object pooling — nunca criar/destruir
  DESPAWN_DISTANCE_BEHIND: 6, // distância atrás da câmera pra reciclar
  MAX_TRIANGLES_EACH: 2000, // orçamento de polígonos por obstáculo (spec 9.1)
};

export const CAMERA = {
  FOV: 62,
  NEAR: 0.1,
  FAR: 80,
  OFFSET: { x: 0, y: 2.1, z: 5.2 }, // atrás e acima do pássaro (3ª pessoa)
  LOOK_AHEAD: 2.5,
  FOLLOW_LERP: 6, // suavização da câmera seguindo o pássaro
};

export const STORAGE_KEYS = {
  BEST_SCORE: "newflappy:best-score",
  SELECTED_SKIN: "newflappy:selected-skin",
  OWNED_SKINS: "newflappy:owned-skins",
  MUTED: "newflappy:muted",
  GAMEOVER_COUNT: "newflappy:gameover-count",
};

export const GAME_STATE = {
  MENU: "menu",
  PLAYING: "playing",
  GAME_OVER: "game_over",
  SHOP: "shop",
};
