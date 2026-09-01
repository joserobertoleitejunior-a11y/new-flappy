# PROGRESSO — New Flappy 3D

> Atualizado a cada fase concluída. Ordem segue o roadmap da
> `spec-jogo-flappy3d.md` §8. Decisões técnicas autônomas ficam detalhadas em
> `docs/decisoes.md` (ADRs curtos).

## Status geral

| Fase | Descrição | Status |
|---|---|---|
| 1 | Cenário 3D + pássaro com gravidade e flap | ✅ Concluída |
| 2 | Obstáculos + colisão + game over | ✅ Concluída |
| 3 | Placar e recorde (localStorage) | ✅ Concluída |
| 4 | Loop de música/som | ✅ Concluída |
| 5 | Estrutura AdMob (interstitial + rewarded) | ✅ Concluída |
| 6 | Loja de skins | ✅ Concluída |
| 7 | Ajustes finais de performance | ✅ Concluída (com 1 item pendente do José — ver abaixo) |

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

---

## Fase 3 — Placar e recorde em localStorage ✅

**O que foi feito:**
- `src/game/Storage.js`: wrapper de `localStorage` tolerante a falha
  (`try/catch` em toda leitura/escrita — modo privado, cota cheia ou
  storage indisponível nunca derruba o jogo). `getBestScore()` e
  `saveScoreIfBest(score)` (retorna `{ best, isNewRecord }`, só grava se o
  novo score for estritamente maior — empate não sobrescreve).
- `src/ui/HUD.js`: camada de UI extraída do `main.js` — placar em tempo
  real (`#hud-score`), recorde (`#hud-best`), resumo da tela de game over,
  e troca de telas por estado do jogo. Mantém DOM fora do `GameManager`
  (que só cuida de jogo/física/colisão), como já vinha sendo feito desde a
  fase 1 na separação `game/` vs `ui/` da spec §7.
- `GameManager.onScoreChange` agora liga direto no HUD a cada obstáculo
  passado; `onGameOver` salva o recorde e atualiza os textos de resumo.
- **Primeiros testes unitários do projeto** (padrões §3.3):
  `src/game/Storage.test.js`, 7 casos cobrindo recorde ausente, valor salvo,
  valor corrompido no storage, novo recorde, recorde mantido, empate, e
  falha do storage não propagar exceção. `npm test` (Vitest) rodando verde.
- Testado manualmente em navegador headless: placar sobe a cada obstáculo
  passado, recorde persiste entre partidas (`localStorage`), recorde não
  regride com pontuação menor numa partida seguinte, telas de menu/game
  over mostram os valores corretos.
- Lint, testes unitários e build de produção validados.

**O que falta / pendente:**
- Sem som ainda (fase 4).
- Sem ads (fase 5) — `onContinue` (assistir anúncio pra continuar de onde
  morreu) ainda não existe; quando a fase 5 ligar isso, o placar da run
  atual (não só o recorde) precisa sobreviver ao "continuar".
- Sem loja funcional (fase 6) — quando skins entrarem, o recorde deve
  continuar por jogador/dispositivo (já é local, não por skin).
- `STORAGE_KEYS.OWNED_SKINS`, `SELECTED_SKIN`, `MUTED` e `GAMEOVER_COUNT`
  já existem em `constants.js` mas ainda não têm leitura/escrita — entram
  nas fases 4 (mudo), 5 (contagem de game overs pro intersticial) e 6
  (skins).

---

## Fase 4 — Loop de música/som ✅

**O que foi feito:**
- `src/game/AudioManager.js`: música de fundo e efeitos (flap/ponto/colisão)
  100% sintetizados via Web Audio API — sem nenhum arquivo de áudio pra
  baixar (repositório só tinha assets 3D). `AudioContext` só é criado num
  gesto real do usuário (`unlock()`), respeitando autoplay de navegador
  mobile. Música: loop curto renderizado uma vez offline
  (`OfflineAudioContext`) e tocado com `loop = true`. Efeitos: osciladores
  curtos com envelope de volume (`_blip`).
