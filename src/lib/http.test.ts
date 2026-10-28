import { describe, expect, test } from "vitest";
import { readJson } from "@/lib/http";

function jsonRequest(body: string, headers: Record<string, string> = { "Content-Type": "application/json" }) {
  return new Request("http://localhost/api/test", { method: "POST", headers, body });
}

describe("readJson", () => {
  test("lee JSON válido con charset", async () => {
    await expect(readJson(jsonRequest("{\"name\":\"Ana\"}", { "Content-Type": "application/json; charset=utf-8" })))
      .resolves.toEqual({ name: "Ana" });
  });

  test("rechaza tipos de contenido distintos de JSON", async () => {
    await expect(readJson(jsonRequest("name=Ana", { "Content-Type": "application/x-www-form-urlencoded" })))
      .resolves.toBeNull();
  });

  test("rechaza cuerpos mayores que el límite de entrada", async () => {
    const content = JSON.stringify({ value: "x".repeat(65 * 1024) });
    await expect(readJson(jsonRequest(content))).resolves.toBeNull();
  });

  test("rechaza JSON mal formado y UTF-8 inválido", async () => {
    await expect(readJson(jsonRequest("{"))).resolves.toBeNull();
    const invalidUtf8 = new Uint8Array([0xc3, 0x28]);
    const request = new Request("http://localhost/api/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: invalidUtf8,
    });
    await expect(readJson(request)).resolves.toBeNull();
  });
});
