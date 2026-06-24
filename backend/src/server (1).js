const express = require("express");
const { Pool } = require("pg");
const redis = require("redis");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || "devnotes",
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "postgres",
});

const redisClient = redis.createClient({
  socket: {
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT) || 6379,
  }
});

redisClient.connect().catch(err => console.error("Redis connection error:", err));

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS notes (
      id         SERIAL PRIMARY KEY,
      title      VARCHAR(255) NOT NULL,
      content    TEXT,
      tag        VARCHAR(50),
      pinned     BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);

  // Migrate existing tables that don't have the new columns yet
  await pool.query(`
    ALTER TABLE notes ADD COLUMN IF NOT EXISTS tag VARCHAR(50);
    ALTER TABLE notes ADD COLUMN IF NOT EXISTS pinned BOOLEAN DEFAULT FALSE;
  `).catch(() => {});

  console.log("Database initialized");
}

app.get("/health", (req, res) => {
  res.json({ status: "healthy", timestamp: new Date().toISOString() });
});

app.get("/api/notes", async (req, res) => {
  try {
    const cached = await redisClient.get("notes").catch(() => null);
    if (cached) return res.json(JSON.parse(cached));
    const result = await pool.query(
      "SELECT * FROM notes ORDER BY pinned DESC, created_at DESC"
    );
    await redisClient.setEx("notes", 60, JSON.stringify(result.rows)).catch(() => {});
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch notes" });
  }
});

app.post("/api/notes", async (req, res) => {
  const { title, content, tag, pinned } = req.body;
  if (!title) return res.status(400).json({ error: "Title is required" });
  try {
    const result = await pool.query(
      "INSERT INTO notes (title, content, tag, pinned) VALUES ($1, $2, $3, $4) RETURNING *",
      [title, content || "", tag || null, pinned || false]
    );
    await redisClient.del("notes").catch(() => {});
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create note" });
  }
});

app.put("/api/notes/:id", async (req, res) => {
  const { id } = req.params;
  const { title, content, tag, pinned } = req.body;
  try {
    const result = await pool.query(
      "UPDATE notes SET title=$1, content=$2, tag=$3, pinned=$4, updated_at=NOW() WHERE id=$5 RETURNING *",
      [title, content || "", tag || null, pinned || false, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Note not found" });
    await redisClient.del("notes").catch(() => {});
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update note" });
  }
});

app.delete("/api/notes/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query("DELETE FROM notes WHERE id=$1", [id]);
    await redisClient.del("notes").catch(() => {});
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete note" });
  }
});

initDb().then(() => {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}).catch(err => {
  console.error("Failed to initialize database:", err);
  process.exit(1);
});
