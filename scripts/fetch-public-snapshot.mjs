import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const apiUrl = "https://functions.yandexcloud.net/d4e278ej3sclqe0bfsro";
const outputPath = fileURLToPath(
  new URL("../.prerender/public-snapshot.json", import.meta.url),
);

function requireRows(result, key) {
  if (!Array.isArray(result[key])) {
    throw new Error(`API returned an invalid ${key} collection`);
  }
  return result[key];
}

function pick(row, keys) {
  return Object.fromEntries(
    keys.filter((key) => key in row).map((key) => [key, row[key]]),
  );
}

const response = await fetch(apiUrl, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ action: "list" }),
  cache: "no-store",
  signal: AbortSignal.timeout(30_000),
});

let result;
try {
  result = await response.json();
} catch (error) {
  throw new Error(`API returned invalid JSON (HTTP ${response.status})`, {
    cause: error,
  });
}

if (!response.ok) {
  throw new Error(
    `Public data request failed (HTTP ${response.status}): ${
      result?.error || response.statusText
    }`,
  );
}
if (!result || typeof result !== "object" || Array.isArray(result)) {
  throw new Error("API returned an invalid response");
}

const users = requireRows(result, "users").map((user) =>
  pick(user, ["id", "name"]),
);
const snapshot = {
  users,
  events: requireRows(result, "events"),
  expertProfiles: requireRows(result, "expert_profiles").map((profile) =>
    pick(profile, [
      "user_id",
      "photo",
      "profile_url",
      "professional_title",
      "bio",
      "sort_order",
    ]),
  ),
  hosts: requireRows(result, "hosts").map((host) =>
    pick(host, ["user_id", "event_id"]),
  ),
  attendance: [],
  sponsors: requireRows(result, "sponsors")
    .filter((sponsor) => sponsor.display === true)
    .map((sponsor) =>
      pick(sponsor, ["id", "name", "image", "link", "display"]),
    ),
};

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
console.log(`Saved public snapshot to ${outputPath}`);