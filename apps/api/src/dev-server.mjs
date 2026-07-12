import { createServer } from "node:http";

const port = Number.parseInt(process.env.PORT ?? "8787", 10);

const server = createServer((_request, response) => {
  response.writeHead(200, { "content-type": "application/json" });
  response.end(JSON.stringify({ status: "ok", service: "deutschtrainer-api" }));
});

server.listen(port, () => {
  console.log(`API dev server listening on http://localhost:${port}`);
});
