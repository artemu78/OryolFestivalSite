import React from "react";
import { experts } from "../experts";

export function Experts() {
  return (
    <section id="experts" className="section experts wrap">
      <div className="section-label">03 / ЛЮДИ ФЕСТИВАЛЯ</div>
      <div className="section-heading">
        <h2>
          Рядом — <em>люди.</em>
        </h2>
        <p>Со знаниями, опытом и вниманием к вам.</p>
      </div>
      <div className="expert-grid">
        {experts.map((expert) => (
          <article className="expert" key={expert.name}>
            <div className="expert-art">
              <a
                className="expert-photo-link"
                href={expert.profile}
                target="_blank"
                rel="noreferrer"
                aria-label={`Профиль ${expert.name} ВКонтакте`}
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
              Профиль ВКонтакте ↗
            </a>
          </article>
        ))}
      </div>
    </section>
  );
}
