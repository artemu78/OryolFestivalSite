import content from "../site.json";
import React from "react";
import { Flower } from "./Flower";

export function Closing() {
  return (
    <section className="closing wrap">
      <span className="eyebrow">{content.Closing.eyebrow}</span>
      <h2>
        {content.Closing.title}<em>{content.Closing.titleEmphasis}</em>
      </h2>
      <p>
        {content.Closing.intro}
        <br />
        {content.Closing.description}
      </p>
      <span className="sold-out">{content.Closing.soldOut}</span>
      <Flower />
    </section>
  );
}
