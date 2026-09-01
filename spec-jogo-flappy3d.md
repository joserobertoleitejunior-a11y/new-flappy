# Spec — Jogo Mobile "Flappy 3D" (nome provisório)

## 1. Conceito
Jogo estilo **Flappy Bird**, mas em **3D**, feito para **celular** (toque na tela), com visual leve e viciante, pensado para gerar receita via anúncios e/ou compras.

Referência de estilo visual: cenário low-poly colorido (colinas, céu, nuvens), câmera em terceira pessoa atrás do personagem — como no vídeo do "Skypeck", mas com a mecânica simples do Flappy Bird (um toque = um "bater de asa"/pulo).

## 2. Mecânica principal
- Personagem (pássaro) avança automaticamente para frente.
- **Toque na tela = impulso pra cima** (flap), gravidade puxa pra baixo o tempo todo.
- Obstáculos em 3D no caminho (canos, arcos, troncos, portais) — passar por dentro do vão.
- Colisão = game over → tela de "tentar de novo".
- Pontuação: +1 a cada obstáculo passado. Recorde salvo localmente.
- Dificuldade aumenta progressivamente (velocidade, vãos menores).

## 3. Controles (mobile)
- Toque simples em qualquer parte da tela = flap.
- Sem botões complexos — precisa funcionar com uma mão só, tela cheia.

## 4. Arte e som
- Estilo low-poly / flat 3D, cores vivas.
- Personagem trocável (skins) — gancho pra monetização.
- Música leve em loop + efeitos sonoros de flap, ponto e colisão.

## 5. Monetização (foco do projeto)
- **Anúncios intersticiais**: a cada X game overs (ex: a cada 3 mortes).
- **Anúncio recompensado**: assistir vídeo pra "continuar de onde morreu" (1x por partida).
- **Loja de skins**: compra única (R$) ou desbloqueio via anúncio recompensado, pra quem não quer pagar.
- **Ranking/leaderboard**: aumenta retenção e tempo de tela (mais impressões de ads).
- Rede recomendada: **Google AdMob** (padrão de mercado, fácil integração via Capacitor).

## 6. Stack técnica sugerida
- **Three.js** — engine 3D, roda leve em navegador mobile.
- **Cannon-es** (ou física simples manual) — colisão e gravidade.
- **Capacitor** — empacota o jogo web (HTML/JS) como app Android/iOS real, permitindo:
  - Publicar na Google Play / App Store
  - Integrar AdMob nativo (plugin `@capacitor-community/admob`)
- Alternativa mais rápida pra validar: publicar como **PWA/web** primeiro (sem loja de app), monetizando com anúncios web (Google AdSense/Ad Manager) e testando se o jogo "pega" antes de investir tempo publicando nas lojas.

## 7. Estrutura de arquivos sugerida
```
/src
  /game
    Bird.js          → personagem, física do flap
    Obstacles.js      → geração e movimento dos obstáculos
    GameManager.js     → estado do jogo, pontuação, game over
    InputController.js → captura de toque
  /ui
    HUD.js            → placar, botão de recomeçar
    Shop.js           → loja de skins
  /ads
    AdManager.js       → intersticial, recompensado
  main.js
index.html
```

## 8. Roadmap (MVP primeiro)
1. Cenário 3D + pássaro com gravidade e flap por toque
2. Geração de obstáculos + colisão + game over
3. Placar e recorde salvo (localStorage)
4. Loop de música/som
5. Integração AdMob (interstitial + rewarded)
6. Loja de skins simples
7. Empacotar com Capacitor e publicar

## 9. Padrões da agência (VIBE CODING PROCESS) aplicados a este projeto

Este projeto segue o `PADROES-AGENCIA.md` da agência (cole o arquivo na raiz do
repositório). Abaixo, a leitura de cada seção adaptada pra um jogo — com foco
extra em **performance**, que é o pedido específico aqui.

