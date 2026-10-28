"use client";

import { type SubmitEvent, useState } from "react";
import { api, type ClientUser } from "@/lib/client-api";
import { validateUserInput } from "@/lib/user-validation";

type ClientsPanelProps = Readonly<{
  users: ClientUser[];
  onUsersChange: (users: ClientUser[]) => void;
}>;

type UserFormData = {
  name: FormDataEntryValue | null;
  email: FormDataEntryValue | null;
  phone: FormDataEntryValue | null;
  password: FormDataEntryValue | null;
  role: FormDataEntryValue | null;
};

function sortUsers(users: ClientUser[]) {
  return [...users].sort((first, second) => first.name.localeCompare(second.name, "es"));
}

function readUserForm(form: FormData): UserFormData {
  return {
    name: form.get("name"),
    email: form.get("email"),
    phone: form.get("phone"),
    password: form.get("password"),
    role: form.get("role"),
  };
}

export default function ClientsPanel({ users, onUsersChange }: ClientsPanelProps) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingUser, setEditingUser] = useState<ClientUser | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function createClient(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const input = readUserForm(new FormData(event.currentTarget));
    const validationError = validateUserInput(input, { passwordRequired: true });
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    try {
      const created = await api.users.create(input);
      onUsersChange(sortUsers([...users, created]));
      setShowCreateForm(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo dar de alta al cliente.");
    } finally {
      setSaving(false);
    }
  }

  async function updateClient(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingUser) return;
    setError("");
    const input = readUserForm(new FormData(event.currentTarget));
    const validationError = validateUserInput(input, { passwordRequired: false });
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    try {
      const updated = await api.users.update(editingUser.id, input);
      onUsersChange(sortUsers(users.map((user) => user.id === updated.id ? updated : user)));
      setEditingUser(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo actualizar al cliente.");
    } finally {
      setSaving(false);
    }
  }

  function beginCreate() {
    setError("");
    setEditingUser(null);
    setShowCreateForm((visible) => !visible);
  }

  function beginEdit(user: ClientUser) {
    setError("");
    setShowCreateForm(false);
    setEditingUser(user);
  }

  return <section className="clients-panel" id="clientes">
    <div className="clients-heading">
      <div><p className="eyebrow">ADMINISTRACIÓN</p><h2>Clientes registrados</h2><p>Da de alta o actualiza clientes y administradores.</p></div>
      <button className="outline-button" title="Abrir el formulario para crear un cliente" onClick={beginCreate}>+ Nuevo cliente</button>
    </div>
    {showCreateForm && <form className="client-form" onSubmit={createClient}>
      <label>Nombre completo<input name="name" required /></label>
      <label>Correo electrónico<input name="email" type="email" required /></label>
      <label>Teléfono <small>Opcional</small><input name="phone" type="tel" /></label>
      <label>Contraseña<input name="password" type="password" minLength={8} required /></label>
      <label>Permisos<select name="role" defaultValue="CUSTOMER"><option value="CUSTOMER">Cliente</option><option value="ADMIN">Administrador</option></select></label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="form-actions"><button type="button" className="cancel-button" onClick={() => setShowCreateForm(false)}>Cancelar</button><button type="submit" className="primary-button" disabled={saving}>{saving ? "Guardando..." : "Dar de alta"}</button></div>
    </form>}
    {editingUser && <form className="client-form" onSubmit={updateClient}>
      <label>Nombre completo<input name="name" defaultValue={editingUser.name} required /></label>
      <label>Correo electrónico<input name="email" type="email" defaultValue={editingUser.email} required /></label>
      <label>Teléfono <small>Opcional</small><input name="phone" type="tel" defaultValue={editingUser.phone ?? ""} /></label>
      <label>Permisos<select name="role" defaultValue={editingUser.role}><option value="CUSTOMER">Cliente</option><option value="ADMIN">Administrador</option></select></label>
      <label>Nueva contraseña <small>Déjala vacía para conservarla</small><input name="password" type="password" minLength={8} /></label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="form-actions"><button type="button" className="cancel-button" onClick={() => setEditingUser(null)}>Cancelar</button><button type="submit" className="primary-button" disabled={saving}>{saving ? "Guardando..." : "Guardar cambios"}</button></div>
    </form>}
    <div className="clients-list">{users.map((user) => <article key={user.id}>
      <span className="client-initials">{user.name.split(" ").map((word) => word[0]).slice(0, 2).join("")}</span>
      <div><strong>{user.name}</strong><small>{user.email}{user.phone ? ` · ${user.phone}` : ""}</small></div>
      <b>{user.role === "ADMIN" ? "Administrador" : "Cliente"}</b>
      <button className="edit-client-button" onClick={() => beginEdit(user)}>Editar</button>
    </article>)}</div>
  </section>;
}
