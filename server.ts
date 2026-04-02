import express, { Request, Response, NextFunction } from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import path from "path";
import cors from "cors";

async function startServer() {
  console.log("🎬 Starting server initialization...");
  const app = express();
  const httpServer = createServer(app);

  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  // ✅ Railway PORT fix: Convert to Number to avoid TypeScript union errors
  const PORT = Number(process.env.PORT) || 8080;
  console.log("🛠️ All Env Vars:", JSON.stringify(process.env, null, 2));
  console.log(`📡 Environment PORT: ${process.env.PORT || "not set (using 8080)"}`);
  console.log(`🌍 NODE_ENV: ${process.env.NODE_ENV}`);

  app.use(cors());
  app.use(express.json());

  // -------- TELEMETRY STORAGE --------
  let latestTelemetry: any = {
    temp: 0,
    hum: 0,
    aqi: 0,
    gx: 0, gy: 0, gz: 0,
    ax: 0, ay: 0, az: 0,
    rssi: 0,
    timestamp: new Date().toISOString(),
  };

  // -------- API ROUTES --------

  // ✅ POST: ESP32 sends data
  app.post("/api/telemetry", (req: Request, res: Response) => {
    const data = req.body;

    console.log("📡 Received telemetry:", data);

    latestTelemetry = {
      ...latestTelemetry,
      ...data,
      timestamp: new Date().toISOString(),
    };

    // 🔴 Real-time update
    io.emit("telemetry", latestTelemetry);

    res.status(200).json({ status: "success" });
  });

  // ✅ GET: test in browser
  app.get("/api/telemetry", (req: Request, res: Response) => {
    res.status(200).json({
      message: "Telemetry endpoint is active. Use POST to send data.",
      latest: latestTelemetry,
    });
  });

  // ✅ Health check
  app.get("/api/health", (req: Request, res: Response) => {
    res.json({
      status: "ok",
      clients: io.engine.clientsCount,
    });
  });

  // -------- FRONTEND HANDLING --------

  if (process.env.NODE_ENV !== "production") {
    // 🔧 DEV MODE (Vite)
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });

    app.use(vite.middlewares);

  } else {
    // 🚀 PRODUCTION (Railway)
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));

    // ✅ IMPORTANT: prevent API override
    app.get("*", (req: Request, res: Response, next: NextFunction) => {
      if (req.path.startsWith("/api")) {
        return next();
      }
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // -------- START SERVER --------
  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
}

startServer();
