import React from "react";

const defaultCommunity = "https://vk.ru/club241058655";

export function Footer({ community = defaultCommunity, studioContact = "" }) {
  return (
    <footer className="footer wrap">
      <div>
        <span>Первый фестиваль ментального здоровья в Орле</span>
        <small>10 октября 2026 · Благотворительная инициатива</small>
      </div>
      <a href={community} target="_blank" rel="noreferrer">
        ВКонтакте ↗
      </a>
      {studioContact ? (
        <a href={studioContact}>Сайт — Студия Артёма Рева ↗</a>
      ) : (
        <span className="studio-credit">Сайт — Студия Артёма Рева</span>
      )}
    </footer>
  );
}
