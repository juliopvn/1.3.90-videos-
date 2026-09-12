const UNIT_SECONDS: Record<string, number> = {
  s: 1,
  m: 60,
  h: 3600,
  d: 86400,
  w: 604800,
};

/**
 * Convierte duraciones tipo "7d", "12h", "30m" (mismo formato que acepta
 * `jose` para exp) a segundos, para poder usarlas también como `maxAge` de
 * la cookie de sesión.
 */
export function durationToSeconds(value: string): number {
  const match = /^(\d+)\s*([smhdw])$/.exec(value.trim());
  if (!match) {
    throw new Error(`Formato de duración inválido: "${value}" (usa algo como "7d", "12h", "30m")`);
  }
  const [, amount, unit] = match;
  return Number(amount) * UNIT_SECONDS[unit];
}
