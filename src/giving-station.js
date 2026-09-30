import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { createConnectionToken, createPaymentIntent } from "./stripe-boundary.js";

const root = fileURLToPath(new URL("../public/", import.meta.url));
const port = Number(process.env.PORT || 8787);
const secretKey = process.env.STRIPE_SECRET_KEY || "";
const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
};

function reply(response, status, payload, type = "application/json; charset=utf-8") {
  response.writeHead(status, { "Content-Type": type, "Cache-Control": "no-store" });
  response.end(typeof payload === "string" ? payload : JSON.stringify(payload));
}

async function readJson(request) {
  let body = "";
  for await (const chunk of request) {
    body += chunk;
    if (body.length > 16_384) throw new Error("Request is too large");
  }
  return JSON.parse(body || "{}");
}

async function serveStatic(pathname, response) {
  const requested = pathname === "/" ? "index.html" : pathname.slice(1);
  const safe = normalize(requested).replace(/^(\.\.(\/|\\|$))+/, "");
  const file = join(root, safe);
  if (!file.startsWith(root)) return reply(response, 403, { error: "Forbidden" });
  try {
    const body = await readFile(file);
    reply(response, 200, body, contentTypes[extname(file)] || "application/octet-stream");
  } catch {
    reply(response, 404, { error: "Not found" });
  }
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);
  try {
    if (request.method === "POST" && url.pathname === "/api/connection-token") {
      return reply(response, 200, await createConnectionToken(secretKey));
    }
    if (request.method === "POST" && url.pathname === "/api/payment-intents") {
      const { amount } = await readJson(request);
      return reply(response, 200, await createPaymentIntent(amount, secretKey));
    }
    if (request.method === "GET") return serveStatic(url.pathname, response);
    reply(response, 405, { error: "Method not allowed" });
  } catch (error) {
    reply(response, 400, { error: error.message });
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Tap-to-Donate listening at http://127.0.0.1:${port}`);
  console.log(secretKey ? "Stripe test mode enabled" : "Mock mode enabled — no payment will be created");
});
