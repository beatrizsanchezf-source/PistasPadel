import { describe, expect, it } from "vitest";
import { parseUpstashRestUrl } from "@/lib/upstash-url";

describe("parseUpstashRestUrl", () => {
  it("acepta un origen HTTPS bajo upstash.io", () => {
    expect(parseUpstashRestUrl("https://my-database.upstash.io/")?.origin).toBe("https://my-database.upstash.io");
  });

  it.each([
    "http://my-database.upstash.io",
    "https://localhost",
    "https://127.0.0.1",
    "https://169.254.169.254/latest/meta-data",
    "https://upstash.io.attacker.example",
    "https://attacker-upstash.io",
    "https://user:pass@my-database.upstash.io",
    "https://my-database.upstash.io:8443",
    "https://my-database.upstash.io/pipeline",
  ])("rechaza destinos no permitidos: %s", (value) => {
    expect(parseUpstashRestUrl(value)).toBeNull();
  });
});
