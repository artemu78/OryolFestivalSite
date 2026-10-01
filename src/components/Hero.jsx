import React from "react";
import { HeroMedia } from "./HeroMedia";

export function Hero() {
  return (
    <section className="hero hero-with-media wrap">
      <HeroMedia />
      <div className="hero-copy">
        <div className="eyebrow">
          <span className="dot" /> 10 ОКТЯБРЯ 2026 · 11:30–18:30 · ОРЁЛ
        </div>
        <h1>
          Ближе
          <br />к <em>себе.</em>
        </h1>
        <p className="hero-subtitle">
          Первый фестиваль
          <br />
          ментального здоровья в Орле
        </p>
        <p className="hero-description">
          Один день, чтобы замедлиться, услышать себя
          <br className="desktop-break" /> и поговорить о том, что
          действительно важно.
        </p>
        <a className="button" href="#program">
          Что нас ждёт <span>↗</span>
        </a>
        <div className="hero-note">
          <span className="small-star">✳</span> В атмосфере уважения и
          принятия
        </div>
      </div>
    </section>
  );
}
