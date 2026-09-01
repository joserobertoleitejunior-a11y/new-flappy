# Decisões técnicas — New Flappy 3D

> ADRs curtos das decisões tomadas de forma autônoma durante a execução do
> roadmap (spec §8), quando a spec/padrões não especificavam uma escolha
> exata. Cada entrada segue: contexto → decisão → alternativas descartadas.

---

## ADR 001 — Stack de build: Vite + JS puro (sem framework de UI)

**Contexto**: `PADROES-AGENCIA.md` §0 descreve "site estático sem
build/bundler" para o projeto Pizza em Dobro especificamente, mas a spec do
jogo (§6) já recomenda Three.js + Capacitor, que exige um passo de bundling
pra empacotar como app. Não havia stack de build definida ainda.

**Decisão**: Vite como dev server/bundler, JavaScript puro com módulos ES
(sem React/Vue) para a camada de jogo — Three.js já traz seu próprio modelo
de "cena" como estado, um framework de UI só adicionaria peso e complexidade
sem necessidade pro loop de jogo. Vite gera um `dist/` estático que tanto
funciona como PWA quanto empacota direto no Capacitor mais tarde.

**Alternativas descartadas**: bundler manual (esbuild cru) — mais setup pra
manter; Next.js/React — overhead desnecessário para uma cena 3D com HUD
simples em HTML/CSS por cima do canvas.

---

## ADR 002 — Estrutura modular conforme spec §7, sem alterações

**Decisão**: seguida à risca a estrutura sugerida na spec
(`/src/game`, `/src/ui`, `/src/ads`, `main.js`), com adição de
`src/game/constants.js` (única fonte de verdade pra números de física/
dificuldade/performance) e `src/game/Scenery.js` (carregamento lazy dos
assets Kenney). Nenhuma função passa de ~80 linhas (padrões §3.2).

---

## ADR 003 — Assets 3D da Kenney servidos via `publicDir: "assets"`

**Contexto**: os modelos Kenney já estavam em `assets/models/nature/` na
raiz do repo (fora de uma pasta `public/`), e o Vite só serve estaticamente
o que está no `publicDir` (por padrão `public/`).

**Decisão**: configurar `publicDir: "assets"` no `vite.config.js`, expondo o
conteúdo de `assets/` na raiz da URL (ex.: `assets/models/nature/...` vira
`/models/nature/...` em runtime). Evita duplicar/mover os ~650 arquivos do
pack Kenney pra dentro de uma pasta `public/` nova.

**Alternativas descartadas**: copiar os assets pra `public/`; importar cada
modelo via `new URL(..., import.meta.url)` (mais verboso, sem ganho aqui já
que os modelos são carregados por caminho fixo no `OBJLoader`).

---

## ADR 004 — Física do flap sem engine de física (Cannon-es)

**Contexto**: a spec (§6) sugere "Cannon-es (ou física simples manual)".

**Decisão**: física manual simples (gravidade constante + impulso vertical
por toque, com clamp de velocidade máxima) em `Bird.js`. A mecânica do
Flappy Bird não precisa de física rígida real (sem rotação de corpo rígido,
sem múltiplos corpos colidindo) — Cannon-es adicionaria peso ao bundle e
complexidade sem ganho de jogabilidade, contrariando a meta de 60fps em
celular de entrada (spec §9.1).

---

## ADR 005 — Pássaro como geometria procedural mesclada (não modelo Kenney)

**Contexto**: o pack Kenney disponível é de natureza/cenário (árvores,
pedras, cercas) — não inclui um personagem-pássaro pronto.

**Decisão**: corpo do pássaro construído proceduralmente
(icosaedro + cone do bico + duas asas) e mesclado num único
`BufferGeometry` via `BufferGeometryUtils.mergeGeometries` — um único draw
call, bem abaixo do orçamento de 5k triângulos (spec §9.1,
`BIRD.MAX_TRIANGLES`). Cor/material trocável por skin (gancho pra loja,
fase 6).

---

## ADR 006 — Vulnerabilidades de dev-dependency (esbuild/vite) não corrigidas ainda

**Contexto**: `npm audit` aponta 5 vulnerabilidades (1 crítica) em
`esbuild`/`vite`/`vitest`, todas relacionadas ao dev server aceitar
requisições de qualquer origem — não afeta o bundle de produção (`dist/`).

**Decisão**: manter as versões atuais por ora (upgrade pra Vite 8 é breaking
change) e documentar aqui. Pendente: revisar upgrade major do Vite antes de
publicar o dev server em rede não confiável.

---

## ADR 007 — Testes: Vitest (unitário) + Playwright headless (smoke manual)

