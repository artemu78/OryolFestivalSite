import content from "./site.json";
import React, { useEffect, useState } from "react";
import { useAuth } from "./context/AuthContext";
import { Admin, AdminAccess } from "./components/Admin";
import { Header, Main, Footer } from "./components";
import { ParticipantWelcome } from "./components/ParticipantWelcome";

const community = content.links.community;
// Fill after agreeing the studio contact with the owner. No invented contact URL.
const studioContact = "https://reva-studio.online/";

export function App() {
  const { access_token: accessKey } = useAuth();
  const [adminPage, setAdminPage] = useState(false);

  useEffect(() => {
    const change = () => setAdminPage(location.hash === "#admin");
    change();
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
