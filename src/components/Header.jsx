import React, { useState } from "react";
import { Flower } from "./Flower";

const defaultCommunity = "https://vk.ru/club241058655";

export function Header({ community = defaultCommunity }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="header wrap">
      <a
        className="brand"
        href="#"
        aria-label="Фестиваль ментального здоровья — главная"
      >
        <Flower />
        <span>
          фестиваль
          <br />
          ментального здоровья<span className="brand-city">ОРЁЛ · 2026</span>
        </span>
      </a>
      <button
        className="menu-toggle"
        onClick={() => setMenuOpen(!menuOpen)}
        aria-expanded={menuOpen}
        aria-controls="navigation"
      >
        {menuOpen ? "Закрыть −" : "Меню +"}
      </button>
      <nav
        id="navigation"
        className={menuOpen ? "nav open" : "nav"}
        aria-label="Основная навигация"
      >
        {[
          ["О фестивале", "#about"],
          ["Программа", "#program"],
          ["Эксперты", "#experts"],
        ].map(([label, link]) => (
          <a key={link} href={link} onClick={() => setMenuOpen(false)}>
            {label}
          </a>
        ))}
        <a
          className="nav-social"
          href={community}
          target="_blank"
          rel="noreferrer"
        >
          Мы ВКонтакте ↗
        </a>
      </nav>
    </header>
  );
}