**Contexto**: padrões §3.3 pedem testes unitários nas regras críticas e E2E
com Playwright no caminho feliz.

**Decisão**: Vitest para lógica pura (física, pontuação, storage) por ser
mais rápido e já integrado ao Vite; Playwright entra a partir da fase em que
o caminho feliz completo (abrir → jogar → morrer → reiniciar) existir de
verdade (spec §9.6), evitando um teste E2E "vazio" antes da hora.

---

## ADR 008 — Obstáculos como pares de pilar em `InstancedMesh`, sem lateral

**Contexto**: fase 2 do roadmap pede geração de obstáculos + colisão + game
over. A mecânica descrita (§2/§3) é toque = impulso vertical, sem controle
lateral — o pássaro sempre voa no centro da pista (x = 0).

**Decisão**: cada obstáculo é um par de pilares (baixo/cima) formando um vão
vertical, desenhado com um único `InstancedMesh` de capacidade
`POOL_SIZE * 2` (16 instâncias) — geometria de caixa unitária com pivô na
base, escalada por instância pra virar a altura real de cada pilar.
Colisão simplificada: como não há movimento lateral, o teste é 1D (posição Y
do pássaro contra o vão) mais uma faixa de profundidade em Z — sem
precisar de raycasting nem física de corpo rígido. Object pooling
verdadeiro: quando um obstáculo fica pra trás do pássaro além de
`DESPAWN_DISTANCE_BEHIND`, ele é reposicionado à frente do pool (não criado
de novo) com novo vão aleatório, escalado pela dificuldade atual.

**Alternativas descartadas**: `Mesh` individual por pilar (violaria a regra
de instancing); hierarquia de grupo por obstáculo com colisão via
`Box3`/raycast (desnecessário dado que não há movimento lateral nem rotação
do obstáculo).

---

## ADR 009 — Chão (`WORLD.GROUND_Y`) também é condição de game over

**Contexto**: a spec não detalha explicitamente colisão com o chão, só com
obstáculos. Sem ela, um jogador que nunca toca a tela cai infinitamente
através do chão (bug visual encontrado durante o teste manual da fase 1: a
câmera "atravessava" o plano do chão ao segui-lo pra baixo).

**Decisão**: bater no nível do chão (`bird.y - RAIO <= WORLD.GROUND_Y`)
também é game over, igual ao Flappy Bird original. `WORLD.GROUND_Y` virou
constante compartilhada entre `World.js` (posição visual do chão) e
`GameManager.js` (condição de colisão), pra nunca dessincronizar.

---

## ADR 010 — Bug de CSS corrigido: `.hidden` tinha efeito só dentro de `.screen`

**Contexto**: durante o teste manual da fase 2 (Playwright headless), o botão
"Continuar (anúncio)" apareceu visível na tela de game over mesmo tendo
`class="hidden"` no HTML — ele deveria ficar escondido até a fase 5 (ad
recompensado) existir de verdade.

**Causa raiz**: a regra CSS era `.screen.hidden { display: none; }` (exige
as duas classes no mesmo elemento). Botões fora de `.screen` com apenas
`class="hidden"` não batiam no seletor.

**Decisão**: trocado para uma regra utilitária genérica
`.hidden { display: none !important; }`, reaproveitável em qualquer
elemento (telas, botões futuros da loja/HUD). `!important` justificado aqui
por ser uma única classe utilitária de visibilidade, não uso "em excesso"
(padrões §3.2 proíbe abuso, não uma classe utilitária isolada).

---

## ADR 011 — Som e música 100% sintetizados via Web Audio API (sem asset de áudio)

**Contexto**: fase 4 pede loop de música + efeitos de flap/ponto/colisão. O
repositório não tem nenhum asset de áudio (só os modelos 3D da Kenney em
`assets/models/nature/`), e não há uma conta/licença de música definida
ainda pelo José.

**Decisão**: gerar tudo via Web Audio API — efeitos (`flap`/`ponto`/
`colisão`) como osciladores curtos com envelope (`AudioManager._blip`), e a
música de fundo como um loop curto (8 notas, melodia simples) renderizado
uma vez offline (`OfflineAudioContext`) e tocado em loop. Zero download de
asset (nada trava o primeiro load — spec §9.1), zero dependência de
licenciamento de música de terceiros. O `AudioContext` só é criado dentro
de um gesto real do usuário (`unlock()`, chamado no primeiro toque/clique),
respeitando a política de autoplay dos navegadores mobile.

