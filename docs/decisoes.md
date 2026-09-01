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

---

## ADR 016 — Controle por câmera: rastreamento facial via MediaPipe, opt-in, nunca substitui o toque

**Contexto**: pedido do José pra "jogabilidade via câmera" — depois de
esclarecer com ele (câmera física do celular, não a câmera 3D do jogo),
ficou definido: gesto = abrir a boca ou levantar a sobrancelha; opcional,
o toque continua sendo o controle padrão.

**Decisão — biblioteca**: `@mediapipe/tasks-vision` (`FaceLandmarker` com
`outputFaceBlendshapes: true`) — é o pacote oficial do Google pra
landmarks faciais no navegador via WASM, mantido ativamente, com delegate
`GPU` e fallback automático pra `CPU` se o `GPU` falhar (celular
fraco/navegador sem suporte). Uso as categorias de blendshape `jawOpen`
(boca aberta) e `browInnerUp`/`browOuterUpLeft`/`browOuterUpRight`
(sobrancelha levantada) — qualquer uma delas passando de um limiar
(0.55, com histerese até 0.35 pra não disparar de novo enquanto o gesto
continua) dispara um flap, pelo mesmo caminho (`GameManager.flap()`) que o
toque já usa.

**Decisão — performance**: a fase 7 acabou de fechar o checklist de 60fps;
IA facial rodando toda hora seria um risco real de regressão. Mitigado
com:
- Detecção throttled a ~8x/seg (`DETECTION_INTERVAL_MS = 120`), não a cada
  frame de render — gesto facial é lento, 60Hz de amostragem seria
  desperdício de CPU sem ganho de responsividade.
- Pausa automática quando a aba fica em background (`document.hidden`).
- **100% opt-in e sob demanda**: nada relacionado a câmera é importado no
  bundle principal — `CameraInput.js` (que importa o `@mediapipe/tasks-vision`,
  ~145KB minificado) só é carregado via `import()` dinâmico dentro do
  clique no botão "Controle por câmera". Achado durante esta fase: a
  primeira versão importava estático no topo do `main.js` e isso sozinho
  inflou o bundle principal de ~30KB pra ~177KB — contrariando o próprio
  princípio de lazy loading que vínhamos seguindo desde a fase 1. Corrigido
  antes de commitar (bundle principal voltou a ~33KB; o chunk de câmera só
  baixa se o jogador realmente clicar).
- O modelo (`face_landmarker.task`, alguns MB) e o runtime WASM
  (`@mediapipe/tasks-vision`, ~12MB por variante SIMD/não-SIMD) vêm de CDN
  externo (`storage.googleapis.com` e `cdn.jsdelivr.net`, respectivamente)
  — carregados só quando a câmera é ativada, nunca embutidos no `dist/` do
  projeto. Evita inflar o deploy em ~12-34MB pra uma feature que a maioria
  dos jogadores nunca vai tocar.

**Decisão — UX/acessibilidade**: botão dedicado no menu
("🎥 Controle por câmera (experimental)"), com `aria-pressed` e texto de
status (`role="status"`) reportando o que está acontecendo (carregando,
ativo, ou erro — sempre deixando claro que o toque continua funcionando).
Preview de vídeo pequeno (espelhado, canto da tela) some quando a câmera é
desligada. Sem persistência da preferência entre sessões — evita reabrir a
câmera sozinho a cada load (permission prompt surpresa é ruim de UX e
levanta bandeira de privacidade); o jogador liga de novo se quiser.

