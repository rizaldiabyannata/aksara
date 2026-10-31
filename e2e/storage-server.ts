// Local S3 transport double for browser journeys, never a security/Neon compatibility test.
// All objects are synthetic and disappear when Playwright stops this process.
import { createServer } from "node:http";

const objects = new Map<string, { body: Buffer; type: string }>();
createServer(async (req, res) => {
  const url = new URL(req.url!, "http://127.0.0.1:3101");
  if (url.pathname === "/health") { res.end("ok"); return; }
  if (!req.headers.authorization && !url.searchParams.has("X-Amz-Signature")) {
    res.writeHead(403).end(); return;
  }
  const key = decodeURIComponent(url.pathname);
  if (req.method === "PUT") {
    const from = req.headers["x-amz-copy-source"];
    if (typeof from === "string") {
      const source = objects.get(`/${decodeURIComponent(from).replace(/^\//, "")}`);
      if (!source) { res.writeHead(404).end(); return; }
      objects.set(key, source);
      res.setHeader("Content-Type", "application/xml");
      res.end('<CopyObjectResult><ETag>"e2e"</ETag></CopyObjectResult>');
    } else {
      const chunks: Buffer[] = [];
      for await (const chunk of req) chunks.push(Buffer.from(chunk));
      objects.set(key, { body: Buffer.concat(chunks), type: req.headers["content-type"] ?? "application/octet-stream" });
      res.setHeader("ETag", '"e2e"'); res.end();
    }
  } else if (req.method === "DELETE") {
    objects.delete(key); res.writeHead(204).end();
  } else if (req.method === "GET" || req.method === "HEAD") {
    const object = objects.get(key);
    if (!object) { res.writeHead(404).end(); return; }
    res.setHeader("Content-Type", object.type);
    res.end(req.method === "HEAD" ? undefined : object.body);
  } else res.writeHead(405).end();
}).listen(3101, "127.0.0.1");
