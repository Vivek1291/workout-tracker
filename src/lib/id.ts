/** Collision-resistant id that needs no native crypto module. */
export function newId(): string {
  const time = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 10);
  return `${time}${rand}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}
