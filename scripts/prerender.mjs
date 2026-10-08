import { readFile, writeFile } from "node:fs/promises";
import { render } from "../.prerender/server/entry-server.js";

const initialData = JSON.parse(
  await readFile(".prerender/public-snapshot.json", "utf8"),
);

// enchance expert profiles with user names for the prerender snapshot
// This is necessary because expert profiles are stored in a separate table and the names are not included in the snapshot. The names are needed for the prerendered HTML to display correctly.
const enchancedProfiles = enhanceExpertProfiles(
  Array.isArray(initialData.expertProfiles) ? initialData.expertProfiles : [],
  Array.isArray(initialData.users) ? initialData.users : [],
);
initialData.expertProfiles = enchancedProfiles;

const template = await readFile("dist/index.html", "utf8");
const html = await render(initialData);
const dataMarker = '{ "app": "data" }';
const appMarker = "<!--app-html-->";

for (const marker of [appMarker, dataMarker]) {
  if (template.split(marker).length !== 2) {
    throw new Error(`Expected one marker: ${marker}`);
  }
}

// Prevent a string value from closing the JSON script element.
const json = JSON.stringify(initialData).replaceAll("<", "\\u003c");
const result = template
  .replace(appMarker, () => html)
  .replace(dataMarker, () => json);

await writeFile("dist/index.html", result);

function enhanceExpertProfiles(expertProfiles, users) {
  const usersById = Object.fromEntries(users.map((user) => [user.id, user]));
  return expertProfiles.map((profile) => {
    const user = usersById[profile.user_id];
    return {
      ...profile,
      name: user?.name || profile.name || "Неизвестный эксперт",
    };
  });
}
