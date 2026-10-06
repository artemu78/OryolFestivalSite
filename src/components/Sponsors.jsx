import React from "react";
import content from "../site.json";
import sponsors from "../sponsors.json";

export function Sponsors() {
  return (
    <section id="sponsors" className="section sponsors wrap" aria-labelledby="sponsors-title">
      <div className="section-label">{content.Sponsors.label}</div>
      <div className="section-heading">
        <h2 id="sponsors-title">{content.Sponsors.title}</h2>
        <p>{content.Sponsors.description}</p>
      </div>
      <ul className="sponsor-grid">
        {sponsors.map(({ name, logo, crop }) => (
          <li className="sponsor-card" key={logo}>
            <div className={`sponsor-logo${crop ? " sponsor-logo--screenshot" : ""}`}>
              <img src={`${import.meta.env.BASE_URL}${logo}`} alt={name} loading="lazy" decoding="async" />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
