import { defineConfig } from "vite";

export default defineConfig({
  server: {
    headers: {
      // Required for SharedArrayBuffer which is needed by ONNX Runtime Web
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp",
    },
  },
  optimizeDeps: {
    exclude: ["@huggingface/transformers"],
  },
  build: {
    target: "esnext",
  },
});
