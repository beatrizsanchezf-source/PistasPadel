import { expect, test, type Page } from "@playwright/test";

const admin = { id: "admin-1", name: "Administración", email: "admin@example.test", phone: null, role: "ADMIN" };
const customer = { id: "customer-1", name: "María García", email: "maria@example.test", phone: null, role: "CUSTOMER" };
const court = { id: 1, name: "Pista 1", description: "Cubierta", lightsOn: false, reservations: [] };

async function mockApi(page: Page) {
  await page.route("**/api/auth/me", (route) => route.fulfill({ json: null }));
  await page.route("**/api/auth/login", async (route) => {
    const request = route.request().postDataJSON() as { email: string };
    await route.fulfill({ json: request.email === customer.email ? customer : admin });
  });
  await page.route("**/api/schedule?**", (route) => route.fulfill({ json: [court] }));
  await page.route("**/api/auth/password-reset", (route) => route.fulfill({
    status: 202,
    json: { message: "Si el correo está asociado a una cuenta, recibirás un enlace para restablecer la contraseña." },
  }));
}

test("login de administrador abre la agenda y los controles de clientes", async ({ page }) => {
  await mockApi(page);
  await page.goto("/");

  await page.getByLabel("Correo electrónico").fill(admin.email);
  await page.getByLabel("Contraseña").fill("una-clave-de-prueba");
  await page.getByRole("button", { name: "Entrar" }).click();

  await expect(page.getByRole("heading", { name: "Pista 1" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Clientes" })).toBeVisible();
});

test("el usuario puede solicitar un correo de restablecimiento", async ({ page }) => {
  await mockApi(page);
  await page.goto("/");

  await page.getByRole("button", { name: "¿Has olvidado la contraseña?" }).click();
  await page.getByLabel("Correo electrónico").fill("persona@example.test");
  await page.getByRole("button", { name: "Enviar enlace" }).click();

  await expect(page.getByText("Si el correo está asociado a una cuenta, recibirás un enlace para restablecer la contraseña.")).toBeVisible();
});

test("un cliente inicia sesión sin ver controles administrativos", async ({ page }) => {
  await mockApi(page);
  await page.goto("/");

  await page.getByLabel("Correo electrónico").fill(customer.email);
  await page.getByLabel("Contraseña").fill("una-clave-de-prueba");
  await page.getByRole("button", { name: "Entrar" }).click();

  await expect(page.getByRole("heading", { name: "Pista 1" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Clientes" })).toHaveCount(0);
});

test("abre el formulario de cambio desde un token y lo retira de la URL", async ({ page }) => {
  await mockApi(page);
  await page.route("**/api/auth/password-reset/confirm", (route) => route.fulfill({
    json: { message: "La contraseña se ha cambiado. Ya puedes iniciar sesión." },
  }));
  await page.goto("/?resetToken=reset-token-for-e2e");

  await expect(page.getByRole("heading", { name: "Crea una contraseña nueva" })).toBeVisible();
  await expect(page).toHaveURL("https://localhost:3000/");
  await page.getByLabel("Nueva contraseña").fill("una-clave-nueva-de-prueba");
  await page.getByRole("button", { name: "Cambiar contraseña" }).click();

  await expect(page.getByText("La contraseña se ha cambiado. Ya puedes iniciar sesión.")).toBeVisible();
});

test("permite completar el acceso navegando con teclado", async ({ page }) => {
  await mockApi(page);
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(page.getByLabel("Correo electrónico")).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByLabel("Contraseña")).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Entrar" })).toBeFocused();
});
