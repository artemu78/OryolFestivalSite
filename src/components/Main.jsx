import React from "react";
import { Hero } from "./Hero";
import { EventStrip } from "./EventStrip";
import { About } from "./About";
import { Program } from "./Program";
import { Experts } from "./Experts";
import { Videos } from "./Videos";
import { Venue } from "./Venue";
import { Closing } from "./Closing";

const defaultCommunity = "https://vk.ru/club241058655";

export function Main({ community = defaultCommunity }) {
  return (
    <main id="main">
      <Hero />
      <EventStrip />
      <About />
      <Program />
      <Experts />
      <Videos community={community} />
      <Venue />
      <Closing />
    </main>
  );
}
