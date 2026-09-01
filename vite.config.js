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
  },
  test: {
    environment: "node",
  },
});