**Alternativas descartadas**: baixar/gerar arquivos MP3/OGG de bibliotecas
de música livre — exigiria escolher uma trilha real e verificar licença,
decisão de gosto/identidade sonora que cabe ao José revisar depois; a
estrutura de `AudioManager` já fica pronta pra trocar a síntese por um
`AudioBufferSourceNode` carregando um arquivo real quando ele decidir a
trilha definitiva.

**Pendente**: José pode querer trocar a música sintetizada por uma trilha
licenciada de verdade — trocar só exige apontar `_startMusicLoop` pra
carregar um arquivo em vez de renderizar offline.

---

## ADR 012 — Bug de UI corrigido: HUD (placar/botão de mudo) ficava atrás das telas

**Contexto**: ao testar o novo botão de mudo (fase 4) em automação headless,
o clique nele travava com "elemento intercepta eventos de ponteiro" sempre
que uma tela cheia (`.screen` — menu, game over ou loja) estava visível.

**Causa raiz**: `#hud` vem antes das `.screen` no HTML e nenhum dos dois
tinha `z-index` explícito — na ordem de pilha padrão, elementos posteriores
no DOM (as telas) desenham por cima do HUD, mesmo o HUD continuando visível
(o painel das telas é semitransparente). O botão de mudo, mesmo com
`pointer-events: auto`, ficava coberto pela tela por cima.

**Decisão**: `#hud { z-index: 10; }` — o HUD (placar, recorde, botão de
mudo) sempre fica acessível por cima de qualquer tela, igual à maioria dos
jogos mobile onde o controle de som é global.

---

## ADR 013 — AdManager em modo simulado até José configurar o AdMob de verdade

**Contexto**: fase 5 pede estrutura pronta pra AdMob (intersticial +
recompensado), "sem chave real ainda, deixe pronto pra eu plugar depois".
AdMob nativo de verdade só funciona dentro de um app empacotado com
Capacitor (`@capacitor-community/admob`) — o empacotamento em si é uma
etapa fora do roadmap desta sessão (spec §10 originalmente previa isso como
um passo 7 separado, "Empacotar com Capacitor e publicar", que não faz
parte da lista de 7 fases pedida aqui).

**Decisão**: `src/ads/AdManager.js` detecta em runtime se está rodando
dentro de um app nativo Capacitor com o plugin AdMob presente
(`Capacitor.isNativePlatform() && Capacitor.Plugins.AdMob`) **e** se as
variáveis `VITE_ADMOB_APP_ID` / `VITE_ADMOB_INTERSTITIAL_UNIT_ID` /
`VITE_ADMOB_REWARDED_UNIT_ID` estão configuradas (nunca hardcoded — padrões
§4). Se as duas condições não forem verdade (o caso hoje, sempre — web/PWA
sem Capacitor), cai num modo simulado: um overlay full-screen por ~1,4s
(intersticial) ou ~2s (recompensado) que sempre "recompensa" o jogador,
permitindo testar o fluxo completo (cadência do intersticial, botão
continuar) sem depender de conta/SDK real. Os dois pontos de integração
nativa reais ficam marcados com `TODO(Capacitor/AdMob real)` no código,
prontos pra José substituir quando empacotar o app.

**Regras de negócio implementadas** (spec §5):
- Intersticial a cada 3 game overs (`INTERSTITIAL_EVERY_N_GAMEOVERS`),
  contando de forma persistente (`STORAGE_KEYS.GAMEOVER_COUNT`,
  sobrevive a fechar o navegador) — disparado na transição de saída da
  tela de game over (`start()`/`returnToMenu()`), não no momento da morte,
  pra não empilhar dois overlays (game over + anúncio) ao mesmo tempo.
- Recompensado "continuar de onde morreu": 1x por partida
  (`continueUsedThisRun`, resetado em `start()`), com 1,5s de invulnerabilidade
  temporária ao retomar (`_invulnerableSeconds`) pra não colidir de novo
  instantaneamente com o obstáculo que acabou de matar o pássaro.

**Alternativas descartadas**: bloquear a fase inteira até ter uma conta
AdMob real — contraria a instrução explícita de deixar pronto pra plugar
depois e travaria as fases seguintes (6 e 7) sem necessidade.

---

## ADR 014 — Loja de skins: desbloqueio via anúncio funcional, compra em R$ como stub

**Contexto**: fase 6 pede "estrutura, mesmo que só com um item". A spec §5
prevê dois caminhos de monetização pra skin: "compra única (R$) ou
desbloqueio via anúncio recompensado". Não existe conta/provedor de
pagamento configurado (padrões §8 já lista isso como pendência do José em
outro projeto da agência) — cobrar de verdade exigiria escolher um
provedor (Stripe? Google Play Billing via Capacitor?) e credenciais reais,
decisão de negócio que cabe ao José.

