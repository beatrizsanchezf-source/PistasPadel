import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Home from "./page";
import { api } from "@/lib/client-api";

vi.mock("@/lib/client-api", () => ({
  api: {
    auth: {
      currentUser: vi.fn(),
      login: vi.fn(),
      requestPasswordReset: vi.fn(),
      confirmPasswordReset: vi.fn(),
      logout: vi.fn(),
    },
    courts: {
      schedule: vi.fn(),
      setLights: vi.fn(),
    },
    users: {
      list: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    reservations: {
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

const customer = { id: "customer-1", name: "María García", email: "maria@example.test", phone: null, role: "CUSTOMER" as const };
const admin = { id: "admin-1", name: "Administración", email: "admin@example.test", phone: null, role: "ADMIN" as const };
const schedule = [{
  id: 1,
  name: "Pista 1",
  description: "Cubierta",
  lightsOn: false,
  reservations: [{ id: "reservation-1", startsAt: "2026-09-28T15:00:00.000Z", players: 4, withLight: false, status: "CONFIRMED" as const, user: { name: "María García" } }],
}];

const mockedApi = vi.mocked(api, { deep: true });

beforeEach(() => {
  vi.clearAllMocks();
  mockedApi.auth.currentUser.mockResolvedValue(null);
  mockedApi.auth.login.mockResolvedValue(admin);
  mockedApi.auth.requestPasswordReset.mockResolvedValue({ message: "Si el correo está asociado a una cuenta, recibirás un enlace para restablecer la contraseña." });
  mockedApi.auth.confirmPasswordReset.mockResolvedValue({ message: "La contraseña se ha cambiado. Ya puedes iniciar sesión." });
  mockedApi.auth.logout.mockResolvedValue({ ok: true });
  mockedApi.courts.schedule.mockResolvedValue(schedule);
  mockedApi.courts.setLights.mockResolvedValue(schedule[0]);
  mockedApi.users.list.mockResolvedValue([customer, admin]);
});

afterEach(() => cleanup());

describe("Home", () => {
  it("permite iniciar sesión y muestra la agenda del usuario", async () => {
    const user = userEvent.setup();
    render(<Home />);

    await user.type(screen.getByLabelText("Correo electrónico"), admin.email);
    await user.type(screen.getByLabelText("Contraseña"), "una-contrasena-segura");
    await user.click(screen.getByRole("button", { name: "Entrar" }));

    await waitFor(() => expect(screen.getByRole("heading", { name: /Buenos días/ })).toBeInTheDocument());
    expect(mockedApi.auth.login).toHaveBeenCalledWith({ email: admin.email, password: "una-contrasena-segura" });
      expect(screen.getByRole("heading", { name: "Pista 1" })).toBeInTheDocument();
  });

  it("carga y muestra las reservas de la agenda", async () => {
    mockedApi.auth.currentUser.mockResolvedValue(customer);
    render(<Home />);

    await waitFor(() => expect(screen.getByRole("heading", { name: "Pista 1" })).toBeInTheDocument());
    expect(mockedApi.courts.schedule).toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /María García/ })).toBeInTheDocument();
    expect(screen.getByText("Ocupación del día")).toBeInTheDocument();
  });

  it("oculta los controles de administración para clientes y los muestra para administradores", async () => {
    mockedApi.auth.currentUser.mockResolvedValue(customer);
    const { unmount } = render(<Home />);

    await waitFor(() => expect(screen.getByRole("heading", { name: "Pista 1" })).toBeInTheDocument());
    expect(screen.queryByRole("button", { name: "Clientes" })).not.toBeInTheDocument();
    unmount();

    mockedApi.auth.currentUser.mockResolvedValue(admin);
    render(<Home />);
    await waitFor(() => expect(screen.getByRole("button", { name: "Clientes" })).toBeInTheDocument());
  });

  it("muestra el error del login cuando la API rechaza las credenciales", async () => {
    mockedApi.auth.login.mockRejectedValue(new Error("Correo o contraseña incorrectos."));
    render(<Home />);

    fireEvent.change(screen.getByLabelText("Correo electrónico"), { target: { value: customer.email } });
    fireEvent.change(screen.getByLabelText("Contraseña"), { target: { value: "incorrecta" } });
    fireEvent.submit(screen.getByRole("button", { name: "Entrar" }).closest("form")!);

    expect(await screen.findByText("Correo o contraseña incorrectos.")).toBeInTheDocument();
  });

  it("permite solicitar un enlace de restablecimiento desde el login", async () => {
    const user = userEvent.setup();
    render(<Home />);

    await user.click(screen.getByRole("button", { name: "¿Has olvidado la contraseña?" }));
    await user.type(screen.getByLabelText("Correo electrónico"), customer.email);
    await user.click(screen.getByRole("button", { name: "Enviar enlace" }));

    expect(mockedApi.auth.requestPasswordReset).toHaveBeenCalledWith(customer.email);
    expect(await screen.findByText("Si el correo está asociado a una cuenta, recibirás un enlace para restablecer la contraseña.")).toHaveProperty("tagName", "OUTPUT");
  });
});
