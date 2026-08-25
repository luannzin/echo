/** Injected so services stay deterministic under test. */
export type Clock = () => Date;
export type IdFactory = () => string;

export const systemClock: Clock = () => new Date();
export const uuid: IdFactory = () => crypto.randomUUID();
