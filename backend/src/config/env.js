const path = require("path");
require("dotenv").config({ path: path.join(process.cwd(), ".env") });

function required(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

const env = {
  port: Number(process.env.PORT || 5000),
  clientOrigin: (process.env.CLIENT_ORIGIN || "http://localhost:5173").split(
    ",",
  ),

  db: {
    uri: required("DB_URI"), // ví dụ: mongodb://127.0.0.1:27017
    database: required("DB_NAME"), // ví dụ: todo_db
  },

  jwt: {
    secret: required("JWT_SECRET" || "todo_secret_2026_!@#_phong"),
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  },

  google: {
    clientId: required("GOOGLE_CLIENT_ID" || "240890567413-8nfk6v9g0rlj6gilah9u51jdgav3o6r7.apps.googleusercontent.com"),
  },
};

module.exports = { env };
