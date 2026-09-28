import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT || 8080);
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".webmanifest": "application/manifest+json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
};

function send(res, status, type, body) {
  res.writeHead(status, { "Content-Type": type });
  res.end(body);
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url || "/", "http://localhost");
  let pathname = decodeURIComponent(url.pathname);
  if (pathname.endsWith("/")) pathname += "index.html";
  const file = path.resolve(root, `.${pathname}`);
  if (!file.startsWith(root)) {
    send(res, 403, "text/plain; charset=utf-8", "Forbidden");
    return;
  }
  fs.readFile(file, (err, data) => {
    if (!err) {
      send(res, 200, types[path.extname(file)] || "application/octet-stream", data);
      return;
    }
    fs.readFile(path.join(root, "index.html"), (fallbackErr, html) => {
      if (fallbackErr) {
        send(res, 404, "text/plain; charset=utf-8", "Not found");
        return;
      }
      send(res, 200, types[".html"], html);
    });
  });
});

server.listen(port);
