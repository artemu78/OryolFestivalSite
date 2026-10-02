import content from "../site.json";
import React from "react";

export function About() {
  return (
    <section id="about" className="about section wrap">
      <div className="section-label">{content.About.label}</div>
      <div className="about-content">
        <h2>
          {content.About.title}
          <br />
          {content.About.titleLead}<em>{content.About.titleEmphasis}</em>
        </h2>
        <div className="about-columns">
          <p>
            {content.About.intro}
          </p>
          <p>
            {content.About.description}
          </p>
        </div>
        <div className="values">
          <span>{content.About.valueTalk}</span>
          <span>{content.About.valuePractice}</span>
          <span>{content.About.valueConnection}</span>
        </div>
      </div>
    </section>
  );
}
