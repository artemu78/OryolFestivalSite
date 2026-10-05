import content from "../site.json";
import React from "react";
import { experts } from "../experts";

export function Experts() {
  return (
    <section id="experts" className="section experts wrap">
      <div className="section-label">{content.Experts.label}</div>
      <div className="section-heading">
        <h2>
          {content.Experts.title}<em>{content.Experts.titleEmphasis}</em>
        </h2>
        <p>{content.Experts.description}</p>
      </div>
      <div className="expert-grid">
        {experts.map((expert) => (
          <article className="expert" key={expert.id}>
            <div className="expert-art">
              <a
                className="expert-photo-link"
                href={expert.profile}
                target="_blank"
                rel="noreferrer"
                aria-label={content.Experts.profileLabel.replace("{name}", expert.name)}
              >
                <img
                  className="expert-photo"
                  src={`${import.meta.env.BASE_URL}${expert.photo}`}
                  alt={expert.name}
                  loading="lazy"
                />
              </a>
            </div>
            <h3>
              <a href={expert.profile} target="_blank" rel="noreferrer">
                {expert.name} ↗
              </a>
            </h3>
            <span className="expert-role">{expert.role}</span>
            <p>{expert.text}</p>
            <a
              className="expert-profile"
              href={expert.profile}
              target="_blank"
              rel="noreferrer"
            >
              {content.Experts.profile}
            </a>
          </article>
        ))}
      </div>
    </section>
  );
}
