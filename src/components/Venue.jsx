import content from "../site.json";
import React from "react";

const venue = content.venue;

export function Venue() {
  return (
    <section id="location" className="venue section wrap">
      <div className="section-label">{content.Venue.label}</div>
      <h2>
        {content.Venue.title}<em>{content.Venue.titleEmphasis}</em>
      </h2>
      <div className="address">
        <div>
          <p>{venue.address}</p>
          <p>
            {content.Venue.date}
            <br />
            {content.Venue.closing}
          </p>
          <div className="venue-links">
            <a
              className="text-link"
              href={venue.website}
              target="_blank"
              rel="noreferrer"
            >
              {content.Venue.website}
            </a>
            <a
              className="text-link"
              href={venue.community}
              target="_blank"
              rel="noreferrer"
            >
              {content.Venue.social}
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
