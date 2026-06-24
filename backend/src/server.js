const express = require('express');
const { Pool } = require('pg');
const redis = require('redis');

const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.json());

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const redisClient = redis.createClient({ url: process.env.REDIS_URL || 'redis://redis-service:6379' });
redisClient.connect().catch(console.error);

async function initDB() {
  await pool.query(`CREATE TABLE IF NOT EXISTS notes (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT,
    tags TEXT[],
    pinned BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  )`);
  console.log('Database initialized');
}

app.get('/health', (req, res) => res.json({ status: 'healthy', timestamp: new Date().toISOString() }));

app.get('/api/notes', async (req, res) => {
  try {
    const cached = await redisClient.get('notes:all');
    if (cached) return res.json({ notes: JSON.parse(cached), source: 'cache' });
    const { rows } = await pool.query('SELECT * FROM notes ORDER BY pinned DESC, created_at DESC');
    await redisClient.setEx('notes:all', 60, JSON.stringify(rows));
    res.json({ notes: rows, source: 'db' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/notes', async (req, res) => {
  try {
    const { title, content, tags = [], pinned = false } = req.body;
    const { rows } = await pool.query(
      'INSERT INTO notes (title, content, tags, pinned) VALUES ($1, $2, $3, $4) RETURNING *',
      [title, content, tags, pinned]
    );
    await redisClient.del('notes:all');
    res.status(201).json({ note: rows[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/notes/:id', async (req, res) => {
  try {
    const { title, content, tags, pinned } = req.body;
    const { rows } = await pool.query(
      'UPDATE notes SET title=$1, content=$2, tags=$3, pinned=$4, updated_at=NOW() WHERE id=$5 RETURNING *',
      [title, content, tags, pinned, req.params.id]
    );
    await redisClient.del('notes:all');
    res.json({ note: rows[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/notes/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM notes WHERE id=$1', [req.params.id]);
    await redisClient.del('notes:all');
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

initDB().then(() => {
  app.listen(PORT, () => console.log('Server running on port ' + PORT));
}).catch(err => { console.error('Failed to initialize DB:', err); process.exit(1); });