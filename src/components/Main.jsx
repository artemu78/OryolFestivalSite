import content from "../site.json";
import React from "react";
import { Hero } from "./Hero";
import { EventStrip } from "./EventStrip";
import { FestivalPhotos } from "./FestivalPhotos";
import { About } from "./About";
import { Program } from "./Program";
import { Experts } from "./Experts";
import { Videos } from "./Videos";
import { Venue } from "./Venue";
import { Sponsors } from "./Sponsors";
import { Closing } from "./Closing";

const defaultCommunity = content.links.community;

export function Main({ community = defaultCommunity }) {
  return (
    <main id="main">
      <Hero />
      <EventStrip />
      <About />
      <FestivalPhotos />
      <Program />
      <Experts />
      <Videos community={community} />
      <Venue />
      <Sponsors />
      <Closing />
    </main>
  );
}
