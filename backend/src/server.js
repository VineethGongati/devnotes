const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

app.get('/api/notes', (req, res) => {
  res.json({ notes: [] });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
