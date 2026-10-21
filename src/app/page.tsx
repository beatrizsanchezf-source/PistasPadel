"use client";

import { startTransition, type SubmitEvent, useEffect, useState } from "react";
import { clubDateKey, clubDateTimeToUtc, clubTimeParts } from "@/lib/club-time";
import { api, type ClientUser, type ScheduleCourt, type ScheduleReservation } from "@/lib/client-api";
import { validateUserInput } from "@/lib/user-validation";

type Reservation = ScheduleReservation;
type Court = ScheduleCourt;
type User = ClientUser;
const slots = ["16:00", "17:00", "18:00", "19:00", "20:00", "21:00"];
const dateKey = clubDateKey;

type LoginMode = "login" | "request" | "confirm" | "done";

function LoginScreen({ onSuccess }: Readonly<{ onSuccess: (user: User) => void }>) {
  const [mode, setMode] = useState<LoginMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [resetPassword, setResetPassword] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("resetToken");
    if (token) {
      startTransition(() => {
        setResetToken(token);
        setMode("confirm");
      });
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  async function submitLogin(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try { onSuccess(await api.auth.login({ email, password })); }
    catch (error_) { setError(error_ instanceof Error ? error_.message : "No se pudo iniciar sesión."); }
    setSubmitting(false);
  }

  async function requestReset(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const result = await api.auth.requestPasswordReset(email);
      setMessage(result.message);
      setMode("done");
    } catch (error_) { setError(error_ instanceof Error ? error_.message : "No se pudo solicitar el restablecimiento."); }
    setSubmitting(false);
  }

  async function confirmReset(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const result = await api.auth.confirmPasswordReset({ token: resetToken, password: resetPassword });
      setMessage(result.message);
      setPassword("");
      setMode("login");
    } catch (error_) { setError(error_ instanceof Error ? error_.message : "No se pudo cambiar la contraseña."); }
    setSubmitting(false);
  }

  const titles: Record<LoginMode, string> = { login: "Inicia sesión", request: "Recupera tu acceso", confirm: "Crea una contraseña nueva", done: "Inicia sesión" };
  const descriptions: Record<LoginMode, string> = { login: "Accede a tus reservas y a la agenda del club.", request: "Te enviaremos un enlace si el correo corresponde a una cuenta.", confirm: "Elige una contraseña nueva para tu cuenta.", done: "Accede a tus reservas y a la agenda del club." };
  const title = titles[mode];
  const description = descriptions[mode];

  return <main className="login-page"><section className="login-card"><div className="brand"><span className="brand-mark">P</span><span>Pistas Padel San Cristobal de Segovia</span></div><p className="eyebrow">ACCESO PRIVADO</p><h1>{title}</h1><p>{description}</p>
    {mode === "login" && <form onSubmit={submitLogin}><label>Correo electrónico<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="username" required /></label><label>Contraseña<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required /></label>{message && <output className="form-message">{message}</output>}{error && <p className="form-error" role="alert">{error}</p>}<button className="primary-button" type="submit" title="Iniciar sesión" disabled={submitting}>{submitting ? "Accediendo..." : "Entrar"}</button><button className="login-link" type="button" onClick={() => { setError(""); setMessage(""); setMode("request"); }}>¿Has olvidado la contraseña?</button></form>}
    {mode === "request" && <form onSubmit={requestReset}><label>Correo electrónico<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required /></label>{error && <p className="form-error" role="alert">{error}</p>}<button className="primary-button" type="submit" disabled={submitting}>{submitting ? "Enviando..." : "Enviar enlace"}</button><button className="login-link" type="button" onClick={() => { setError(""); setMode("login"); }}>Volver al inicio de sesión</button></form>}
    {mode === "confirm" && <form onSubmit={confirmReset}><label>Nueva contraseña<input type="password" value={resetPassword} onChange={(event) => setResetPassword(event.target.value)} autoComplete="new-password" minLength={12} maxLength={128} required /></label><small className="password-hint">Usa al menos 12 caracteres.</small>{error && <p className="form-error" role="alert">{error}</p>}<button className="primary-button" type="submit" disabled={submitting}>{submitting ? "Guardando..." : "Cambiar contraseña"}</button><button className="login-link" type="button" onClick={() => { setError(""); setMode("request"); }}>Solicitar otro enlace</button></form>}
    {mode === "done" && <div className="reset-done"><output>{message}</output><button className="primary-button" type="button" onClick={() => setMode("login")}>Volver al inicio de sesión</button></div>}
  </section></main>;
}

function getFormText(form: FormData, field: string) {
  const value = form.get(field);
  return typeof value === "string" ? value : "";
}