### 9.1 Performance e otimização mobile (prioridade nº 1 do jogo)
- **Orçamento de polígonos**: pássaro < 5k tris, cada obstáculo/árvore < 2k tris —
  Three.js em celular sofre rápido com geometria pesada.
- **Instancing**: qualquer elemento repetido (árvores, canos, moedas) usa
  `InstancedMesh`, nunca um `Mesh` novo por objeto.
- **Object pooling**: obstáculos são reciclados (reposicionados), nunca
  criados/destruídos a cada frame — evita garbage collection travando o jogo.
- **Texturas comprimidas** (KTX2/Basis) e limitadas a 512×512 para mobile;
  nada de textura 4K "porque sobrou no pack".
- **Draw calls**: mesclar geometria estática do cenário sempre que possível.
- **Meta de performance**: 60fps num celular de entrada (testar em aparelho
  real, não só emulador/desktop — celular fraco é o público real do jogo).
- **Lazy loading**: sons e modelos fora da tela inicial carregam sob demanda,
  não travam o primeiro load.

### 9.2 Governança e versionamento
- Toda funcionalidade nasce como Issue (`bug`/`melhoria`/`feature`).
- Commits no padrão `tipo(escopo): descrição` (ex: `feat(bird): adiciona física do flap`).
- Nada direto na `main` — sempre branch (`feature/...`) + PR, mesmo sozinho.

### 9.3 Qualidade de código
- Estrutura modular desde o commit 1 (ver seção 7 acima) — nunca um único
  arquivo gigante.
- Lint com Biome rodando antes de merge.
- Função com mais de ~80 linhas é sinal de quebrar em partes menores.

### 9.4 Observabilidade
- Sentry plugado desde o início — se o jogo travar no celular de alguém, você
  fica sabendo antes da nota 1 estrela na loja.

### 9.5 Segurança
- Chave do AdMob (e qualquer outra) em variável de ambiente, nunca hardcoded
  no código-fonte do app.

### 9.6 Testes
- Teste E2E (Playwright, ou equivalente mobile) cobrindo o caminho feliz:
  abrir → jogar → morrer → ver anúncio → reiniciar.

### 9.7 Acessibilidade e responsividade
- Testar em várias resoluções de tela de celular (o jogo é mobile-first).
- Respeitar `prefers-reduced-motion` nas telas de menu/loja, mesmo sendo jogo.

### 9.8 SEO e crescimento (se houver landing page/PWA)
- Se o jogo tiver uma página de divulgação (pra baixar ou jogar via PWA),
  aplica o checklist de SEO padrão da agência: `og:image`, meta description
  únicos, Schema.org quando fizer sentido — ajuda o compartilhamento viral
  no TikTok/Instagram, que é o canal de distribuição natural desse tipo de jogo.

## 10. Prompt inicial pronto para o Claude Code
```
Crie um jogo mobile estilo Flappy Bird em 3D usando Three.js, otimizado pra
navegador de celular (toque na tela = impulso pra cima, gravidade constante).
Câmera em terceira pessoa atrás de um personagem que avança sozinho.
Obstáculos 3D aparecem no caminho com um vão pra passar; colisão = game over.
Adicione placar, recorde salvo em localStorage, e tela de reiniciar.

Siga os padrões descritos em PADROES-AGENCIA.md na raiz do repositório
(estrutura modular, lint, commits padronizados, Sentry, testes E2E) e as
regras de performance da seção 9.1 deste documento (instancing, object
pooling, orçamento de polígonos, texturas comprimidas, meta de 60fps em
celular de entrada).

Comece pelo MVP: cenário simples, física do flap, geração de obstáculos e
colisão funcionando, já respeitando os padrões de performance acima. Deixe a
estrutura pronta pra eu integrar AdMob via Capacitor depois.
```

## 11. Observações
- Monetização real exige volume de jogadores — vale pensar em distribuição
  (compartilhar nas redes, TikTok/Reels do gameplay) desde o início.
- Testar primeiro como PWA/web é mais rápido que já sair publicando nas lojas.
