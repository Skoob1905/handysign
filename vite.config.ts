import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import fs from "node:fs";

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version ?? "0.0.0"),
  },
  plugins: [react(), tailwindcss()],
  server: {
    host: "localhost",
    port: 5000,
    https: {
      key: fs.readFileSync("certs/handysign.local-key.pem"),
      cert: fs.readFileSync("certs/handysign.local-cert.pem"),
    },
  },
});
