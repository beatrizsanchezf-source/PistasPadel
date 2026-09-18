"use client";

import { FormEvent, useEffect, useState } from "react";

type ReservationStatus = "PENDING" | "CONFIRMED" | "CANCELLED";
type Reservation = { id: string; startsAt: string; players: number; withLight: boolean; status: ReservationStatus; user: { name: string } };
type Court = { id: number; name: string; description: string; lightsOn: boolean; reservations: Reservation[] };
type User = { id: string; name: string };
const slots = ["16:00", "17:00", "18:00", "19:00", "20:00", "21:00"];
const dateKey = (date: Date) => date.toISOString().slice(0, 10);

export default function Home() {
  const today = new Date();
  const [date, setDate] = useState(today);
  const [courts, setCourts] = useState<Court[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  async function loadSchedule(selectedDate: Date) {
    setLoading(true);
    const response = await fetch(`/api/schedule?date=${dateKey(selectedDate)}`);
    setCourts(response.ok ? await response.json() : []);
    setLoading(false);
  }

  useEffect(() => { void loadSchedule(date); }, [date]);
  useEffect(() => {
    fetch("/api/users").then((response) => response.ok ? response.json() : []).then((data: User[]) => { setUsers(data); setProfile(data[0] ?? null); });
  }, []);

  function selectDate(nextDate: Date) { setDate(nextDate); }

  async function toggleLights(court: Court) {
    const lightsOn = !court.lightsOn;
    setCourts((items) => items.map((item) => item.id === court.id ? { ...item, lightsOn } : item));
    const response = await fetch(`/api/courts/${court.id}/lights`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lightsOn }) });
    if (!response.ok) setCourts((items) => items.map((item) => item.id === court.id ? { ...item, lightsOn: !lightsOn } : item));
  }

  async function createReservation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setFormError("");
    const form = new FormData(event.currentTarget);
    const startsAt = new Date(`${form.get("date")}T${form.get("time")}:00`);
    const response = await fetch("/api/reservations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ courtId: Number(form.get("courtId")), userId: form.get("userId"), startsAt: startsAt.toISOString(), players: Number(form.get("players")), withLight: form.get("withLight") === "on", status: form.get("status") }) });
    if (!response.ok) { const data = await response.json(); setFormError(data.error ?? "No se pudo crear la reserva."); setSubmitting(false); return; }
    setShowForm(false);
    setSubmitting(false);
    await loadSchedule(date);
  }

  const dates = Array.from({ length: 7 }, (_, index) => { const item = new Date(today); item.setDate(today.getDate() + index - 3); return item; });
  const reservations = courts.flatMap((court) => court.reservations);
  const title = new Intl.DateTimeFormat("es-ES", { weekday: "long", day: "numeric", month: "long" }).format(date);
  const userName = profile?.name ?? "";
  const initials = userName.split(" ").filter(Boolean).slice(0, 2).map((name) => name[0]).join("").toUpperCase();

  return <main><header className="topbar"><a className="brand" href="#inicio"><span className="brand-mark">P</span><span>Punto<span>de</span>Oro</span></a><nav><a className="active" href="#agenda">Agenda</a><a href="#clientes">Clientes</a><a href="#informes">Informes</a></nav>{profile && <div className="profile"><span className="avatar">{initials}</span><span>{userName}</span></div>}</header>
    <section className="hero" id="inicio"><div><p className="eyebrow">CENTRO DEPORTIVO</p><h1>{userName ? `Buenos días, ${userName}.` : "Buenos días."}</h1><p className="hero-copy">Gestiona las reservas y la iluminación de tus pistas.</p></div><button className="primary-button" onClick={() => { setFormError(""); setShowForm(true); }}><span>+</span> Nueva reserva</button></section>
    {showForm && <section className="reservation-form" aria-labelledby="new-reservation-title"><div className="form-heading"><div><p className="eyebrow">AGENDA</p><h2 id="new-reservation-title">Nueva reserva</h2><p>Completa los datos para bloquear una hora de pista.</p></div><button className="close-button" onClick={() => setShowForm(false)} aria-label="Cerrar formulario">×</button></div><form onSubmit={createReservation}><label>Cliente<select name="userId" required defaultValue=""><option value="" disabled>Selecciona un cliente</option>{users.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>Pista<select name="courtId" required defaultValue=""><option value="" disabled>Selecciona una pista</option>{courts.map((court) => <option key={court.id} value={court.id}>{court.name}</option>)}</select></label><label>Fecha<input name="date" type="date" required defaultValue={dateKey(date)} /></label><label>Hora<select name="time" required defaultValue=""><option value="" disabled>Selecciona una hora</option>{slots.map((slot) => <option key={slot} value={slot}>{slot}</option>)}</select></label><label>Jugadores<select name="players" defaultValue="4">{[1, 2, 3, 4].map((number) => <option key={number} value={number}>{number} jugadores</option>)}</select></label><label>Estado<select name="status" defaultValue="CONFIRMED"><option value="CONFIRMED">Confirmada</option><option value="PENDING">Pendiente</option></select></label><label className="light-option"><input name="withLight" type="checkbox" /> Necesita iluminación</label>{formError && <p className="form-error">{formError}</p>}<div className="form-actions"><button type="button" className="cancel-button" onClick={() => setShowForm(false)}>Cancelar</button><button type="submit" className="primary-button" disabled={submitting}>{submitting ? "Guardando..." : "Crear reserva"}</button></div></form></section>}
    <section className="metrics"><article><span className="metric-symbol sun">◌</span><div><p>Ocupación del día</p><strong>{Math.round(reservations.length / 18 * 100)}<small>%</small></strong><em>Datos <span>en tiempo real</span></em></div></article><article><span className="metric-symbol calendar">□</span><div><p>Reservas</p><strong>{reservations.length}</strong><em>{reservations.filter((item) => item.status === "PENDING").length} <span>pendientes</span></em></div></article><article><span className="metric-symbol coin">◉</span><div><p>Luces activas</p><strong>{courts.filter((court) => court.lightsOn).length}<small>/3</small></strong><em>Control <span>persistente</span></em></div></article></section>
    <section className="schedule" id="agenda"><div className="schedule-head"><div><p className="eyebrow">AGENDA</p><h2>{title}</h2></div><div className="agenda-actions"><button className="date-picker" onClick={() => selectDate(today)}>▣ <span>Hoy</span></button></div></div><div className="days">{dates.map((item) => <button key={dateKey(item)} className={dateKey(item) === dateKey(date) ? "day selected" : "day"} onClick={() => selectDate(item)}><span>{new Intl.DateTimeFormat("es-ES", { weekday: "short" }).format(item).replace(".", "")}</span><b>{item.getDate()}</b></button>)}</div><div className="court-list">{loading ? <p className="data-message">Cargando agenda...</p> : courts.map((court) => <article className="court-row" key={court.id}><div className="court-info"><span className="court-icon"><i /><i /><b /></span><div><h3>{court.name}</h3><p>{court.description}</p></div><span className={court.lightsOn ? "light-badge on" : "light-badge"}>{court.lightsOn ? "Luz encendida" : "Luz apagada"}</span></div><div className="booking-track"><div className="slot-labels">{slots.map((slot) => <span key={slot}>{slot}</span>)}</div><div className="booking-grid">{court.reservations.map((reservation) => { const start = new Date(reservation.startsAt); const hour = `${String(start.getHours()).padStart(2, "0")}:00`; const index = slots.indexOf(hour); return index < 0 ? null : <div key={reservation.id} className={`booking ${reservation.status === "PENDING" ? "pendiente" : "confirmada"}`} style={{ left: `${index / 6 * 100}%` }}><b>{hour}</b><span>{reservation.user.name}</span><small>{reservation.players} pers. {reservation.withLight && "· Luz"}</small></div>; })}</div></div><button className={court.lightsOn ? "switch enabled" : "switch"} onClick={() => toggleLights(court)}><i /></button></article>)}</div></section>
    <section className="bottom-grid"><article className="next-booking"><p className="eyebrow">POSTGRESQL</p><div className="next-content"><div className="time-block"><strong>{courts.length}</strong><span>pistas</span></div><div><h2>Datos persistentes</h2><p>Usuarios, reservas, fechas y luz se guardan en la base de datos.</p></div></div></article><article className="lighting"><div><p className="eyebrow">ILUMINACIÓN</p><h2>Control de pistas</h2></div><div className="light-controls">{courts.map((court) => <button key={court.id} className={court.lightsOn ? "light-control active" : "light-control"} onClick={() => toggleLights(court)}><span>{court.name}</span><i /></button>)}</div></article></section>
  </main>;
}