/** Pantalla de acceso y gestión de agenda, reservas, usuarios e iluminación del club. */
export default function Home() {
  const today = new Date();
  const [date, setDate] = useState(today);
  const [courts, setCourts] = useState<Court[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [profile, setProfile] = useState<User | null>(null);
  const [showClients, setShowClients] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showClientForm, setShowClientForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [clientError, setClientError] = useState("");
  const [creatingClient, setCreatingClient] = useState(false);
  const [editingClient, setEditingClient] = useState<User | null>(null);
  const [editingReservation, setEditingReservation] = useState<(Reservation & { courtId: number }) | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);

  /** Carga la agenda para la fecha seleccionada y muestra el estado vacío ante fallos. */
  async function loadSchedule(selectedDate: Date) {
    try { setCourts(await api.courts.schedule(dateKey(selectedDate))); } catch { setCourts([]); }
    setLoading(false);
  }

  useEffect(() => {
    if (!profile) return;
    let active = true;
    api.courts.schedule(dateKey(date))
      .then((data) => { if (active) { setCourts(data); setLoading(false); } })
      .catch(() => { if (active) { setCourts([]); setLoading(false); } });
    return () => { active = false; };
  }, [date, profile]);
  useEffect(() => {
    api.auth.currentUser().then(setProfile).catch(() => setProfile(null));
  }, []);

  useEffect(() => { if (profile?.role === "ADMIN") api.users.list().then(setUsers).catch(() => setUsers([])); }, [profile]);

  /** Cierra la sesión en el servidor y limpia los datos visibles del usuario. */
  async function signOut() { try { await api.auth.logout(); setProfile(null); setCourts([]); setUsers([]); } catch { setFormError("No se pudo cerrar la sesión."); } }

  /** Selecciona una fecha de agenda e indica que sus datos se están cargando. */
  function selectDate(nextDate: Date) { setLoading(true); setDate(nextDate); }

  /** Cambia la iluminación de una pista; solo permite la acción a administradores. */
  async function toggleLights(court: Court) {
    if (profile?.role !== "ADMIN") return;
    const lightsOn = !court.lightsOn;
    setCourts((items) => items.map((item) => item.id === court.id ? { ...item, lightsOn } : item));
    try { await api.courts.setLights(court.id, lightsOn); } catch { setCourts((items) => items.map((item) => item.id === court.id ? { ...item, lightsOn: !lightsOn } : item)); }
  }

  /** Valida y crea una reserva con la fecha local convertida a UTC. */
  async function createReservation(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setFormError("");
    const form = new FormData(event.currentTarget);
    const startsAt = clubDateTimeToUtc(getFormText(form, "date"), getFormText(form, "time"));
    if (!startsAt) { setFormError("La fecha u hora seleccionada no es válida."); setSubmitting(false); return; }
    try {
      await api.reservations.create({ courtId: Number(form.get("courtId")), userId: form.get("userId"), startsAt: startsAt.toISOString(), players: Number(form.get("players")), withLight: form.get("withLight") === "on", status: form.get("status") });
      setShowForm(false);
      await loadSchedule(date);
    } catch (error) { setFormError(error instanceof Error ? error.message : "No se pudo crear la reserva."); }
    setSubmitting(false);
  }

  /** Actualiza la reserva seleccionada y recarga la agenda al completar el cambio. */
  async function updateReservation(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingReservation?.id) return;
    setSubmitting(true);
    setFormError("");
    const form = new FormData(event.currentTarget);
    const startsAt = clubDateTimeToUtc(getFormText(form, "date"), getFormText(form, "time"));
    if (!startsAt) { setFormError("La fecha u hora seleccionada no es válida."); setSubmitting(false); return; }
    try {
      await api.reservations.update(editingReservation.id, { courtId: Number(form.get("courtId")), userId: form.get("userId"), startsAt: startsAt.toISOString(), players: Number(form.get("players")), withLight: form.get("withLight") === "on", status: form.get("status"), notes: form.get("notes") });
      setEditingReservation(null);
      setShowForm(false);
      await loadSchedule(date);
    } catch (error) { setFormError(error instanceof Error ? error.message : "No se pudo actualizar la reserva."); }
    setSubmitting(false);
  }

  /** Valida y crea un usuario desde el formulario de administración. */
  async function createClient(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreatingClient(true);
    setClientError("");
    const form = new FormData(event.currentTarget);
    const input = { name: form.get("name"), email: form.get("email"), phone: form.get("phone"), password: form.get("password"), role: form.get("role") };
    const validationError = validateUserInput(input, { passwordRequired: true });
    if (validationError) { setClientError(validationError); setCreatingClient(false); return; }
    try {
      const data = await api.users.create(input);
      setUsers((items) => [...items, data].sort((first, second) => first.name.localeCompare(second.name, "es")));
      setShowClientForm(false);
    } catch (error) { setClientError(error instanceof Error ? error.message : "No se pudo dar de alta al cliente."); }
    setCreatingClient(false);
  }

  /** Valida y actualiza el usuario seleccionado, conservando su contraseña si queda vacía. */
  async function updateClient(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingClient) return;
    setCreatingClient(true);
    setClientError("");
    const form = new FormData(event.currentTarget);
    const input = { name: form.get("name"), email: form.get("email"), phone: form.get("phone"), password: form.get("password"), role: form.get("role") };
    const validationError = validateUserInput(input, { passwordRequired: false });
    if (validationError) { setClientError(validationError); setCreatingClient(false); return; }
    try {
      const data = await api.users.update(editingClient.id, input);
      setUsers((items) => items.map((item) => item.id === data.id ? data : item).sort((first, second) => first.name.localeCompare(second.name, "es")));
      setEditingClient(null);
    } catch (error) { setClientError(error instanceof Error ? error.message : "No se pudo actualizar el cliente."); }
    setCreatingClient(false);
  }

  const dates = Array.from({ length: 7 }, (_, index) => { const item = new Date(today); item.setDate(today.getDate() - 3 + weekOffset * 7 + index); return item; });
  const reservations = courts.flatMap((court) => court.reservations);
  const title = new Intl.DateTimeFormat("es-ES", { weekday: "long", day: "numeric", month: "long" }).format(date);
  const userName = profile?.name ?? "";
  const initials = userName.split(" ").filter(Boolean).slice(0, 2).map((name) => name[0]).join("").toUpperCase();
  const clientsToggleTitle = showClients ? "Ocultar clientes" : "Mostrar clientes";
  const reservationTitle = editingReservation ? "Modificar reserva" : "Nueva reserva";
  const reservationFormHandler = editingReservation ? updateReservation : createReservation;
  const reservationDate = editingReservation ? dateKey(new Date(editingReservation.startsAt)) : dateKey(date);
  let reservationTime = "";
  if (editingReservation) {
    const hour = clubTimeParts(new Date(editingReservation.startsAt)).hour;
    reservationTime = `${String(hour).padStart(2, "0")}:00`;
  }
  let reservationSubmitLabel = "Crear reserva";
  if (submitting) reservationSubmitLabel = "Guardando...";
  else if (editingReservation) reservationSubmitLabel = "Guardar cambios";

  if (!profile) return <LoginScreen onSuccess={setProfile} />;

  return <main><header className="topbar"><a className="brand" href="#inicio"><span className="brand-mark">P</span><span>Pistas Padel San Cristobal de Segovia</span></a><nav><a className="active" href="#agenda">Agenda</a>{profile.role === "ADMIN" && <button className="nav-button" title={clientsToggleTitle} onClick={() => setShowClients(!showClients)}>Clientes</button>}<a href="#informes">Informes</a></nav><div className="profile"><span className="avatar">{initials}</span><span>{userName}</span><button className="icon-button" onClick={signOut} aria-label="Cerrar sesión" title="Cerrar sesión"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 5H5v14h5M14 8l4 4-4 4M8 12h10" /></svg></button></div></header>
    <section className="hero" id="inicio"><div><p className="eyebrow">CENTRO DEPORTIVO</p><h1>{userName ? `Buenos días, ${userName}.` : "Buenos días."}</h1><p className="hero-copy">Gestiona tus reservas{profile.role === "ADMIN" ? " y la iluminación" : ""}.</p></div><button className="primary-button" title="Abrir el formulario para crear una reserva" onClick={() => { setFormError(""); setShowClients(false); setShowClientForm(false); setEditingClient(null); setEditingReservation(null); setShowForm(true); }}>
      <span>+</span> Nueva reserva
    </button></section>
    {showClients && profile.role === "ADMIN" && <section className="clients-panel" id="clientes"><div className="clients-heading"><div><p className="eyebrow">ADMINISTRACIÓN</p><h2>Clientes registrados</h2><p>Da de alta o actualiza clientes y administradores.</p></div><button className="outline-button" title="Abrir el formulario para crear un cliente" onClick={() => { setClientError(""); setEditingClient(null); setShowClientForm(!showClientForm); }}>+ Nuevo cliente</button></div>{showClientForm && <form className="client-form" onSubmit={createClient}><label>Nombre completo<input name="name" required /></label><label>Correo electrónico<input name="email" type="email" required /></label><label>Teléfono <small>Opcional</small><input name="phone" type="tel" /></label><label>Contraseña<input name="password" type="password" minLength={8} required /></label><label>Permisos<select name="role" defaultValue="CUSTOMER"><option value="CUSTOMER">Cliente</option><option value="ADMIN">Administrador</option></select></label>{clientError && <p className="form-error">{clientError}</p>}<div className="form-actions"><button type="button" className="cancel-button" title="Cancelar el alta del cliente" onClick={() => setShowClientForm(false)}>Cancelar</button><button type="submit" className="primary-button" disabled={creatingClient}>{creatingClient ? "Guardando..." : "Dar de alta"}</button></div></form>}{editingClient && <form className="client-form" onSubmit={updateClient}><label>Nombre completo<input name="name" defaultValue={editingClient.name} required /></label><label>Correo electrónico<input name="email" type="email" defaultValue={editingClient.email} required /></label><label>Teléfono <small>Opcional</small><input name="phone" type="tel" defaultValue={editingClient.phone ?? ""} /></label><label>Permisos<select name="role" defaultValue={editingClient.role}><option value="CUSTOMER">Cliente</option><option value="ADMIN">Administrador</option></select></label><label>Nueva contraseña <small>Déjala vacía para conservarla</small><input name="password" type="password" minLength={8} /></label>{clientError && <p className="form-error">{clientError}</p>}<div className="form-actions"><button type="button" className="cancel-button" title="Cancelar la edición del cliente" onClick={() => setEditingClient(null)}>Cancelar</button><button type="submit" className="primary-button" disabled={creatingClient}>{creatingClient ? "Guardando..." : "Guardar cambios"}</button></div></form>}<div className="clients-list">{users.map((user) => <article key={user.id}><span className="client-initials">{user.name.split(" ").map((word) => word[0]).slice(0, 2).join("")}</span><div><strong>{user.name}</strong><small>{user.email}{user.phone ? ` · ${user.phone}` : ""}</small></div><b>{user.role === "ADMIN" ? "Administrador" : "Cliente"}</b><button className="edit-client-button" onClick={() => { setClientError(""); setShowClientForm(false); setEditingClient(user); }}>Editar</button></article>)}</div></section>}
    {showForm && <section className="reservation-form" aria-labelledby="new-reservation-title"><div className="form-heading"><div><p className="eyebrow">AGENDA</p><h2 id="new-reservation-title">{reservationTitle}</h2><p>Completa los datos para bloquear una hora de pista.</p></div><button className="close-button" title="Cerrar el formulario de reserva" onClick={() => setShowForm(false)} aria-label="Cerrar formulario">×</button></div><form onSubmit={reservationFormHandler}>{profile.role === "ADMIN" && <label>Cliente<select name="userId" required defaultValue={editingReservation?.user.id ?? ""}><option value="" disabled>Selecciona un cliente</option>{users.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>}<label>Pista<select name="courtId" required defaultValue={editingReservation?.courtId ?? ""}><option value="" disabled>Selecciona una pista</option>{courts.map((court) => <option key={court.id} value={court.id}>{court.name}</option>)}</select></label><label>Fecha<input name="date" type="date" required defaultValue={reservationDate} /></label><label>Hora<select name="time" required defaultValue={reservationTime}>
      {slots.map((slot) => <option key={slot} value={slot}>{slot}</option>)}
    </select></label><label>Jugadores<select name="players" defaultValue={editingReservation?.players ?? 4}>{[1, 2, 3, 4].map((number) => <option key={number} value={number}>{number} jugadores</option>)}</select></label>{profile.role === "ADMIN" && <label>Estado<select name="status" defaultValue={editingReservation?.status ?? "CONFIRMED"}><option value="CONFIRMED">Confirmada</option><option value="PENDING">Pendiente</option><option value="CANCELLED">Cancelada</option></select></label>}<label className="light-option"><input name="withLight" type="checkbox" defaultChecked={editingReservation?.withLight} /> Necesita iluminación</label>{formError && <p className="form-error">{formError}</p>}<div className="form-actions"><button type="button" className="cancel-button" title="Cerrar el formulario de reserva" onClick={() => setShowForm(false)}>Cancelar</button><button type="submit" className="primary-button" disabled={submitting}>{reservationSubmitLabel}</button></div></form></section>}
    <section className="metrics"><article><span className="metric-symbol sun">◌</span><div><p>Ocupación del día</p><strong>{Math.round(reservations.length / 18 * 100)}<small>%</small></strong><em>Datos <span>en tiempo real</span></em></div></article><article><span className="metric-symbol calendar">□</span><div><p>Reservas</p><strong>{reservations.length}</strong><em>{reservations.filter((item) => item.status === "PENDING").length} <span>pendientes</span></em></div></article><article><span className="metric-symbol coin">◉</span><div><p>Luces activas</p><strong>{courts.filter((court) => court.lightsOn).length}<small>/3</small></strong><em>Control <span>persistente</span></em></div></article></section>
    <section className="schedule" id="agenda"><div className="schedule-head"><div><p className="eyebrow">AGENDA</p><h2>{title}</h2></div><div className="agenda-actions"><button className="arrow" title="Mostrar la semana anterior" onClick={() => { setWeekOffset((offset) => offset - 1); selectDate(dates[0]); }} aria-label="Semana anterior">‹</button><button className="date-picker" title="Volver a la fecha de hoy" onClick={() => { setWeekOffset(0); selectDate(today); }}>▣ <span>Hoy</span></button><button className="arrow" title="Mostrar la semana siguiente" onClick={() => { setWeekOffset((offset) => offset + 1); selectDate(dates[6]); }} aria-label="Semana siguiente">›</button></div></div><div className="days">{dates.map((item, index) => <button key={`${dateKey(item)}-${index}`} className={dateKey(item) === dateKey(date) ? "day selected" : "day"} aria-pressed={dateKey(item) === dateKey(date)} aria-label={`Mostrar agenda del ${new Intl.DateTimeFormat("es-ES", { dateStyle: "full" }).format(item)}`} title={`Mostrar agenda del ${new Intl.DateTimeFormat("es-ES", { dateStyle: "full" }).format(item)}`} onClick={() => selectDate(item)}>
        <span>{new Intl.DateTimeFormat("es-ES", { weekday: "short" }).format(item).replace(".", "")}</span><b>{item.getDate()}</b></button>)}</div><div className="court-list">{loading ? <p className="data-message">Cargando agenda...</p> : courts.map((court) => <article className="court-row" key={court.id}><div className="court-info"><span className="court-icon" aria-hidden="true" /><div><h3>{court.name}</h3><p>{court.description}</p></div><span className={court.lightsOn ? "light-badge on" : "light-badge"}>{court.lightsOn ? "Luz encendida" : "Luz apagada"}</span></div><div className="booking-track"><div className="slot-labels">{slots.map((slot) => <span key={slot}>{slot}</span>)}</div><div className="booking-grid">{court.reservations.map((reservation) => { const hour = `${String(clubTimeParts(new Date(reservation.startsAt)).hour).padStart(2, "0")}:00`; const index = slots.indexOf(hour); return index < 0 ? null : <button key={reservation.id ?? reservation.startsAt} className={`booking ${reservation.status === "PENDING" ? "pendiente" : "confirmada"}`} aria-label={`${hour}, ${reservation.user.name}, ${reservation.players} jugadores${reservation.withLight ? ", necesita iluminación" : ""}`} title={`Reserva ${hour}: ${reservation.user.name}, ${reservation.players} jugadores`} style={{ left: `${index / 6 * 100}%` }} disabled={profile.role !== "ADMIN"} onClick={() => { if (profile.role === "ADMIN") { setFormError(""); setEditingReservation({ ...reservation, courtId: court.id }); setShowForm(true); } }}>
        <b>{hour}</b><span>{reservation.user.name}</span><small>{reservation.players} pers. {reservation.withLight && "· Luz"}</small></button>; })}</div></div><button className={court.lightsOn ? "switch enabled" : "switch"} aria-label={`${court.lightsOn ? "Apagar" : "Encender"} luz de ${court.name}`} aria-pressed={court.lightsOn} title={`${court.lightsOn ? "Apagar" : "Encender"} luz de ${court.name}`} onClick={() => toggleLights(court)}>
        <i /></button></article>)}</div></section>
    <section className="bottom-grid"><article className="next-booking"><p className="eyebrow">POSTGRESQL</p><div className="next-content"><div className="time-block"><strong>{courts.length}</strong><span>pistas</span></div><div><h2>Datos persistentes</h2><p>Usuarios, reservas, fechas y luz se guardan en la base de datos.</p></div></div></article><article className="lighting"><div><p className="eyebrow">ILUMINACIÓN</p><h2>Control de pistas</h2></div><div className="light-controls">{courts.map((court) => <button key={court.id} className={court.lightsOn ? "light-control active" : "light-control"} aria-pressed={court.lightsOn} title={`${court.lightsOn ? "Apagar" : "Encender"} luz de ${court.name}`} onClick={() => toggleLights(court)}>
        <span>{court.name}</span><i /></button>)}</div></article></section>
  </main>;
}
