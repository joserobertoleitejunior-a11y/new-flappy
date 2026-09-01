# PROGRESSO — New Flappy 3D

> Atualizado a cada fase concluída. Ordem segue o roadmap da
> `spec-jogo-flappy3d.md` §8. Decisões técnicas autônomas ficam detalhadas em
> `docs/decisoes.md` (ADRs curtos).

## Status geral

| Fase | Descrição | Status |
|---|---|---|
| 1 | Cenário 3D + pássaro com gravidade e flap | ✅ Concluída |
| 2 | Obstáculos + colisão + game over | ✅ Concluída |
| 3 | Placar e recorde (localStorage) | ⏳ Pendente |
| 4 | Loop de música/som | ⏳ Pendente |
| 5 | Estrutura AdMob (interstitial + rewarded) | ⏳ Pendente |
| 6 | Loja de skins | ⏳ Pendente |
| 7 | Ajustes finais de performance | ⏳ Pendente |

---

## Fase 1 — Cenário 3D + pássaro com gravidade e flap ✅

**O que foi feito:**
- Scaffold do projeto com Vite + Three.js + JS puro (módulos ES), seguindo a
  estrutura de pastas da spec §7 (`src/game`, `src/ui`, `src/ads`, `main.js`).
- `src/game/constants.js`: única fonte de verdade pra física, dificuldade e
  orçamento de performance (evita números mágicos espalhados).
- `src/game/Bird.js`: pássaro low-poly (icosaedro + bico + asas) mesclado num
  único `BufferGeometry`/draw call, bem abaixo do orçamento de 5k triângulos.
  Física manual: gravidade constante, impulso de flap, clamp de velocidade,
  leve inclinação visual conforme velocidade vertical.
- `src/game/InputController.js`: toque/clique/tecla (espaço/seta-cima) — um
  único evento "flap", funciona com uma mão só (spec §3).
- `src/game/CameraRig.js`: câmera em 3ª pessoa atrás do pássaro, com
  suavização exponencial (lerp) seguindo a posição do pássaro.
- `src/game/World.js` + `src/game/Scenery.js`: céu, luz, chão (um único
  draw call), fog pra esconder o horizonte, e árvores Kenney
  (`assets/models/nature/`) carregadas sob demanda (lazy) e desenhadas com
  `InstancedMesh` (instancing obrigatório por regra de performance).
- `src/game/GameManager.js`: máquina de estado (menu/jogando), loop de
  atualização, orquestra física + câmera + input.
- `index.html` / `src/style.css`: HUD (placar/recorde — ainda estáticos),
  telas de menu/game over/loja (escondidas até as fases correspondentes),
  responsivo (mobile-first, `prefers-reduced-motion` respeitado nas
  transições de tela), botões acessíveis por teclado.
- Lint (Biome) configurado e rodando limpo (`npm run lint`).
- Build de produção validado (`npm run build` — ok, ~505KB de bundle, quase
  todo Three.js; será revisitado na fase 7 de performance).
- Testado manualmente em navegador headless (viewport mobile 390×844) via
  Playwright: menu abre, toque inicia o jogo, física de queda/flap funciona,
  câmera segue o pássaro, cenário (chão + fog + árvores) renderiza sem erros
  de console.

**Decisões tomadas sozinho (detalhes em `docs/decisoes.md`):**
- ADR 001: Vite + JS puro, sem framework de UI.
- ADR 003: assets Kenney servidos via `publicDir: "assets"` (sem duplicar
  arquivos numa pasta `public/`).
- ADR 004: física manual (sem Cannon-es) — mais leve, suficiente pra mecânica
  de flap.
- ADR 005: pássaro é geometria procedural (pack Kenney usado é só de
  cenário/natureza, não tem personagem).
- ADR 006: vulnerabilidades de dev-dependency (`npm audit`, Vite/esbuild) não
  corrigidas ainda — não afetam o build de produção, só o dev server.

