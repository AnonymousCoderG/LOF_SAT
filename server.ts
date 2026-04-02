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

  // ✅ Railway PORT: Railway automatically injects this. Default to 8080 if not found.
  const PORT = Number(process.env.PORT) || 8080;
  console.log(`📡 Target Port: ${PORT}`);
  console.log(`🌍 NODE_ENV: ${process.env.NODE_ENV || "development"}`);

  app.use(cors());
  app.use(express.json());

  // -------- TELEMETRY STORAGE --------
  let latestTelemetry: any = {
    temp: 0, hum: 0, aqi: 0,
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

    io.emit("telemetry", latestTelemetry);
    res.status(200).json({ status: "success" });
  });

  // ✅ GET: test in browser
  app.get("/api/telemetry", (req: Request, res: Response) => {
    res.status(200).json({
      message: "Telemetry endpoint is active.",
      latest: latestTelemetry,
    });
  });

  // ✅ Health check for Railway
  app.get("/api/health", (req: Request, res: Response) => {
    res.status(200).send("OK");
  });

  // -------- FRONTEND HANDLING --------

  if (process.env.NODE_ENV === "production") {
    const distPath = path.resolve(process.cwd(), "dist");
    app.use(express.static(distPath));

    // Handle SPA routing
    app.get("*", (req: Request, res: Response, next: NextFunction) => {
      if (req.path.startsWith("/api")) return next();
      res.sendFile(path.join(distPath, "index.html"), (err) => {
        if (err) {
          res.status(200).send("Server is UP (Frontend build missing)");
        }
      });
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  // -------- START SERVER --------
  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Server is LIVE on port ${PORT}`);
  });
}

startServer();
