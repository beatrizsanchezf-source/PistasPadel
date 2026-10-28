"use client";

import { startTransition, type SubmitEvent, useEffect, useState } from "react";
import { api, type ClientUser } from "@/lib/client-api";

type LoginMode = "login" | "request" | "confirm" | "done";

type LoginScreenProps = Readonly<{ onSuccess: (user: ClientUser) => void }>;

export default function LoginScreen({ onSuccess }: LoginScreenProps) {
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
    if (!token) return;
    startTransition(() => {
      setResetToken(token);
      setMode("confirm");
    });
    window.history.replaceState(null, "", window.location.pathname);
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

  return <main className="login-page"><section className="login-card"><div className="brand"><span className="brand-mark">P</span><span>Pistas Padel San Cristobal de Segovia</span></div><p className="eyebrow">ACCESO PRIVADO</p><h1>{titles[mode]}</h1><p>{descriptions[mode]}</p>
    {mode === "login" && <form onSubmit={submitLogin}><label>Correo electrónico<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="username" required /></label><label>Contraseña<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required /></label>{message && <output className="form-message">{message}</output>}{error && <p className="form-error" role="alert">{error}</p>}<button className="primary-button" type="submit" title="Iniciar sesión" disabled={submitting}>{submitting ? "Accediendo..." : "Entrar"}</button><button className="login-link" type="button" onClick={() => { setError(""); setMessage(""); setMode("request"); }}>¿Has olvidado la contraseña?</button></form>}
    {mode === "request" && <form onSubmit={requestReset}><label>Correo electrónico<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required /></label>{error && <p className="form-error" role="alert">{error}</p>}<button className="primary-button" type="submit" disabled={submitting}>{submitting ? "Enviando..." : "Enviar enlace"}</button><button className="login-link" type="button" onClick={() => { setError(""); setMode("login"); }}>Volver al inicio de sesión</button></form>}
    {mode === "confirm" && <form onSubmit={confirmReset}><label>Nueva contraseña<input type="password" value={resetPassword} onChange={(event) => setResetPassword(event.target.value)} autoComplete="new-password" minLength={12} maxLength={128} required /></label><small className="password-hint">Usa al menos 12 caracteres.</small>{error && <p className="form-error" role="alert">{error}</p>}<button className="primary-button" type="submit" disabled={submitting}>{submitting ? "Guardando..." : "Cambiar contraseña"}</button><button className="login-link" type="button" onClick={() => { setError(""); setMode("request"); }}>Solicitar otro enlace</button></form>}
    {mode === "done" && <div className="reset-done"><output>{message}</output><button className="primary-button" type="button" onClick={() => setMode("login")}>Volver al inicio de sesión</button></div>}
  </section></main>;
}
