"use client";

import type { ScheduleCourt } from "@/lib/client-api";
import { clubDateKey, clubTimeParts } from "@/lib/club-time";

type ScheduleBoardProps = Readonly<{
  courts: ScheduleCourt[];
  date: Date;
  dates: Date[];
  loading: boolean;
  isAdmin: boolean;
  onSelectDate: (date: Date) => void;
  onSelectToday: () => void;
  onShiftWeek: (days: number) => void;
  onToggleLights: (court: ScheduleCourt) => void;
  onEditReservation: (court: ScheduleCourt, reservation: ScheduleCourt["reservations"][number]) => void;
}>;

const slots = ["16:00", "17:00", "18:00", "19:00", "20:00", "21:00"];
const dateKey = clubDateKey;

export default function ScheduleBoard({ courts, date, dates, loading, isAdmin, onSelectDate, onSelectToday, onShiftWeek, onToggleLights, onEditReservation }: ScheduleBoardProps) {
  const title = new Intl.DateTimeFormat("es-ES", { weekday: "long", day: "numeric", month: "long" }).format(date);

  return <section className="schedule" id="agenda">
    <div className="schedule-head"><div><p className="eyebrow">AGENDA</p><h2>{title}</h2></div><div className="agenda-actions"><button className="arrow" type="button" title="Mostrar la semana anterior" aria-label="Semana anterior" onClick={() => onShiftWeek(-7)}>‹</button><button className="date-picker" type="button" title="Volver a la fecha de hoy" onClick={onSelectToday}>▣ <span>Hoy</span></button><button className="arrow" type="button" title="Mostrar la semana siguiente" aria-label="Semana siguiente" onClick={() => onShiftWeek(7)}>›</button></div></div>
    <div className="days">{dates.map((item, index) => <button key={`${dateKey(item)}-${index}`} className={dateKey(item) === dateKey(date) ? "day selected" : "day"} aria-pressed={dateKey(item) === dateKey(date)} aria-label={`Mostrar agenda del ${new Intl.DateTimeFormat("es-ES", { dateStyle: "full" }).format(item)}`} title={`Mostrar agenda del ${new Intl.DateTimeFormat("es-ES", { dateStyle: "full" }).format(item)}`} onClick={() => onSelectDate(item)}>
      <span>{new Intl.DateTimeFormat("es-ES", { weekday: "short" }).format(item).replace(".", "")}</span><b>{item.getDate()}</b></button>)}</div>
    <div className="court-list">{loading ? <p className="data-message">Cargando agenda...</p> : courts.map((court) => <article className="court-row" key={court.id}>
      <div className="court-info"><span className="court-icon" aria-hidden="true" /><div><h3>{court.name}</h3><p>{court.description}</p></div><span className={court.lightsOn ? "light-badge on" : "light-badge"}>{court.lightsOn ? "Luz encendida" : "Luz apagada"}</span></div>
      <div className="booking-track"><div className="slot-labels">{slots.map((slot) => <span key={slot}>{slot}</span>)}</div><div className="booking-grid">{court.reservations.map((reservation) => {
        const hour = `${String(clubTimeParts(new Date(reservation.startsAt)).hour).padStart(2, "0")}:00`;
        const slotIndex = slots.indexOf(hour);
        return slotIndex < 0 ? null : <button key={reservation.id ?? reservation.startsAt} className={`booking ${reservation.status === "PENDING" ? "pendiente" : "confirmada"}`} aria-label={`${hour}, ${reservation.user.name}, ${reservation.players} jugadores${reservation.withLight ? ", necesita iluminación" : ""}`} title={`Reserva ${hour}: ${reservation.user.name}, ${reservation.players} jugadores`} style={{ left: `${slotIndex / 6 * 100}%` }} disabled={!isAdmin} onClick={() => onEditReservation(court, reservation)}>
          <b>{hour}</b><span>{reservation.user.name}</span><small>{reservation.players} pers. {reservation.withLight && "· Luz"}</small></button>;
      })}</div></div>
      <button className={court.lightsOn ? "switch enabled" : "switch"} aria-label={`${court.lightsOn ? "Apagar" : "Encender"} luz de ${court.name}`} aria-pressed={court.lightsOn} title={`${court.lightsOn ? "Apagar" : "Encender"} luz de ${court.name}`} onClick={() => onToggleLights(court)}><i /></button>
    </article>)}</div>
  </section>;
}
