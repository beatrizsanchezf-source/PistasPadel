const trustedUpstashSuffix = ".upstash.io";

/** Accept only canonical Upstash REST origins; reject arbitrary fetch targets. */
export function parseUpstashRestUrl(value: string): URL | null {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }

  const hostname = url.hostname.toLowerCase();
  if (url.protocol !== "https:") return null;
  if (!hostname.endsWith(trustedUpstashSuffix) || hostname.length <= trustedUpstashSuffix.length) return null;
  if (url.username || url.password || (url.port && url.port !== "443")) return null;
  if (url.pathname !== "/" || url.search || url.hash) return null;

  return url;
}
