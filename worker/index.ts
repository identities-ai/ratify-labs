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

async function routeMaritime(request: Request, env: Env): Promise<Response> {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response("Method not allowed", { status: 405, headers: { Allow: "GET, HEAD", "Cache-Control": "no-store" } });
  }
  if (!env.MARITIME_ORIGIN || !env.LABS_ROUTER_TOKEN || env.LABS_ROUTER_TOKEN.length < 32) {
    return new Response("Reference unavailable", { status: 503, headers: { "Cache-Control": "no-store" } });
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
    const responseHeaders = new Headers(upstream.headers);
    responseHeaders.delete("Set-Cookie");
    responseHeaders.set("X-Ratify-Labs-Reference", "maritime");
    return new Response(upstream.body, { status: upstream.status, headers: responseHeaders });
  } catch {
    return new Response("Reference unavailable", { status: 502, headers: { "Cache-Control": "no-store" } });
  }
}

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    if (!isAllowedHost(url.hostname)) return new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });
    if (url.pathname === "/maritime" || url.pathname.startsWith("/maritime/")) return routeMaritime(request, env);
    if (url.pathname === "/_vinext/image") {
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      return handleImageOptimization(request, {
        fetchAsset: (path) => env.ASSETS.fetch(new Request(new URL(path, request.url))),
        transformImage: async (body, { width, format, quality }) => (await env.IMAGES.input(body).transform(width > 0 ? { width } : {}).output({ format, quality })).response(),
      }, allowedWidths);
    }
    return handler.fetch(request, env, ctx);
  },
};

export default worker;
