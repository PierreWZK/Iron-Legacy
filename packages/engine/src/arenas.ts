export const ARENA_IDS = ['dojo','street','forest','autumn','canyon','snow','tundra','lab','rooftop','factory','temple','desert','fortress'] as const;
export type OnlineArenaId = (typeof ARENA_IDS)[number];
