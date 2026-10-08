import React from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import { Root } from "./Root";
import "./styles.css";

const container = document.getElementById("root");
const tree = <Root initialData={initialData} />;

const initialData = JSON.parse(
  document.getElementById("initial-data").textContent,
);

if (import.meta.env.DEV) {
  createRoot(container).render(tree);
} else {
  hydrateRoot(container, tree, {
    onRecoverableError(error, info) {
      console.error("Hydration failed", error, info.componentStack);
    },
  });
}
