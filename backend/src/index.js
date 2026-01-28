const http = require("http");
const express = require("express");
const path = require("path");
const cors = require("cors");
const morgan = require("morgan");
const { Server } = require("socket.io");

// ======================== CONFIG IMPORTS ========================
const { env } = require("./config/env");
const { connectDB } = require("./config/db");
const { registerSocket } = require("./socket");
const { bindIo } = require("./services/notifications");
const routes = require("./routes");

// ======================== EXPRESS APP INITIALIZATION ========================
console.log("🚀 Initializing Task/Todo Collaboration API...");
console.log("=".repeat(50));

const app = express();

// ======================== MIDDLEWARE CONFIGURATION ========================
console.log("🔧 Configuring middleware...");

// CORS Configuration with detailed logging
app.use(
  cors({
    origin: function (origin, callback) {
      const allowedOrigins = env.clientOrigin;

      // Log CORS request
      // console.log(`🌐 CORS Check - Origin: ${origin || "No Origin"}`);

      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin) {
        console.log("✅ Allowed: No origin (mobile/curl request)");
        return callback(null, true);
      }

      // Allow all localhost origins in development
      if (origin.includes("localhost") || origin.includes("127.0.0.1")) {
        // console.log(`✅ Allowed: Localhost origin (${origin})`);
        return callback(null, true);
      }

      // Check against configured allowed origins
      if (allowedOrigins.includes(origin)) {
        console.log(`✅ Allowed: Configured origin (${origin})`);
        return callback(null, true);
      }

      console.log(`❌ Blocked: Origin not allowed (${origin})`);
      console.log(`   Allowed origins: ${allowedOrigins.join(", ")}`);
      callback(new Error(`CORS policy: Origin ${origin} not allowed`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  }),
);

// JSON Body Parser
app.use(
  express.json({
    limit: "2mb",
    verify: (req, res, buf) => {
      try {
        JSON.parse(buf);
      } catch (e) {
        console.log("❌ Invalid JSON payload received");
        throw new Error("Invalid JSON");
      }
    },
  }),
);
console.log("📦 JSON parser configured (2MB limit)");

// HTTP Request Logging
app.use(
  morgan(":method :url :status :response-time ms - :res[content-length]"),
);
console.log("📝 Morgan HTTP logging enabled");

// Static Files Serving
const uploadsPath = path.join(process.cwd(), "uploads");
app.use("/uploads", express.static(uploadsPath));
console.log(`📁 Static files served from: ${uploadsPath}`);

// ======================== ROUTES DEFINITION ========================
console.log("🛣️  Setting up routes...");

// API Root Documentation
app.get("/", (req, res) => {
  console.log("📍 API Documentation accessed");
  res.json({
    api: "Task/Todo Collaboration API",
    version: "1.0.0",
    status: "operational",
    timestamp: new Date().toISOString(),
    endpoints: {
      health: "/health",
      api: "/api",
      uploads: "/uploads",
      websocket: `ws://${req.headers.host}`,
      documentation: {
        auth: "/api/auth",
        projects: "/api/projects",
        tasks: "/api/tasks",
        notifications: "/api/notifications",
        admin: "/api/admin",
      },
    },
  });
});

// Health Check Endpoint
app.get("/health", (req, res) => {
  const healthData = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    database: "checking...",
    environment: env.NODE_ENV || "development",
  };

  console.log("❤️  Health check performed");
  res.json(healthData);
});

// API Routes
app.use("/api", routes);
console.log("✅ API routes mounted at /api");

// ======================== ERROR HANDLING MIDDLEWARE ========================
console.log("⚠️  Configuring error handlers...");

// 404 Handler
app.use((req, res, next) => {
  console.log(`❌ 404 - Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    error: "Route not found",
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString(),
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error("💥 Unhandled Error:", {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip,
    timestamp: new Date().toISOString(),
  });

  const statusCode = err.status || 500;
  const response = {
    error: "Internal Server Error",
    message:
      env.NODE_ENV === "development" ? err.message : "Something went wrong",
    timestamp: new Date().toISOString(),
    path: req.path,
  };

  res.status(statusCode).json(response);
});

// ======================== SERVER & SOCKET.IO SETUP ========================
console.log("🔌 Setting up HTTP server and WebSocket...");

const server = http.createServer(app);

// Socket.IO Configuration
const io = new Server(server, {
  cors: {
    origin: env.clientOrigin,
    credentials: true,
    methods: ["GET", "POST"],
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  transports: ["websocket", "polling"],
});

// Initialize Socket.IO
console.log("⚡ Initializing Socket.IO...");
registerSocket(io);
bindIo(io);
console.log("✅ Socket.IO initialized successfully");

// ======================== DATABASE CONNECTION ========================
console.log("🗄️  Establishing database connection...");

const initializeServer = async () => {
  try {
    // Step 1: Connect to MongoDB
    console.log("⏳ Connecting to MongoDB...");
    await connectDB();
    console.log("✅ MongoDB connected successfully");

    // Step 2: Start HTTP Server
    server.listen(env.port, () => {
      console.log("\n" + "=".repeat(60));
      console.log("🎉 TASK/TODO COLLABORATION API STARTED SUCCESSFULLY");
      console.log("=".repeat(60));
      console.log(`📡 HTTP Server:  http://localhost:${env.port}`);
      console.log(`🔌 WebSocket:    ws://localhost:${env.port}`);
      console.log(`📁 Uploads:      http://localhost:${env.port}/uploads`);
      console.log(`🌍 Environment:  ${env.NODE_ENV || "development"}`);
      console.log(`🗄️  Database:     ${env.db.database}`);
      console.log(`⏰ Started at:   ${new Date().toLocaleString()}`);
      console.log("=".repeat(60));
      console.log("\n📋 Available Endpoints:");
      console.log("  • /              - API Documentation");
      console.log("  • /health        - Health Check");
      console.log("  • /api           - All API endpoints");
      console.log("  • /uploads/*     - Uploaded files");
      console.log("\n🚀 Server ready to accept connections!");
    });

    // Handle server errors
    server.on("error", (error) => {
      console.error("💥 Server error:", error);
      if (error.code === "EADDRINUSE") {
        console.error(`Port ${env.port} is already in use!`);
        process.exit(1);
      }
    });
  } catch (error) {
    console.error("💥 Failed to initialize server:", {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });
    process.exit(1);
  }
};

// ======================== GRACEFUL SHUTDOWN HANDLERS ========================
console.log("🛡️  Setting up graceful shutdown...");

const shutdown = async (signal) => {
  console.log(`\n${signal} received. Starting graceful shutdown...`);

  // Close HTTP server
  server.close(() => {
    console.log("✅ HTTP server closed");
  });

  // Close database connections (if any)
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.close();
    console.log("✅ MongoDB connection closed");
  }

  // Close all Socket.IO connections
  io.close();
  console.log("✅ Socket.IO server closed");

  console.log("👋 Server shutdown complete");
  process.exit(0);
};

// Register shutdown handlers
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("💥 Uncaught Exception:", error);
  shutdown("UNCAUGHT_EXCEPTION");
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("💥 Unhandled Rejection at:", promise, "reason:", reason);
});

// ======================== START SERVER ========================
console.log("\n" + "=".repeat(50));
console.log("🚀 STARTING SERVER INITIALIZATION");
console.log("=".repeat(50));

// Initialize and start the server
initializeServer();

// Export for testing purposes
module.exports = { app, server, io };
