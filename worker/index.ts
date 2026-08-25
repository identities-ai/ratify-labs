import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";

interface Fetcher {
  fetch(request: Request): Promise<Response>;
}

interface Env {
  ASSETS: Fetcher;
  IMAGES: { input(stream: ReadableStream): { transform(options: Record<string, unknown>): { output(options: { format: string; quality: number }): Promise<{ response(): Response }> } } };
  LABS_ROUTER_TOKEN: string;
  MARITIME_ORIGIN: string;
}

interface ExecutionContext { waitUntil(promise: Promise<unknown>): void; }

const LABS_HOST = "labs.ratifyprotocol.com";
const ROUTE_HEADER = "X-Ratify-Labs-Route";

function isAllowedHost(hostname: string): boolean {
  return hostname === LABS_HOST || hostname === "localhost" || hostname === "127.0.0.1";
}

function isMaritimePublicPath(pathname: string): boolean {
  return pathname === "/maritime" ||
    pathname === "/maritime/" ||
    pathname === "/maritime/ratify-logo.png" ||
    pathname === "/maritime/og.jpg" ||
    pathname === "/maritime/favicon.svg" ||
    (pathname.startsWith("/maritime/_next/static/") && pathname.length > "/maritime/_next/static/".length);
}

function securityHeaders(headers = new Headers()): Headers {
  headers.set("Content-Security-Policy", "frame-ancestors 'self'");
  headers.set("X-Frame-Options", "SAMEORIGIN");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  return headers;
}

function isCatalogAsset(pathname: string): boolean {
  return pathname === "/favicon.svg" ||
    pathname === "/og.jpg" ||
    pathname === "/ratify-logo.png" ||
    pathname.startsWith("/_next/static/");
}

async function serveAsset(request: Request, env: Env): Promise<Response> {
  const asset = await env.ASSETS.fetch(request);
  const headers = securityHeaders(new Headers(asset.headers));
  headers.delete("Set-Cookie");
  return new Response(asset.body, { status: asset.status, headers });
}

async function routeMaritime(request: Request, env: Env): Promise<Response> {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response("Method not allowed", { status: 405, headers: securityHeaders(new Headers({ Allow: "GET, HEAD", "Cache-Control": "no-store" })) });
  }
  if (!env.MARITIME_ORIGIN || !env.LABS_ROUTER_TOKEN || env.LABS_ROUTER_TOKEN.length < 32) {
    return new Response("Reference unavailable", { status: 503, headers: securityHeaders(new Headers({ "Cache-Control": "no-store" })) });
  }
  const source = new URL(request.url);
  const target = new URL(source.pathname + source.search, env.MARITIME_ORIGIN);
  const headers = new Headers();
  for (const name of ["Accept", "Accept-Language", "If-None-Match", "Range"]) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  headers.set(ROUTE_HEADER, `Bearer ${env.LABS_ROUTER_TOKEN}`);
  try {
    const upstreamRequest = new Request(target, {
      method: request.method,
      headers,
      redirect: "manual",
      signal: AbortSignal.timeout(10_000),
    });
    const upstream = await fetch(upstreamRequest);
    if (!((upstream.status >= 200 && upstream.status < 300) || upstream.status === 304)) {
      return new Response("Reference unavailable", { status: 502, headers: securityHeaders(new Headers({ "Cache-Control": "no-store" })) });
    }
    const responseHeaders = securityHeaders(new Headers(upstream.headers));
    responseHeaders.delete("Set-Cookie");
    responseHeaders.set("X-Ratify-Labs-Reference", "maritime");
    return new Response(upstream.body, { status: upstream.status, headers: responseHeaders });
  } catch {
    return new Response("Reference unavailable", { status: 502, headers: securityHeaders(new Headers({ "Cache-Control": "no-store" })) });
  }
}

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    if (!isAllowedHost(url.hostname)) return new Response("Not found", { status: 404, headers: securityHeaders(new Headers({ "Cache-Control": "no-store" })) });
    if (isMaritimePublicPath(url.pathname)) return routeMaritime(request, env);
    if (url.pathname === "/maritime" || url.pathname.startsWith("/maritime/")) {
      return new Response("Not found", { status: 404, headers: securityHeaders(new Headers({ "Cache-Control": "no-store" })) });
    }
    if (isCatalogAsset(url.pathname)) return serveAsset(request, env);
    if (url.pathname === "/_vinext/image") {
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      return handleImageOptimization(request, {
        fetchAsset: (path) => env.ASSETS.fetch(new Request(new URL(path, request.url))),
        transformImage: async (body, { width, format, quality }) => (await env.IMAGES.input(body).transform(width > 0 ? { width } : {}).output({ format, quality })).response(),
      }, allowedWidths);
    }
    const response = await handler.fetch(request, env, ctx);
    return new Response(response.body, { status: response.status, headers: securityHeaders(new Headers(response.headers)) });
  },
};

export default worker;