- Botão de mudo (🔊/🔇) no HUD, com preferência persistida em
  `localStorage` (`STORAGE_KEYS.MUTED`, via `getMuted`/`setMuted` novas em
  `Storage.js`).
- `GameManager` chama `audio.playFlap()` a cada toque, `audio.playPoint()` a
  cada obstáculo passado, `audio.playCollision()` no game over.
- 2 novos testes unitários (`getMuted`/`setMuted` em `Storage.test.js`) —
  suíte de testes agora com 9 casos, todos verdes.
- **Bug de UI corrigido**: o botão de mudo ficava inacessível (cliques
  interceptados) sempre que uma tela cheia (menu/game over/loja) estava por
  cima, porque `#hud` não tinha `z-index` e perdia pra ordem natural do DOM.
  Corrigido com `#hud { z-index: 10; }` — ver ADR 012.
- Testado manualmente em navegador headless: áudio desbloqueia no primeiro
  toque sem erro, alternar mudo funciona e persiste entre recarregamentos,
  nenhum erro de console/Web Audio.
- Lint, testes unitários e build de produção validados.

**Decisões tomadas sozinho** (detalhes em `docs/decisoes.md`):
- ADR 011: som/música sintetizados via Web Audio API, sem asset de terceiro
  — evita decisão de licenciamento de trilha sem o José por perto; trocar
  por uma trilha real depois é só apontar `_startMusicLoop` pra um arquivo.
- ADR 012: correção do bug de z-index do HUD.

**O que falta / pendente:**
- **José**: decidir se quer trocar a música sintetizada por uma trilha
  licenciada de verdade (a estrutura já suporta trocar depois, ver ADR 011).
- Sem ads ainda (fase 5).
- Sem loja funcional (fase 6) — quando skins tiverem sons próprios
  (ex: som de compra), entram aqui.
- `STORAGE_KEYS.GAMEOVER_COUNT` ainda não é lido/escrito — entra na fase 5
  (contagem de game overs pro intersticial).

---

## Fase 5 — Estrutura AdMob (interstitial + rewarded) ✅

**O que foi feito:**
- `src/ads/AdManager.js`: camada de anúncios pronta pra José plugar o AdMob
  real depois, sem nenhuma chave no código-fonte (padrões §4) — IDs vêm de
  `VITE_ADMOB_APP_ID` / `VITE_ADMOB_INTERSTITIAL_UNIT_ID` /
  `VITE_ADMOB_REWARDED_UNIT_ID` (ver `.env.example`, novo no repo). Sem
  essas variáveis e sem o app empacotado com Capacitor (que ainda não
  aconteceu), roda em **modo simulado**: overlay full-screen que sempre
  "recompensa", com os dois pontos de integração nativa marcados
  `TODO(Capacitor/AdMob real)`.
- Intersticial a cada 3 game overs (spec §5), contando de forma persistente
  (`STORAGE_KEYS.GAMEOVER_COUNT` → `getGameOverCount`/`incrementGameOverCount`
  novas em `Storage.js`) — disparado ao sair da tela de game over
  (`start()`/`returnToMenu()`), não no instante da morte.
- Anúncio recompensado "continuar de onde morreu": botão
  "Continuar (anúncio)" na tela de game over (antes escondido, sem lógica)
  agora funciona de verdade — 1x por partida (`continueUsedThisRun`), com
  1,5s de invulnerabilidade temporária ao retomar pra não colidir de novo
  instantaneamente com o obstáculo que matou o pássaro.
- 3 novos testes unitários (`src/ads/AdManager.test.js` — cadência do
  intersticial) + 2 em `Storage.test.js` (contador de game overs) — suíte
  agora com 14 casos, todos verdes.
- Testado manualmente em navegador headless: overlay simulado aparece nos
  dois fluxos, recorde de continuar funciona (estado volta pra "jogando"),
  botão de continuar não reaparece numa segunda morte da mesma partida,
  intersticial dispara exatamente no 3º/6º/9º... game over e não antes.
