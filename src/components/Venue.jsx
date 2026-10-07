import content from "../site.json";
import React, { useEffect, useRef, useState } from "react";

const venue = content.venue;

export function Venue() {
  const mapRef = useRef(null);
  const [loadMap, setLoadMap] = useState(false);

  useEffect(() => {
    if (!("IntersectionObserver" in window)) {
      setLoadMap(true); // Native iframe lazy loading remains the fallback.
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setLoadMap(true);
        observer.disconnect();
      }
    }, { rootMargin: "300px 0px" });
    observer.observe(mapRef.current);
    return () => observer.disconnect();
  }, []);

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
          ref={mapRef}
          src={loadMap ? "https://yandex.ru/map-widget/v1/?um=constructor%3Ad9b0866f6fc55a63242665dd7cd776c346beb9b7bf3dc7fc423909b9b01ccf74&source=constructor" : undefined}
          loading="lazy"
          title={content.Venue.mapTitle}
          width="640"
          height="480"
          frameBorder="0"
        ></iframe>
      </div>
    </section>
  );
}

export { Venue as Location };
