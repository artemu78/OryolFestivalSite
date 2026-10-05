// See docs/expert-sources.md for description sources and photo mapping.
import expertContent from "./experts.json";

export const experts = expertContent;

export const expertsById = Object.fromEntries(experts.map(expert => [expert.id, expert]));
