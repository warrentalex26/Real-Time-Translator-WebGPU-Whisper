import { defineConfig } from "vite";

export default defineConfig({
  server: {
    headers: {
      // Required for SharedArrayBuffer which is needed by ONNX Runtime Web
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp",
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        api: "modern-compiler",
      },
    },
  },
  optimizeDeps: {
    exclude: ["@huggingface/transformers"],
  },
  build: {
    target: "esnext",
  },
});
