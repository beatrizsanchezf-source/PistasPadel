"use client";

import type { SubmitEvent } from "react";
import type { ClientUser, ScheduleCourt, ScheduleReservation } from "@/lib/client-api";
import { clubDateKey, clubTimeParts } from "@/lib/club-time";

type ReservationFormData = {
  courtId: number;
  userId: FormDataEntryValue | null;
  date: string;
  time: string;
  players: number;
  withLight: boolean;
  status: FormDataEntryValue | null;
  notes: FormDataEntryValue | null;
};

type ReservationFormProps = Readonly<{
  courts: ScheduleCourt[];
  users: ClientUser[];
  isAdmin: boolean;
  editingReservation: (ScheduleReservation & { courtId: number }) | null;
  submitting: boolean;
  error: string;
  onClose: () => void;
  onSubmit: (data: ReservationFormData) => Promise<void>;
}>;

const times = ["16:00", "17:00", "18:00", "19:00", "20:00", "21:00"];

function readForm(form: FormData): ReservationFormData {
  const date = form.get("date");
  const time = form.get("time");
  return {
    courtId: Number(form.get("courtId")),
    userId: form.get("userId"),
    date: typeof date === "string" ? date : "",
    time: typeof time === "string" ? time : "",
    players: Number(form.get("players")),
    withLight: form.get("withLight") === "on",
    status: form.get("status"),
    notes: form.get("notes"),
  };
}

export default function ReservationForm({ courts, users, isAdmin, editingReservation, submitting, error, onClose, onSubmit }: ReservationFormProps) {
  const reservationDate = editingReservation ? clubDateKey(new Date(editingReservation.startsAt)) : "";
  const reservationTime = editingReservation ? `${String(clubTimeParts(new Date(editingReservation.startsAt)).hour).padStart(2, "0")}:00` : "";
  const title = editingReservation ? "Modificar reserva" : "Nueva reserva";
  let submitLabel = editingReservation ? "Guardar cambios" : "Crear reserva";
  if (submitting) submitLabel = "Guardando...";

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    void onSubmit(readForm(new FormData(event.currentTarget)));
  }

  return <section className="reservation-form" aria-labelledby="new-reservation-title">
    <div className="form-heading"><div><p className="eyebrow">AGENDA</p><h2 id="new-reservation-title">{title}</h2><p>Completa los datos para bloquear una hora de pista.</p></div><button className="close-button" type="button" title="Cerrar el formulario de reserva" onClick={onClose} aria-label="Cerrar formulario">×</button></div>
    <form onSubmit={handleSubmit}>
      {isAdmin && <label>Cliente<select name="userId" required defaultValue={editingReservation?.user.id ?? ""}><option value="" disabled>Selecciona un cliente</option>{users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select></label>}
      <label>Pista<select name="courtId" required defaultValue={editingReservation?.courtId ?? ""}><option value="" disabled>Selecciona una pista</option>{courts.map((court) => <option key={court.id} value={court.id}>{court.name}</option>)}</select></label>
      <label>Fecha<input name="date" type="date" required defaultValue={reservationDate} /></label>
      <label>Hora<select name="time" required defaultValue={reservationTime}><option value="" disabled>Selecciona una hora</option>{times.map((time) => <option key={time} value={time}>{time}</option>)}</select></label>
      <label>Jugadores<select name="players" defaultValue={editingReservation?.players ?? 4}>{[1, 2, 3, 4].map((count) => <option key={count} value={count}>{count} jugadores</option>)}</select></label>
      {isAdmin && <label>Estado<select name="status" defaultValue={editingReservation?.status ?? "CONFIRMED"}><option value="CONFIRMED">Confirmada</option><option value="PENDING">Pendiente</option><option value="CANCELLED">Cancelada</option></select></label>}
      <label className="light-option"><input name="withLight" type="checkbox" defaultChecked={editingReservation?.withLight} /> Necesita iluminación</label>
      {isAdmin && editingReservation && <label>Observaciones<input name="notes" type="text" maxLength={500} defaultValue={editingReservation.notes ?? ""} /></label>}
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="form-actions"><button type="button" className="cancel-button" title="Cerrar el formulario de reserva" onClick={onClose}>Cancelar</button><button type="submit" className="primary-button" disabled={submitting}>{submitLabel}</button></div>
    </form>
  </section>;
}

export type { ReservationFormData };