- Lint, testes unitários e build de produção validados.

**Decisões tomadas sozinho** (detalhes em `docs/decisoes.md`, ADR 013):
- AdManager detecta em runtime se está num app Capacitor nativo com AdMob
  configurado; caso contrário usa o modo simulado — permite testar o fluxo
  completo hoje, sem bloquear as fases seguintes esperando conta/SDK real.
- Intersticial dispara na transição de saída da tela de game over (não na
  morte em si), evitando empilhar dois overlays ao mesmo tempo.

**O que falta / pendente:**
- **José**: criar/configurar a conta AdMob real e preencher `.env` (a partir
  de `.env.example`) com os IDs de app/unidade quando for empacotar com
  Capacitor — os dois `TODO(Capacitor/AdMob real)` em `AdManager.js` são os
  únicos pontos que precisam de código novo nessa hora.
- Empacotamento com Capacitor em si (Android/iOS) não faz parte do roadmap
  desta sessão — segue como próximo passo natural depois da fase 7.
- Sem loja funcional ainda (fase 6).

---

## Fase 6 — Loja de skins ✅

**O que foi feito:**
- `src/game/skins.js`: catálogo com 3 skins (Clássico/grátis já liberada,
  Azul Céu/desbloqueio via anúncio, Brasa/compra R$ 2,90) — mais que o
  mínimo de "só um item" pedido.
- `src/ui/Shop.js`: renderiza a lista, mostra o estado de cada skin
  (selecionada/possuída/bloqueada), aplica seleção. Reaproveita o
  `AdManager` da fase 5 pra desbloqueio via anúncio — funciona de ponta a
  ponta hoje.
- `Bird.setColor(hexColor)`: troca a cor do pássaro sem recriar
  geometria/material (evita novo draw call/mesh — mantém o orçamento de
  performance da spec §9.1).
- `Storage.js` ganhou `getOwnedSkins`/`addOwnedSkin`/`getSelectedSkin`/
  `setSelectedSkin` — skins possuídas e selecionada persistem em
  `localStorage`, sobrevivem a recarregar a página.
- `main.js` aplica a skin salva no pássaro assim que o jogo carrega, e
  atualiza a cor em tempo real quando o jogador troca de skin na loja.
- 6 novos testes unitários (posse/seleção de skin, incluindo JSON
  corrompido no storage) — suíte agora com 20 casos, todos verdes.
- Testado manualmente em navegador headless: loja abre e lista as 3 skins
  corretamente, desbloquear via anúncio simulado funciona (persiste,
  seleciona, pássaro muda de cor de verdade), botão de compra fica
  desabilitado com aviso (sem provedor de pagamento configurado).
- Lint, testes unitários e build de produção validados.

**Decisões tomadas sozinho** (detalhes em `docs/decisoes.md`, ADR 014):
- Caminho de anúncio recompensado é 100% funcional; caminho de compra em
  R$ fica com o botão desabilitado (preço visível, sem cobrar de verdade)
  até existir um provedor de pagamento real — decisão de negócio do José.

**O que falta / pendente:**
- **José**: decidir/configurar um provedor de pagamento real (Stripe?
  Google Play Billing via Capacitor, já que o app será empacotado assim?)
  pra ativar o botão de compra da skin "Brasa" — hoje ele só mostra o
  preço e explica por que ainda não funciona.
- Skins são só cor sólida por enquanto — trocar por modelos/texturas
  diferentes por skin é uma evolução futura, fora do pedido desta fase
  ("mesmo que só com um item").

---

## Fase 7 — Ajustes finais de performance ✅ (com pendência do José)

Checklist da spec §9.1, item por item — números reais medidos no build de
produção (`npm run build` + `renderer.info`):

