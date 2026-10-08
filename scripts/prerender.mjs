import { readFile, writeFile } from "node:fs/promises";
import { render } from "../.prerender/server/entry-server.js";

const initialData = JSON.parse(
  await readFile(".prerender/public-snapshot.json", "utf8"),
);
const template = await readFile("dist/index.html", "utf8");
const html = await render(initialData);
const dataMarker =
  '<script id="initial-data" type="application/json">null</script>';
const appMarker = "<!--app-html-->";

for (const marker of [appMarker, dataMarker]) {
  if (template.split(marker).length !== 2) {
    throw new Error(`Expected one marker: ${marker}`);
  }
}

// Prevent a string value from closing the JSON script element.
const json = JSON.stringify(initialData).replaceAll("<", "\u003c");
const result = template
  .replace(appMarker, () => html)
  .replace(
    dataMarker,
    () => `<script id="initial-data" type="application/json">${json}</script>`,
  );

await writeFile("dist/index.html", result);
