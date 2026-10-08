import React from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
import { AuthProvider } from "./context/AuthContext";
import { DataProvider } from "./context/DataContext";

console.log(`Version: ${import.meta.env.VITE_APP_VERSION}`);

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthProvider>
      <DataProvider>
        <App />
      </DataProvider>
    </AuthProvider>
  </React.StrictMode>,
);
