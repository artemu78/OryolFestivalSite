import content from "../site.json";
import React from "react";
import { Flower } from "./Flower";

const defaultCommunity = content.links.community;

export function Videos({ community = defaultCommunity }) {
  return (
    <section id="videos" className="video-section wrap">
      <div className="video-art" aria-hidden="true">
        <span className="video-orbit" />
        <Flower />
        <span className="video-word">
          {content.Videos.art}
          <br />
          <em>{content.Videos.artEmphasis}</em>
        </span>
      </div>
      <div className="video-copy">
        <div className="section-label">{content.Videos.label}</div>
        <h2>
          {content.Videos.title}<br />
          <em>{content.Videos.titleEmphasis}</em>
        </h2>
        <p>
          {content.Videos.description}
        </p>
        <a
          className="text-link"
          href={community}
          target="_blank"
          rel="noreferrer"
        >
          {content.links.communityLink}<span>↗</span>
        </a>
        <span className="video-soon">{content.Videos.soon}</span>
      </div>
    </section>
  );
}

export { Videos as LiveVoices };