- ✅ **Orçamento de polígonos**: pássaro = 116 tris (limite 5000); pilar de
  obstáculo = 12 tris (limite 2000); árvore Kenney = 230 tris. Todos bem
  abaixo do limite.
- ✅ **Instancing**: obstáculos e árvores já usavam `InstancedMesh` desde as
  fases 1/2 — confirmado, nenhum `Mesh` avulso por elemento repetido.
- ✅ **Object pooling**: obstáculos reciclados (nunca criados/destruídos) —
  confirmado desde a fase 2.
- ✅ **Texturas comprimidas/512×512**: não se aplica — o jogo não usa
  nenhuma textura (só cor sólida `flatShading`), então não há nada pra
  comprimir. Documentado pra não parecer esquecido (ADR 015).
- ✅ **Draw calls**: só 4 por frame no total da cena (chão, obstáculos,
  árvores, pássaro) — 14.110 triângulos na cena inteira.
- ✅ **Lazy loading**: árvores carregam depois do primeiro frame, áudio só
  inicializa num gesto do usuário — já garantido desde as fases 1 e 4.
- ✅ **Alocação por frame** (achado e corrigido nesta fase, não estava no
  checklist original mas é a mesma categoria de problema): `Obstacles.js`
  alocava um array novo a cada frame (`Math.min(...map(...))`) e fazia
  busca O(n) (`indexOf`) mesmo sem nada reciclando; `GameManager.js`
  recriava uma closure a cada frame pro callback de pontuação. Os dois
  foram trocados por laços/métodos sem alocação. Heap JS medido estável
  (~5,6–6,6MB) ao longo de 8s de jogo contínuo — sem tendência de
  crescimento.
- ✅ **Bundle**: `three.js` separado num chunk próprio — código do jogo em
  si fica em ~30KB, cacheável independente da lib.
- ⚠️ **Meta de 60fps em celular real de entrada — PENDENTE, precisa do
  José**: este ambiente não tem acesso a um aparelho físico, só Chromium
  headless com rasterizador por software (sem GPU real), que mediu ~30fps
  estáveis — número que reflete o gargalo do software rendering, não
  representa hardware de verdade. Dada a carga baixíssima da cena (4 draw
  calls, ~14k triângulos), 60fps num celular real de entrada é o resultado
  esperado, mas **isso só pode ser confirmado testando em um aparelho
  físico**. Ver ADR 015 pra detalhes completos do que foi e não foi
  medido.

**Decisões tomadas sozinho** (ADR 015): documentei explicitamente o que dá
pra verificar num ambiente sem GPU/celular real e o que fica como pendência
sua — preferi ser honesto sobre a lacuna a inventar um número de FPS "de
aparelho real" que não foi medido de verdade.

**O que falta / pendente (resumo geral do projeto, todas as 7 fases):**
- **José, ação necessária**: testar o jogo num celular de entrada real e
  confirmar 60fps (único item do checklist de performance não verificável
  aqui).
- **José, decisão de negócio**: conta AdMob real (fase 5, `.env` a partir
  de `.env.example`) e provedor de pagamento pra loja de skins (fase 6).
- Empacotamento com Capacitor (Android/iOS) e publicação nas lojas — não
  fazia parte do roadmap desta sessão, é o próximo passo natural depois
  daqui (spec §10 original).
- Sem testes E2E com Playwright como suíte formal do projeto ainda — as
  fases 1–7 foram validadas manualmente com scripts Playwright descartáveis
  a cada fase (não commitados); formalizar isso como `npm run test:e2e` é
  uma boa próxima tarefa se o projeto continuar.
- Sentry (observabilidade, padrões §3.1) ainda não plugado — nenhum erro em
  produção é capturado automaticamente hoje.

**Como rodar localmente:**
```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # gera dist/
npm run lint
npm test         # Vitest
```

Opcional: copie `.env.example` pra `.env` e preencha os `VITE_ADMOB_*` com
os IDs reais da conta AdMob quando existirem — sem isso, os anúncios rodam
em modo simulado (ver fase 5).
