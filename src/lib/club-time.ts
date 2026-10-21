const clubTimeZone = "Europe/Madrid";

/** Extrae las partes de fecha y hora de un instante según la zona del club. */
function partsAt(date: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: clubTimeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.filter(({ type }) => type !== "literal").map(({ type, value }) => [type, Number(value)]));
  return { year: values.year, month: values.month, day: values.day, hour: values.hour, minute: values.minute, second: values.second };
}

/** Devuelve los componentes locales de Madrid para un instante UTC. */
export function clubTimeParts(date: Date) {
  return partsAt(date);
}

/** Construye una clave `AAAA-MM-DD` en la zona horaria del club. */
export function clubDateKey(date: Date) {
  const { year, month, day } = partsAt(date);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/**
 * Calcula los límites UTC de un día local del club.
 * @param dateKey Fecha local con formato `AAAA-MM-DD`.
 * @returns Intervalo semiabierto `[start, end)` o `null` si la fecha no existe.
 */
export function clubDayBounds(dateKey: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const start = zonedDateTimeToUtc(year, month, day, 0, 0, 0);
  if (partsAt(start).year !== year || partsAt(start).month !== month || partsAt(start).day !== day) return null;
  const next = new Date(Date.UTC(year, month - 1, day + 1));
  return { start, end: zonedDateTimeToUtc(next.getUTCFullYear(), next.getUTCMonth() + 1, next.getUTCDate(), 0, 0, 0) };
}

/** Convierte una fecha/hora local de Madrid al instante UTC equivalente. */
function zonedDateTimeToUtc(year: number, month: number, day: number, hour: number, minute: number, second: number) {
  const target = Date.UTC(year, month - 1, day, hour, minute, second);
  let timestamp = target;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const local = partsAt(new Date(timestamp));
    timestamp += target - Date.UTC(local.year, local.month - 1, local.day, local.hour, local.minute, local.second);
  }
  return new Date(timestamp);
}

/**
 * Convierte una fecha y hora local del club a UTC.
 * Las horas locales inexistentes durante el cambio horario devuelven `null`.
 */
export function clubDateTimeToUtc(dateKey: string, time: string) {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  const timeMatch = /^(\d{2}):(\d{2})$/.exec(time);
  if (!dateMatch || !timeMatch) return null;
  const year = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  const day = Number(dateMatch[3]);
  const hour = Number(timeMatch[1]);
  const minute = Number(timeMatch[2]);
  const result = zonedDateTimeToUtc(year, month, day, hour, minute, 0);
  const resultParts = partsAt(result);
  return resultParts.year === year && resultParts.month === month && resultParts.day === day && resultParts.hour === hour && resultParts.minute === minute ? result : null;
}
