import content from "../site.json";
import React from "react";
import { venue } from "../program";

export function EventStrip() {
  return (
    <div className="event-strip">
      <div className="wrap strip-inner">
        <span>
          {content.EventStrip.date}{" "}
          <small>{content.EventStrip.time}</small>
        </span>
        <span>
          <a href={venue.website} target="_blank" rel="noreferrer">
            {content.EventStrip.venue}
          </a>
          <small>{venue.address}</small>
        </span>
        <span>
          {content.EventStrip.participants}<small>{content.EventStrip.note}</small>
        </span>
        <span className="strip-flower">✳</span>
      </div>
    </div>
  );
}
