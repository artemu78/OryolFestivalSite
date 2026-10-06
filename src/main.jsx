import content from "./site.json";
import React, { useEffect, useState } from "react";
import { useAuth } from "./context/AuthContext";
import { Admin, AdminAccess } from "./components/Admin";
import { createRoot } from "react-dom/client";
import "./styles.css";
import { Header, Main, Footer } from "./components";
import { AuthProvider } from "./context/AuthContext";
import { DataProvider } from "./context/DataContext";
import { ParticipantWelcome } from "./components/ParticipantWelcome";

const community = content.links.community;
// Fill after agreeing the studio contact with the owner. No invented contact URL.
const studioContact = "";

function App() {
  const { access_token: accessKey } = useAuth();
  const [adminPage, setAdminPage] = useState(location.hash === "#admin");
  useEffect(() => {
    const change = () => setAdminPage(location.hash === "#admin");
    window.addEventListener("hashchange", change);
    return () => window.removeEventListener("hashchange", change);
  }, []);
  return (
    <>
      <a className="skip-link" href="#main">
        {content.main.skip}
      </a>
      <Header community={community} />
      <AdminAccess />
      {adminPage ? (
        <Admin key={accessKey} />
      ) : (
        <>
          <ParticipantWelcome />
          <Main community={community} />
        </>
      )}
      <Footer community={community} studioContact={studioContact} />
    </>
  );
}

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
