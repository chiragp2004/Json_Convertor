const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());

// --- Config ---
const PORT = process.env.PORT || 5000;
const DATA_FILE = path.join(__dirname, "data.json");

// --- Utility: Load / Save JSON ---
function loadData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, "utf-8");
      return JSON.parse(raw);
    } else {
      console.warn("[SERVER] No data.json found. Starting with empty store.");
      return {}; // Empty data on first run
    }
  } catch (err) {
    console.error("[ERROR] Failed to load data.json:", err);
    return {};
  }
}

function saveData(data) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf-8");
    console.log("[SERVER] Data saved to data.json");
  } catch (err) {
    console.error("[ERROR] Failed to save data:", err);
  }
}

// --- Initialize Data Store ---
let dataStore = loadData();

// --- Routes ---

// Health Check
app.get("/", (req, res) => {
  res.send("✅ JSON Editor Server is running. Use /api/data to fetch or save data.");
});

// Get Data
app.get("/api/data", (req, res) => {
  console.log("[SERVER] Sending data to client...");
  res.json(dataStore);
});

// Save / Update Data
app.post("/api/data", (req, res) => {
  dataStore = req.body;
  saveData(dataStore);
  res.json({ message: "✅ Data successfully saved to backend." });
});

// Reset to Empty
app.post("/api/reset", (req, res) => {
  dataStore = {};
  saveData(dataStore);
  res.json({ message: "✅ Data store reset to empty." });
});

// --- Start Server ---
app.listen(PORT, () => {
  console.log(`🚀 Server running at: http://localhost:${PORT}`);
});