**Decisão**: catálogo de 3 skins em `src/game/skins.js`
(clássica/grátis, azul-céu/anúncio, brasa/compra) — 2 itens além da
padrão, mais que o mínimo pedido. O caminho de anúncio recompensado
funciona de ponta a ponta hoje (reaproveita `AdManager.showRewarded` da
fase 5: assiste, desbloqueia, seleciona, aplica a cor no pássaro via
`Bird.setColor`, tudo persistido em `localStorage` —
`STORAGE_KEYS.OWNED_SKINS`/`SELECTED_SKIN`). O caminho de compra mostra o
preço mas fica com o botão desabilitado (`title` explicando o motivo) —
estrutura pronta (é só trocar `unlock: "purchase"` por uma chamada real
de pagamento quando o provedor existir), sem fingir uma cobrança que não
acontece de verdade.

**Alternativas descartadas**: simular a compra também (ex.: desbloquear
"de graça" clicando no preço) — enganoso, o botão pareceria fazer uma
cobrança real; ligar um provedor de pagamento de verdade agora — decisão
de negócio (custo, taxa, provedor) que não é minha pra tomar sozinho.

---

## ADR 015 — Checklist de performance da fase 7: o que foi medido e o que ficou pendente

**Contexto**: spec §9.1 pede instancing, object pooling, orçamento de
polígonos, textura comprimida/limitada e meta de 60fps "testado em
aparelho real, não só emulador/desktop". Este ambiente de execução não tem
acesso a um celular físico — só navegador headless (Chromium com
rasterizador por software, `swiftshader`, sem GPU real).

**O que foi verificado e corrigido nesta fase** (números reais, medidos via
`renderer.info` e contagem de triângulos em `dist/` — build de produção):
- **Orçamento de polígonos**: pássaro = 116 triângulos (orçamento: 5000);
  cada pilar de obstáculo = 12 triângulos (orçamento: 2000); árvore Kenney
  = 230 triângulos. Todos bem abaixo do limite.
- **Draw calls**: só 4 por frame (chão, obstáculos via `InstancedMesh`,
  árvores via `InstancedMesh`, pássaro) — 14.110 triângulos no total da
  cena inteira, uma carga trivial pra qualquer GPU mobile da última década.
- **Texturas**: zero texturas em uso (todo material é cor sólida
  `flatShading`) — o item "comprimir/limitar a 512×512" do checklist não
  se aplica hoje; documentado aqui pra não parecer esquecido.
- **Alocação por frame** (achado nesta fase, corrigido): `Obstacles.update`
  fazia `Math.min(...items.map(...))` e `items.indexOf(item)` — alocava um
  array novo e fazia busca O(n) a cada um dos 60 frames/seg, mesmo sem
  nenhum obstáculo reciclando. Trocado por laço indexado sem alocação.
  `GameManager.update` criava uma closure nova a cada frame pro callback
  de pontuação — trocado por método vinculado uma única vez
  (`this._onObstaclePassed`, ligado no construtor). Memória JS heap
  medida estável (~5,6–6,6MB) ao longo de 8s de jogo contínuo com reinício
  automático — sem tendência de crescimento, sem vazamento aparente.
- **Bundle**: `three.js` separado num chunk próprio (`manualChunks`) — o
  código do jogo em si fica em ~30KB, e o chunk do three (~485KB) só é
  rebaixado de novo pelo navegador quando a própria lib mudar, não a cada
  deploy do jogo.
- **Lazy loading**: árvores carregam depois do primeiro frame (assíncrono,
  não bloqueia), áudio só inicializa num gesto real do usuário — ambos já
  garantidos desde as fases 1 e 4.

**O que NÃO foi possível verificar aqui** (pendente, ação do José):
- **FPS em celular real de entrada** — o item mais explícito do checklist
  ("testar em aparelho real, não só emulador/desktop") não tem como ser
  cumprido neste ambiente. Rodei em Chromium headless com rasterizador por
  software (`swiftshader`, sem aceleração de GPU de verdade) só como sanity
  check: ~30fps estáveis, sem degradação ao longo do tempo — mas esse
  número reflete o gargalo do software rendering, não representa hardware
  real. Dada a carga baixíssima da cena (4 draw calls, 14k triângulos),
  60fps em GPU real de celular de entrada é o resultado esperado, mas
  **isso precisa ser confirmado por José em um aparelho físico** antes de
  considerar o checklist 100% fechado.

**Alternativas descartadas**: fingir um número de FPS "de aparelho real" —
inventaria um dado que não foi medido; melhor documentar exatamente o que
foi e não foi verificado.
