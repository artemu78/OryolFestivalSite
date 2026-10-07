import pkg from "./package.json";
import content from "./src/site.json";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { publicAssetVersions } from "./scripts/public-asset-versions.js";
import { fileURLToPath } from "node:url";
import imageVariants from "./public/optimized-images/manifest.json";

const assetVersions = publicAssetVersions(
  fileURLToPath(new URL("./public", import.meta.url)),
);
const brandImage = imageVariants['logos/main_logo.jpg'].brand.path;
let resolvedBase;

export default defineConfig({
  define: {
    "import.meta.env.VITE_APP_VERSION": JSON.stringify(pkg.version),
    __PUBLIC_ASSET_VERSIONS__: JSON.stringify(assetVersions),
  },
  base: process.env.PAGES_BASE_PATH || "/",
  plugins: [
    react(),
    {
      name: "site-content",
      configResolved(config) {
        resolvedBase = config.base;
      },
      transformIndexHtml(html) {
        const escape = (value) =>
          value
            .replaceAll("&", "&amp;")
            .replaceAll('"', "&quot;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;");
        return html
          .replace("%SITE_TITLE%", escape(content.metadata.title))
          .replace("%SITE_DESCRIPTION%", escape(content.metadata.description))
          .replace("%DESKTOP_POSTER_HASH%", assetVersions["girls/1001.jpg"])
          .replace(
            "%MOBILE_POSTER_HASH%",
            assetVersions["girls/1001-mobile.jpg"],
          )
          .replace("%MAIN_LOGO_URL%", `${resolvedBase}${brandImage}?v=${assetVersions[brandImage]}`)
          .replace(
            'favicon.svg"',
            `favicon.svg?v=${assetVersions["favicon.svg"]}"`,
          );
      },
    },
  ],
  server: {
    host: "127.0.0.1",
    allowedHosts: [
      "mentalhealthfestival.ru",
      "xn--80aaecegccue9ackpcqbca3bewh1b5qgk8f.xn--p1ai",
    ],
    proxy: {
      "/api/admin": {
        target: "https://functions.yandexcloud.net",
        changeOrigin: true,
        rewrite: (path) =>
          path.replace(/^\/api\/admin/, "/d4e278ej3sclqe0bfsro"),
      },
    },
  },
  preview: {
    host: "127.0.0.1",
    allowedHosts: [
      "mentalhealthfestival.ru",
      "xn--80aaecegccue9ackpcqbca3bewh1b5qgk8f.xn--p1ai",
    ],
  },
});
