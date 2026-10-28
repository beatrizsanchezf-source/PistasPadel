"use client";

import { useEffect, useState } from "react";
import { clubDateTimeToUtc } from "@/lib/club-time";
import { api, type ClientUser, type ScheduleReservation } from "@/lib/client-api";
import LoginScreen from "@/app/components/login-screen";
import ClientsPanel from "@/app/components/clients-panel";
import ReservationForm, { type ReservationFormData } from "@/app/components/reservation-form";
import ScheduleBoard from "@/app/components/schedule-board";
import { useSchedule } from "@/app/hooks/use-schedule";

type Reservation = ScheduleReservation;
type Court = Awaited<ReturnType<typeof api.courts.schedule>>[number];
type User = ClientUser;

/** Pantalla de acceso y gestión de agenda, reservas, usuarios e iluminación del club. */
export default function Home() {
  const today = new Date();
  const [date, setDate] = useState(today);
  const [users, setUsers] = useState<User[]>([]);
  const [profile, setProfile] = useState<User | null>(null);
  const [showClients, setShowClients] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [editingReservation, setEditingReservation] = useState<(Reservation & { courtId: number }) | null>(null);
  const { courts, loading, reload: reloadSchedule, clear: clearSchedule } = useSchedule(date, Boolean(profile));

  useEffect(() => {
    api.auth.currentUser().then(setProfile).catch(() => setProfile(null));
  }, []);

  useEffect(() => { if (profile?.role === "ADMIN") api.users.list().then(setUsers).catch(() => setUsers([])); }, [profile]);

  /** Cierra la sesión en el servidor y limpia los datos visibles del usuario. */
  async function signOut() { try { await api.auth.logout(); setProfile(null); clearSchedule(); setUsers([]); } catch { setFormError("No se pudo cerrar la sesión."); } }

  /** Selecciona una fecha de agenda e indica que sus datos se están cargando. */
  function selectDate(nextDate: Date) { setDate(nextDate); }

  /** Cambia la iluminación de una pista; solo permite la acción a administradores. */
  async function toggleLights(court: Court) {
    if (profile?.role !== "ADMIN") return;
    const lightsOn = !court.lightsOn;
    try { await api.courts.setLights(court.id, lightsOn); }
    catch { await reloadSchedule(); }
  }

  /** Ejecuta la creación o actualización solicitada por el formulario de reservas. */
  async function submitReservation(data: ReservationFormData) {
    setSubmitting(true);
    setFormError("");
    const startsAt = clubDateTimeToUtc(data.date, data.time);
    if (!startsAt) { setFormError("La fecha u hora seleccionada no es válida."); setSubmitting(false); return; }
    try {
      const input = {
        courtId: data.courtId,
        userId: data.userId,
        startsAt: startsAt.toISOString(),
        players: data.players,
        withLight: data.withLight,
        status: data.status,
        notes: data.notes,
      };
      if (editingReservation?.id) await api.reservations.update(editingReservation.id, input);
      else await api.reservations.create(input);
      setEditingReservation(null);
      setShowForm(false);
      await reloadSchedule();
    } catch (error) { setFormError(error instanceof Error ? error.message : "No se pudo guardar la reserva."); }
    finally { setSubmitting(false); }
  }

  const dates = Array.from({ length: 7 }, (_, index) => { const item = new Date(today); item.setDate(today.getDate() - 3 + index); return item; });
  const reservations = courts.flatMap((court) => court.reservations);
  const userName = profile?.name ?? "";
  const initials = userName.split(" ").filter(Boolean).slice(0, 2).map((name) => name[0]).join("").toUpperCase();
  if (!profile) return <LoginScreen onSuccess={setProfile} />;

  return <main><header className="topbar"><a className="brand" href="#inicio"><span className="brand-mark">P</span><span>Pistas Padel San Cristobal de Segovia</span></a><nav><a className="active" href="#agenda">Agenda</a>{profile.role === "ADMIN" && <button className="nav-button" title={showClients ? "Ocultar clientes" : "Mostrar clientes"} onClick={() => setShowClients((visible) => !visible)}>Clientes</button>}</nav><div className="profile"><span className="avatar">{initials}</span><span>{userName}</span><button className="icon-button" onClick={signOut} aria-label="Cerrar sesión" title="Cerrar sesión"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 5H5v14h5M14 8l4 4-4 4M8 12h10" /></svg></button></div></header>
    <section className="hero" id="inicio"><div><p className="eyebrow">CENTRO DEPORTIVO</p><h1>{userName ? `Buenos días, ${userName}.` : "Buenos días."}</h1><p className="hero-copy">Gestiona tus reservas{profile.role === "ADMIN" ? " y la iluminación" : ""}.</p></div><button className="primary-button" title="Abrir el formulario para crear una reserva" onClick={() => { setFormError(""); setShowClients(false); setEditingReservation(null); setShowForm(true); }}>
      <span>+</span> Nueva reserva
    </button></section>
    {showClients && profile.role === "ADMIN" && <ClientsPanel users={users} onUsersChange={setUsers} />}
    {showForm && <ReservationForm courts={courts} users={users} isAdmin={profile.role === "ADMIN"} editingReservation={editingReservation} submitting={submitting} error={formError} onClose={() => setShowForm(false)} onSubmit={submitReservation} />}
    <section className="metrics"><article><span className="metric-symbol sun">◌</span><div><p>Ocupación del día</p><strong>{Math.round(reservations.length / 18 * 100)}<small>%</small></strong><em>Datos <span>en tiempo real</span></em></div></article><article><span className="metric-symbol calendar">□</span><div><p>Reservas</p><strong>{reservations.length}</strong><em>{reservations.filter((item) => item.status === "PENDING").length} <span>pendientes</span></em></div></article><article><span className="metric-symbol coin">◉</span><div><p>Luces activas</p><strong>{courts.filter((court) => court.lightsOn).length}<small>/3</small></strong><em>Control <span>persistente</span></em></div></article></section>
    <ScheduleBoard courts={courts} date={date} dates={dates} loading={loading} isAdmin={profile.role === "ADMIN"} onSelectDate={selectDate} onSelectToday={() => selectDate(today)} onShiftWeek={(days) => { const next = new Date(date); next.setDate(next.getDate() + days); selectDate(next); }} onToggleLights={toggleLights} onEditReservation={(court, reservation) => { setFormError(""); setEditingReservation({ ...reservation, courtId: court.id }); setShowForm(true); }} />
    <section className="bottom-grid"><article className="next-booking"><p className="eyebrow">POSTGRESQL</p><div className="next-content"><div className="time-block"><strong>{courts.length}</strong><span>pistas</span></div><div><h2>Datos persistentes</h2><p>Usuarios, reservas, fechas y luz se guardan en la base de datos.</p></div></div></article><article className="lighting"><div><p className="eyebrow">ILUMINACIÓN</p><h2>Control de pistas</h2></div><div className="light-controls">{courts.map((court) => <button key={court.id} className={court.lightsOn ? "light-control active" : "light-control"} aria-pressed={court.lightsOn} title={`${court.lightsOn ? "Apagar" : "Encender"} luz de ${court.name}`} onClick={() => toggleLights(court)}>
        <span>{court.name}</span><i /></button>)}</div></article></section>
  </main>;
}
