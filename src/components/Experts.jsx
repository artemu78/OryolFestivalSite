import { assetUrl } from '../assetUrl';
import content from "../site.json";
import React from "react";
import { useData } from "../context/DataContext";

export function Experts() {
  const { expertProfiles, loading, dataError } = useData();
  // console.log("expertProfiles", expertProfiles);
  // // console.log("experts", experts);

  return (
    <section id="experts" className="section experts wrap">
      <div className="section-label">{content.Experts.label}</div>
      <div className="section-heading">
        <h2>
          {content.Experts.title}
          <em>{content.Experts.titleEmphasis}</em>
        </h2>
        <p>{content.Experts.description}</p>
      </div>
      <div className="expert-grid">
        {expertProfiles.map((expert) => (
          <article className="expert" key={expert.user_id}>
            <div className="expert-art">
              <a
                className="expert-photo-link"
                href={expert.profile}
                target="_blank"
                rel="noreferrer"
                aria-label={content.Experts.profileLabel.replace(
                  "{name}",
                  expert.name,
                )}
              >
                <img
                  className="expert-photo"
                  src={assetUrl(expert.photo)}
                  alt={expert.name}
                  loading="lazy"
                />
              </a>
            </div>
            <h3>
              <a href={expert.profile_url} target="_blank" rel="noreferrer">
                {expert.name} ↗
              </a>
            </h3>
            <span className="expert-role">{expert.professional_title}</span>
            <p>{expert.bio}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
