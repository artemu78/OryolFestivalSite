import content from "../site.json";
import React from "react";

const defaultCommunity = content.links.community;

export function Footer({ community = defaultCommunity, studioContact = "" }) {
  return (
    <footer className="footer wrap">
      <div>
        <span>{content.Footer.name}</span>
        <small>{content.Footer.date}</small>
      </div>
      <a href={community} target="_blank" rel="noreferrer">
        {content.Footer.social}
      </a>
      {studioContact ? (
        <a href={studioContact}>{content.Footer.studioLink}</a>
      ) : (
        <span className="studio-credit">{content.Footer.studio}</span>
      )}
    </footer>
  );
}