**O que falta / pendente:**
- Sem obstáculos ainda — o pássaro voa livre, sem colisão nem game over
  (fase 2). Se o jogador não tocar a tela, o pássaro cai infinitamente pelo
  chão (visual: câmera "atravessa" o plano do chão) — comportamento esperado
  até a fase 2 adicionar colisão com o chão/obstáculos.
- HUD de placar/recorde é só visual por enquanto (fase 3 liga a lógica).
- Sem som (fase 4), sem ads (fase 5), sem loja funcional (fase 6).
- `npm audit` acusa 5 vulnerabilidades em dependências de desenvolvimento
  (Vite/esbuild/vitest) — não afeta produção, ver ADR 006. Revisar upgrade
  major do Vite depois de estabilizar o MVP.
- Testes automatizados (Vitest/Playwright) ainda não escritos — não havia
  lógica pura suficiente pra testar unitariamente na fase 1; entram junto
  com placar (fase 3, cálculo de pontuação/recorde) e caminho feliz
  completo (fase 2 em diante).

---

## Fase 2 — Obstáculos + colisão + game over ✅

**O que foi feito:**
- `src/game/Obstacles.js`: pool de 8 obstáculos (16 instâncias: pilar de
  baixo + pilar de cima por obstáculo) num único `InstancedMesh` — nunca
  cria/destrói mesh em runtime, só reposiciona/reescala quando o pássaro
  passa (object pooling real, spec §9.1).
- Colisão simplificada 1D (posição vertical do pássaro contra o vão do
  obstáculo mais atual + janela de profundidade em Z) — sem raycasting nem
  física de corpo rígido, coerente com a mecânica (sem movimento lateral).
- Colisão com o chão (`WORLD.GROUND_Y`) também vira game over — corrige o
  comportamento de "cair pra sempre" observado na fase 1 quando o jogador
  não toca a tela.
- Dificuldade progressiva real: conforme a distância percorrida aumenta, o
  vão dos obstáculos encolhe (`GAP_HEIGHT_START` → `GAP_HEIGHT_MIN`) e o
  espaçamento entre eles diminui (`SPAWN_INTERVAL` → `MIN_SPAWN_INTERVAL`),
  junto com a velocidade de avanço já implementada na fase 1.
- `GameManager` ganhou: contagem interna de pontuação (`+1` por obstáculo
  passado — via callback do `Obstacles.update`), método `_gameOver()` que
  muda o estado e expõe `onGameOver(score)`, e `_checkCollisions()`
  reunindo colisão de chão + obstáculos.
- **Bug de CSS corrigido**: `.hidden` só funcionava combinado com `.screen`
  — o botão de "continuar com anúncio" (fase 5) aparecia indevidamente na
  tela de game over. Ver ADR 010.
- Testado manualmente em navegador headless (Playwright, viewport mobile):
  obstáculos renderizam com o vão visível, pássaro pontua ao atravessar,
  colisão com pilar e com o chão disparam game over corretamente, telas de
  fim de jogo/retry funcionam, nenhum erro de console.
- Lint (Biome) limpo e build de produção validado.

**Decisões tomadas sozinho** (detalhes em `docs/decisoes.md`):
- ADR 008: obstáculos como par de pilares em `InstancedMesh`, colisão 1D
  (sem lateral, coerente com a mecânica do jogo).
- ADR 009: colisão com o chão também é game over.
- ADR 010: correção do bug de CSS do `.hidden`.

**O que falta / pendente:**
- Pontuação é só contada internamente (`GameManager.score`) — ainda não
  aparece no HUD nem é salva como recorde (isso é o objetivo da fase 3).
- Sem som nos eventos de flap/ponto/colisão ainda (fase 4).
- Sem ads (fase 5) — o botão "Continuar (anúncio)" já existe no HTML,
  escondido, pronto pra ligar na fase 5.
- Sem loja funcional (fase 6).
- Testes automatizados (Vitest/Playwright) ainda não escritos como suíte
  formal — a verificação desta fase foi manual via script Playwright
  descartável. Entram na fase 3 (lógica de pontuação/recorde é a primeira
  peça de lógica pura que vale a pena testar unitariamente).

**Como rodar localmente:**
```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # gera dist/
npm run lint
```
