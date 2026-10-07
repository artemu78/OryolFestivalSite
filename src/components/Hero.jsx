import content from "../site.json";
import React from "react";
import { HeroMedia } from "./HeroMedia";

export function Hero() {
  return (
    <section className="hero hero-with-media wrap">
      <HeroMedia />
      <div className="hero-copy">
        <div className="eyebrow">
          <span className="dot" /> {content.Hero.eyebrow}
        </div>
        <h1>
          {content.Hero.title}
          <br />{content.Hero.titleLead}<em>{content.Hero.titleEmphasis}</em>
        </h1>
        <p className="hero-subtitle">
          {content.Hero.subtitle}
          <br />
          {content.Hero.subtitleSecond}
        </p>
        <div className="hero-charity">
          {content.Hero.charityNotice}
        </div>
        <p className="hero-description">
          {content.Hero.description}
          <br className="desktop-break" />{content.Hero.descriptionSecond}
        </p>
        <a className="button" href="#program">
          {content.Hero.program}<span>↗</span>
        </a>
        <div className="hero-note">
          <span className="small-star">✳</span> {content.Hero.note}
        </div>
      </div>
    </section>
  );
}
