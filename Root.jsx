import React from "react";
import { App } from "./App";
import { AuthProvider } from "./context/AuthContext";
import { DataProvider } from "./context/DataContext";

export function Root({ initialData }) {
  return (
    <React.StrictMode>
      <AuthProvider>
        <DataProvider initialData={initialData}>
          <App />
        </DataProvider>
      </AuthProvider>
    </React.StrictMode>
  );
}
