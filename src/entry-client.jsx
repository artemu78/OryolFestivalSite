import React from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import { Root } from "./Root";
import "./styles.css";

console.log(`Version: ${import.meta.env.VITE_APP_VERSION}`);

const container = document.getElementById("root");
const initialData = JSON.parse(
  document.getElementById("initial-data").textContent,
);
const tree = <Root initialData={initialData} />;

if (import.meta.env.DEV) {
  createRoot(container).render(tree);
} else {
  hydrateRoot(container, tree, {
    onRecoverableError(error, info) {
      console.error("Hydration failed", error, info.componentStack);
    },
  });
}
