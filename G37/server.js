// server.js — tiny static file server for Kingdom Defense.
// Run with:  node server.js   then open http://localhost:8099
const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 8099;
const TYPES = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".md": "text/plain",
  ".json": "application/json",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};

http
  .createServer((req, res) => {
    let file = "." + decodeURIComponent(req.url.split("?")[0]);
    if (file === "./") file = "./index.html";
    // prevent path traversal
    const full = path.normalize(path.join(__dirname, file));
    if (!full.startsWith(__dirname)) {
      res.writeHead(403);
      return res.end("Forbidden");
    }
    fs.readFile(full, (err, data) => {
      if (err) {
        res.writeHead(404);
        return res.end("Not found");
      }
      res.writeHead(200, {
        "Content-Type": TYPES[path.extname(full)] || "application/octet-stream",
        "Cache-Control": "no-store",
      });
      res.end(data);
    });
  })
  .listen(PORT, () => {
    console.log(`Kingdom Defense running at http://localhost:${PORT}`);
    console.log("Press Ctrl+C to stop.");
  });
