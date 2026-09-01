import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  // Os assets 3D da Kenney vivem em /assets na raiz do repo (fora de /src);
  // servimos essa pasta como publicDir pra ficarem disponíveis em runtime
  // sem duplicar os arquivos dentro de uma pasta public/.
  publicDir: "assets",
  build: {
    target: "es2020",
    sourcemap: true,
    rollupOptions: {
      output: {
        // three.js muda muito menos que o código do jogo — separar num
        // chunk próprio deixa o cache do navegador reaproveitável entre
        // deploys (o jogador não rebaixa ~500KB a cada atualização do
        // jogo, só quando o three.js em si mudar).
        manualChunks: { three: ["three"] },
      },
    },
  },
  test: {
    environment: "node",
  },
});
