"use client";

import { useEffect, useState } from "react";

type Reservation = { id: string; startsAt: string; players: number; withLight: boolean; status: "PENDING" | "CONFIRMED"; user: { name: string } };
type Court = { id: number; name: string; description: string; lightsOn: boolean; reservations: Reservation[] };
type User = { name: string } | null;
const slots = ["16:00", "17:00", "18:00", "19:00", "20:00", "21:00"];
const dateKey = (date: Date) => date.toISOString().slice(0, 10);

export default function Home() {
  const today = new Date();
  const [date, setDate] = useState(today);
  const [courts, setCourts] = useState<Court[]>([]);
  const [user, setUser] = useState<User>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetch(`/api/schedule?date=${dateKey(date)}`).then((response) => response.ok ? response.json() : []).then((data) => { if (active) setCourts(data); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [date]);

  useEffect(() => {
    fetch("/api/users/first").then((response) => response.ok ? response.json() : null).then(setUser);
  }, []);

  function selectDate(nextDate: Date) {
    setLoading(true);
    setDate(nextDate);
  }

  async function toggleLights(court: Court) {
    const lightsOn = !court.lightsOn;
    setCourts((items) => items.map((item) => item.id === court.id ? { ...item, lightsOn } : item));
    const response = await fetch(`/api/courts/${court.id}/lights`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lightsOn }) });
    if (!response.ok) setCourts((items) => items.map((item) => item.id === court.id ? { ...item, lightsOn: !lightsOn } : item));
  }

  const dates = Array.from({ length: 7 }, (_, index) => { const item = new Date(today); item.setDate(today.getDate() + index - 3); return item; });
  const reservations = courts.flatMap((court) => court.reservations);
  const title = new Intl.DateTimeFormat("es-ES", { weekday: "long", day: "numeric", month: "long" }).format(date);
  const userName = user?.name ?? "";
  const initials = userName.split(" ").filter(Boolean).slice(0, 2).map((name) => name[0]).join("").toUpperCase();

  return <main><header className="topbar"><a className="brand" href="#inicio"><span className="brand-mark">P</span><span>Punto<span>de</span>Oro</span></a><nav><a className="active" href="#agenda">Agenda</a><a href="#clientes">Clientes</a><a href="#informes">Informes</a></nav>{user && <div className="profile"><span className="avatar">{initials}</span><span>{userName}</span></div>}</header>
    <section className="hero" id="inicio"><div><p className="eyebrow">CENTRO DEPORTIVO</p><h1>{userName ? `Buenos días, ${userName}.` : "Buenos días."}</h1><p className="hero-copy">Gestiona las reservas y la iluminación de tus pistas.</p></div><button className="primary-button"><span>+</span> Nueva reserva</button></section>
    <section className="metrics"><article><span className="metric-symbol sun">◌</span><div><p>Ocupación del día</p><strong>{Math.round(reservations.length / 18 * 100)}<small>%</small></strong><em>Datos <span>en tiempo real</span></em></div></article><article><span className="metric-symbol calendar">□</span><div><p>Reservas</p><strong>{reservations.length}</strong><em>{reservations.filter((item) => item.status === "PENDING").length} <span>pendientes</span></em></div></article><article><span className="metric-symbol coin">◉</span><div><p>Luces activas</p><strong>{courts.filter((court) => court.lightsOn).length}<small>/3</small></strong><em>Control <span>persistente</span></em></div></article></section>
    <section className="schedule" id="agenda"><div className="schedule-head"><div><p className="eyebrow">AGENDA</p><h2>{title}</h2></div><div className="agenda-actions"><button className="date-picker" onClick={() => selectDate(today)}>▣ <span>Hoy</span></button></div></div><div className="days">{dates.map((item) => <button key={dateKey(item)} className={dateKey(item) === dateKey(date) ? "day selected" : "day"} onClick={() => selectDate(item)}><span>{new Intl.DateTimeFormat("es-ES", { weekday: "short" }).format(item).replace(".", "")}</span><b>{item.getDate()}</b></button>)}</div><div className="court-list">{loading ? <p className="data-message">Cargando agenda...</p> : courts.map((court) => <article className="court-row" key={court.id}><div className="court-info"><span className="court-icon"><i /><i /><b /></span><div><h3>{court.name}</h3><p>{court.description}</p></div><span className={court.lightsOn ? "light-badge on" : "light-badge"}>{court.lightsOn ? "Luz encendida" : "Luz apagada"}</span></div><div className="booking-track"><div className="slot-labels">{slots.map((slot) => <span key={slot}>{slot}</span>)}</div><div className="booking-grid">{court.reservations.map((reservation) => { const start = new Date(reservation.startsAt); const hour = `${String(start.getHours()).padStart(2, "0")}:00`; const index = slots.indexOf(hour); return index < 0 ? null : <div key={reservation.id} className={`booking ${reservation.status === "PENDING" ? "pendiente" : "confirmada"}`} style={{ left: `${index / 6 * 100}%` }}><b>{hour}</b><span>{reservation.user.name}</span><small>{reservation.players} pers. {reservation.withLight && "· Luz"}</small></div>; })}</div></div><button className={court.lightsOn ? "switch enabled" : "switch"} onClick={() => toggleLights(court)}><i /></button></article>)}</div></section>
    <section className="bottom-grid"><article className="next-booking"><p className="eyebrow">POSTGRESQL</p><div className="next-content"><div className="time-block"><strong>{courts.length}</strong><span>pistas</span></div><div><h2>Datos persistentes</h2><p>Usuarios, reservas, fechas y luz se guardan en la base de datos.</p></div></div></article><article className="lighting"><div><p className="eyebrow">ILUMINACIÓN</p><h2>Control de pistas</h2></div><div className="light-controls">{courts.map((court) => <button key={court.id} className={court.lightsOn ? "light-control active" : "light-control"} onClick={() => toggleLights(court)}><span>{court.name}</span><i /></button>)}</div></article></section>
  </main>;
}
