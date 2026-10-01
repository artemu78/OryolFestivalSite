import React from "react";
import { venue } from "../program";

export function EventStrip() {
  return (
    <div className="event-strip">
      <div className="wrap strip-inner">
        <span>
          10 октября{" "}
          <small>11:30–18:30 · Всемирный день психического здоровья</small>
        </span>
        <span>
          <a href={venue.website} target="_blank" rel="noreferrer">
            Freedom ↗
          </a>
          <small>{venue.address}</small>
        </span>
        <span>
          35 участников <small>Камерно. По-человечески.</small>
        </span>
        <span className="strip-flower">✳</span>
      </div>
    </div>
  );
}
