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
