export const TZ = "America/Sao_Paulo";

/** Turnos usados nos gráficos. Ajuste os horários conforme a operação. */
export const SHIFTS = [
  { id: "MANHA", label: "Manhã (06h–13h)", from: 6, to: 13 },
  { id: "TARDE", label: "Tarde (14h–21h)", from: 14, to: 21 },
  { id: "NOITE", label: "Noite (22h–05h)", from: 22, to: 5 },
] as const;

const hourFmt = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", hourCycle: "h23", timeZone: TZ });
const dateFmt = new Intl.DateTimeFormat("en-CA", { timeZone: TZ }); // yyyy-mm-dd

export function hourOf(date: Date): number {
  return Number(hourFmt.format(date));
}

export function shiftOf(hour: number): (typeof SHIFTS)[number]["id"] {
  if (hour >= 6 && hour <= 13) return "MANHA";
  if (hour >= 14 && hour <= 21) return "TARDE";
  return "NOITE";
}

/** Meia-noite de hoje no horário de Brasília (o Brasil não usa horário de verão desde 2019). */
export function startOfTodayBR(now = new Date()): Date {
  return new Date(`${dateFmt.format(now)}T00:00:00-03:00`);
}

export function parseDateInput(value: string | undefined): string | null {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}

export function formatDateTime(date: Date): string {
  return date.toLocaleString("pt-BR", { timeZone: TZ, dateStyle: "short", timeStyle: "short" });
}

/** Datas @db.Date chegam como meia-noite UTC; formatar em UTC evita escorregar um dia. */
export function formatDateOnly(date: Date): string {
  return date.toLocaleDateString("pt-BR", { timeZone: "UTC" });
}
