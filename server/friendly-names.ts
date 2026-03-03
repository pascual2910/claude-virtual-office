const NATO = [
  'Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo', 'Foxtrot',
  'Golf', 'Hotel', 'India', 'Juliet', 'Kilo', 'Lima',
  'Mike', 'November', 'Oscar', 'Papa', 'Quebec', 'Romeo',
  'Sierra', 'Tango', 'Uniform', 'Victor', 'Whiskey', 'Xray',
];

const UUID_RE = /^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i;
const assigned = new Map<string, string>();
let nextIdx = 0;

/**
 * If `id` looks like a UUID, return a stable friendly name ("Agent Alpha", etc.).
 * Otherwise return `id` as-is.
 */
export function friendlyName(id: string): string {
  if (!UUID_RE.test(id)) return id;
  const existing = assigned.get(id);
  if (existing) return existing;

  const name = `Agent ${NATO[nextIdx % NATO.length]}`;
  nextIdx++;
  assigned.set(id, name);
  return name;
}