**Testado**: fluxo completo validado em Chromium headless com dispositivo
de câmera falso (`--use-fake-device-for-media-stream` +
`--use-fake-ui-for-media-stream`) — permissão concedida, vídeo anexado e
tocando, import dinâmico do módulo funcionando, chamada correta da API do
MediaPipe (confirmado contra o `.d.ts` do pacote). **Não foi possível
testar o carregamento do WASM/modelo de ponta a ponta neste ambiente**: o
proxy de rede deste sandbox bloqueia `cdn.jsdelivr.net` por política
própria (confirmado via `net::ERR_TUNNEL_CONNECTION_FAILED`, não um erro
de código) — isso não afeta o navegador real de um jogador, que não passa
por esse proxy. O caminho de falha foi validado de propósito: com o WASM
bloqueado, o código caiu certinho no fallback gracioso ("não foi possível
ligar a câmera, toque continua funcionando"), que é o mesmo caminho que um
celular sem suporte a WebAssembly/câmera passaria.

**Pendente (José, ação necessária)**: testar o controle por câmera de
verdade num navegador com internet normal (fora deste sandbox) — o código
está pronto e o único ponto não verificável aqui foi justamente o download
do WASM via CDN, que deve funcionar normalmente fora deste ambiente restrito.

**Alternativas descartadas**:
- Movimento genérico (diff de pixel entre frames) — mais leve, mas o José
  pediu especificamente boca/sobrancelha, que precisa de landmarks reais.
- Substituir o toque pela câmera — José escolheu explicitamente manter
  como opção alternativa (menos risco, sempre tem um controle que
  funciona mesmo sem câmera/permissão).
- Hospedar o WASM (~12-34MB) dentro do próprio `dist/` do projeto em vez
  de CDN — evitaria a dependência externa, mas infla o deploy pra uma
  feature opt-in que a maioria não vai usar; jsDelivr é o CDN
  oficialmente recomendado pelo MediaPipe e extremamente confiável em
  produção real (o bloqueio visto aqui é específico deste sandbox de
  desenvolvimento).

---

## ADR 017 — Mergulho ("dive"): boca sobe, sobrancelha mergulha, controle tipo drone

**Contexto**: depois de implementar o gesto único (boca OU sobrancelha =
flap), o José pediu algo mais avançado — "movimentos de voo bem
avançados, como um drone", com boca e sobrancelha fazendo coisas
diferentes, incluindo "descer com tudo fechando as asas".

**Decisão — mapeamento de gestos**: em vez de um único gesto disparando a
mesma ação, agora são dois gestos independentes com ações opostas —
boca aberta (`jawOpen`) = flap (sobe), sobrancelha levantada
(`browInnerUp`/`browOuterUp*`) = mergulho (desce rápido, fechando as
asas). Isso dá ao jogador dois comandos direcionais (cima/baixo) em vez de
só "cima ou nada", que é o que de fato lembra pilotar um drone — controle
ativo nos dois eixos, não só reagir à gravidade.

**Decisão — física do mergulho**: `Bird.dive()` aplica um impulso forte
pra baixo (`DIVE_IMPULSE = -15`) e, por `DIVE_DURATION = 0.6s`, troca o
teto de velocidade de queda de `-18` (normal) pra `-28`
(`DIVE_MAX_FALL_SPEED`) — sem essa troca temporária, o clamp normal de
velocidade anularia a sensação de "mergulho mais rápido que cair" já no
frame seguinte. `flap()` cancela um mergulho em andamento e vice-versa —
o jogador sempre pode "puxar pra cima" de um mergulho, dá mais controle
e evita a sensação de estar preso numa animação.

**Decisão — visual sem gastar draw call extra**: o pássaro é um único
`Mesh`/`BufferGeometry` (1 draw call, spec §9.1) — animar as asas
fechando "de verdade" exigiria separar em sub-meshes articulados, o que
custaria mais draw calls e complexidade de rig. Em vez disso, a pose de
mergulho é simulada só com transformações no mesh inteiro: `scale.x` encolhe
(`DIVE_SCALE_X = 0.55` — silhueta mais fina, "lê" como asas fechadas no
estilo low-poly do jogo) e `rotation.x` inclina o bico pra baixo
(`DIVE_PITCH`), tudo com um blend suave (`_diveBlend`, lerp) pra entrar e
sair da pose sem trocar de repente. Zero draw call adicional, zero
triângulo a mais.

**Decisão — três formas de disparar cada ação, sempre**: como o mergulho
virou uma mecânica de verdade (não só um extra da câmera), ele passou a
existir nos três controles, simetricamente:
- Toque: arrastar pra baixo depois de tocar (`InputController` — o toque
  já dispara o flap instantâneo, se o dedo arrastar mais de 40px pra
  baixo na mesma tocada, dispara também o mergulho — os dois no mesmo
  gesto, natural de fazer com uma mão só).
- Teclado: seta-baixo/S (além de espaço/seta-cima pro flap, já existentes).
- Câmera: sobrancelha (além da boca pro flap).

Sem isso, o mergulho ficaria trancado atrás da câmera — a maioria dos
jogadores (que não vai ligar a câmera) nunca acessaria a mecânica nova.
Acessibilidade não é exceção (padrões §5).

**Achado durante a implementação**: `continueWithAd()` (fase 5) reposicionava
o pássaro manualmente (`bird.mesh.position.y = 0.5`) sem limpar o estado de
mergulho — se o jogador morresse no meio de um mergulho e usasse o anúncio
pra continuar, a pose de mergulho (asas fechadas, bico baixo) ficaria
"grudada" mesmo depois de retomar. Corrigido com um método novo,
`Bird.resetPose(y)`, que reseta velocidade/pose/escala mantendo X/Z —
GameManager chama isso em vez de mexer direto nos campos do pássaro.

**Testado**: física do mergulho (impulso, boost de queda temporário),
blend visual (escala + inclinação, confirmado em valores intermediários
reais durante o mergulho e de volta a ~1 depois), cancelamento mútuo
flap↔dive, e os três caminhos de entrada (swipe no toque, seta-baixo no
teclado, encadeamento correto do gesto de sobrancelha na câmera) — tudo
validado em Chromium headless. Sem regressão nos 20 testes unitários
existentes.

**Alternativas descartadas**:
- Sub-meshes articulados pra asas de verdade dobrarem — mais fiel
  visualmente, mas custa draw calls extras e um rig de animação que o
  estilo low-poly flat-shaded do jogo não pede.
- Mergulho só na câmera (sem toque/teclado) — deixaria a mecânica nova
  inacessível pra quem não usa câmera, contrariando acessibilidade.
- Hitbox de colisão menor durante o mergulho ("esguio, passa mais fácil")
  — ideia divertida, mas não foi pedida; mudar o hitbox junto com a
  velocidade duplica as variáveis de balanceamento pra acertar de uma vez
  só. Fica registrada aqui como ideia pra uma próxima iteração se o José
  achar que o mergulho está difícil demais de usar perto do chão.
