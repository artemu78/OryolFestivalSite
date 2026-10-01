import React from "react";
import { venue } from "../program";

export function Venue() {
  return (
    <section id="location" className="venue section wrap">
      <div className="section-label">05 / МЕСТО ВСТРЕЧИ</div>
      <h2>
        Встречаемся в <em>Freedom.</em>
      </h2>
      <div className="address">
        <div>
          <p>{venue.address}</p>
          <p>
            10 октября 2026 · 11:30–18:30
            <br />
            Закрытие фестиваля — в 18:30
          </p>
          <div className="venue-links">
            <a
              className="text-link"
              href={venue.website}
              target="_blank"
              rel="noreferrer"
            >
              Сайт коворкинга ↗
            </a>
            <a
              className="text-link"
              href={venue.community}
              target="_blank"
              rel="noreferrer"
            >
              Freedom ВКонтакте ↗
            </a>
          </div>
        </div>
        <iframe
          src="https://yandex.ru/map-widget/v1/?um=constructor%3Ad9b0866f6fc55a63242665dd7cd776c346beb9b7bf3dc7fc423909b9b01ccf74&amp;source=constructor"
          width="640"
          height="480"
          frameBorder="0"
        ></iframe>
      </div>
    </section>
  );
}

export { Venue as Location };
