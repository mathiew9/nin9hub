import express from "express";
import http from "http";
import cors from "cors";
import { Server } from "socket.io";
import { registerSockets } from "./registerSockets";

const app = express();
app.use(cors());

app.get("/", (_req, res) => {
  res.json({ ok: true, service: "server", version: "v1" });
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

registerSockets(io);

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 4000;
server.listen(PORT, () => {
  console.log(`[Nin9hub-online] Server running on http://localhost:${PORT}`);
});
