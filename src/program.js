import program from './program.json';
import { expertsByName } from './experts.js';

const person = name => {
  const expert = expertsByName[name];
  if (!expert) throw new Error(`Unknown programme expert: ${name}`);
  return expert;
};

export const venue = {
  name: 'Коворкинг Freedom',
  address: 'Орёл, наб. Дубровинского, 60Б',
  website: 'https://freedoman.ru/',
  community: 'https://vk.ru/coworking_v_orle',
};

// Programme content lives in program.json; names resolve to shared expert photos/profiles.
export const sessions = program.map(session => ({
  ...session,
  ...(session.people ? { people: session.people.map(person) } : {}),
}));
