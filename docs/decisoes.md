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
