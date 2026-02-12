const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const session = require("express-session");

dotenv.config();

const doctorsRoutes = require("./routes/doctors");
const dutiesRoutes = require("./routes/duties");
const scheduleRoutes = require("./routes/schedule");
const leavesRoutes = require("./routes/leaves");
const authRoutes = require("./routes/authRoutes");
const emailRoutes = require("./routes/emailRoutes");

const app = express();
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";
console.log("CORS allowed origin:", FRONTEND_URL);  // 👈 Add it here
app.use(cors({ origin: FRONTEND_URL, credentials: true }));
app.use(express.json());
if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}
app.use(
  session({
    secret: process.env.SESSION_SECRET || "dev_secret_change_me",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      secure: process.env.NODE_ENV === "production"
    }
  })
);

// API routes
app.use("/api/doctors", doctorsRoutes);
app.use("/api/duties", dutiesRoutes);
app.use("/api/schedule", scheduleRoutes);
app.use("/api/leaves", leavesRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/email", emailRoutes);

app.get("/", (req, res) => {
  res.send("Doctor Scheduling API is running");
});

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.warn("MONGO_URI missing from environment. Server will fail to connect.");
}

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("MongoDB connected");
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error("Mongo connection error:", err.message);
  });
