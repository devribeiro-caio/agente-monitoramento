require('dotenv').config();
const path = require('path');
const express = require('express');
const helmet = require('helmet');
const mongoose = require('mongoose');
const rateLimit = require('express-rate-limit');
const Event = require('./models/Event');
const { seed } = require('./categorizer');

const app = express();
app.use(helmet());
app.use(express.json({ limit: '1mb' }));
app.get('/health', (_req, res) => res.json({ ok: true }));
app.use('/api/devices', rateLimit({ windowMs: 60_000, limit: 120 }), require('./routes/devices'));
app.use('/api/events', require('./routes/events'));
app.use('/api/admin', rateLimit({ windowMs: 60_000, limit: 300 }), require('./routes/admin'));
app.use('/api', (_req, res) => res.status(404).json({ error: 'Rota de API não encontrada.' }));
app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'] }));
app.get('*', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.statusCode || 500).json({ error: err.statusCode ? err.message : 'Erro interno do servidor.' });
});
process.on('unhandledRejection', err => console.error('unhandledRejection', err));

async function startServer({ host = process.env.HOST || '127.0.0.1', port = process.env.PORT || 3000 } = {}) {
  await mongoose.connect(process.env.MONGO_URI);
  await Event.init();
  await seed();
  return new Promise((resolve, reject) => {
    const server = app.listen(port, host, () => resolve(server));
    server.once('error', reject);
  });
}

if (require.main === module) {
  startServer()
    .then(server => console.log(`API e painel ouvindo em http://${server.address().address}:${server.address().port}`))
    .catch(err => { console.error('Falha ao iniciar a API e o painel:', err); process.exitCode = 1; });
}

module.exports = { app, startServer };
