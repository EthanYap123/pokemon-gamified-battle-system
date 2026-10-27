//////////////////////////////////////////////////////
// INCLUDES
//////////////////////////////////////////////////////
const express = require('express');
const path = require('path');

//////////////////////////////////////////////////////
// CREATE APP
//////////////////////////////////////////////////////
const app = express();

//////////////////////////////////////////////////////
// USES
//////////////////////////////////////////////////////
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Vercel sits in front of the app, so trust its forwarded headers
app.set("trust proxy", true);

// Limit requests that change data (reads are not counted)
const rateLimit = require('./middleware/rateLimit');
app.use("/api/", (req, res, next) => (req.method === "GET" ? next() : rateLimit.writes(req, res, next)));

//////////////////////////////////////////////////////
// SETUP ROUTES
//////////////////////////////////////////////////////
const mainRoutes = require('./routes/mainRoutes');

// Mount routes
app.use("/api/", mainRoutes);

//////////////////////////////////////////////////////
// SETUP STATIC FILES
//////////////////////////////////////////////////////
app.use("/", express.static(path.join(__dirname, '..', 'public')));

// Send the bare site root to the home page
app.get("/", (req, res) => {
  res.redirect("/html/index.html");
});

//////////////////////////////////////////////////////
// ERROR HANDLING
//////////////////////////////////////////////////////
// 404 handler for unknown routes
app.use((req, res, next) => {
  res.status(404).json({ message: "Route not found" });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ message: err.message || "Internal server error" });
});

//////////////////////////////////////////////////////
// EXPORT APP
//////////////////////////////////////////////////////
module.exports = app;