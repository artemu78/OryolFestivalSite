import React from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
import { Header, Main, Footer } from "./components";
import { AuthProvider } from "./context/AuthContext";

const community = "https://vk.ru/club241058655";
// Fill after agreeing the studio contact with the owner. No invented contact URL.
const studioContact = "";

function App() {
  return (
    <>
      <a className="skip-link" href="#main">
        К содержанию
      </a>
      <Header community={community} />
      <Main community={community} />
      <Footer community={community} studioContact={studioContact} />
    </>
  );
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>,
);
