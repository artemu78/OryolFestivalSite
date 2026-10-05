import content from "./site.json";
import program from './program.json';
import { expertsById } from './experts.js';

const person = id => {
  const expert = expertsById[id];
  if (!expert) throw new Error(`Unknown programme expert: ${id}`);
  return expert;
};

export const venue = content.venue;

// Programme content lives in program.json; stable expert IDs resolve to shared expert photos/profiles.
export const sessions = program.map(session => ({
  ...session,
  ...(session.people ? { people: session.people.map(person) } : {}),
}));
