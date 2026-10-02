import content from "./site.json";
import program from './program.json';
import { expertsByName } from './experts.js';

const person = name => {
  const expert = expertsByName[name];
  if (!expert) throw new Error(`Unknown programme expert: ${name}`);
  return expert;
};

export const venue = content.venue;

// Programme content lives in program.json; names resolve to shared expert photos/profiles.
export const sessions = program.map(session => ({
  ...session,
  ...(session.people ? { people: session.people.map(person) } : {}),
}));
