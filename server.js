require('dotenv').config();

const path = require('path');
const http = require('http');
const express = require('express');
const cors = require('cors');
const { WebSocketServer } = require('ws');
const { handleCommand } = require('./lib/assistant');

const app = express();
const server = http.createServer(app);
const socketServer = new WebSocketServer({ server, path: '/ws' });
const clients = new Set();

app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

function broadcast(message) {
  const payload = JSON.stringify(message);
  for (const client of clients) {
    if (client.readyState === 1) client.send(payload);
  }
}

socketServer.on('connection', (socket) => {
  clients.add(socket);
  socket.send(JSON.stringify({ type: 'ready', message: 'J.A.R.V.I.S connection established.' }));
  socket.on('close', () => clients.delete(socket));
});

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, aiConfigured: Boolean(process.env.GROQ_API_KEY) });
});

app.post('/api/command', async (req, res) => {
  const command = typeof req.body?.command === 'string' ? req.body.command.trim() : '';
  if (!command) return res.status(400).json({ ok: false, error: 'A command is required.' });

  broadcast({ type: 'activity', state: 'processing', command });
  try {
    const result = await handleCommand(command);
    broadcast({ type: 'activity', state: 'complete', command, result });
    res.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Command failed.';
    broadcast({ type: 'activity', state: 'error', command, error: message });
    res.status(500).json({ ok: false, error: message });
  }
});

app.get('*', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

const port = Number(process.env.PORT || 3000);
server.listen(port, () => console.log(`J.A.R.V.I.S online at http://localhost:${port}`));