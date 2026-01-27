const http = require('http');
const express = require('express');
const path = require('path');
const cors = require('cors');
const morgan = require('morgan');
const { Server } = require('socket.io');

const { env } = require('./config/env');
const { registerSocket } = require('./socket');
const { bindIo } = require('./services/notifications');

const authRoutes = require('./routes/auth');
const projectRoutes = require('./routes/projects');
const taskRoutes = require('./routes/tasks');
const adminRoutes = require('./routes/admin');
const notificationRoutes = require('./routes/notifications');

const app = express();
app.use(cors({ 
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Allow all localhost origins in development
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      return callback(null, true);
    }
    
    // Allow configured origins
    const allowedOrigins = env.clientOrigin.split(',');
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true 
}));
app.use(express.json({ limit: '2mb' }));
app.use(morgan('dev'));
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

app.get('/', (req, res) => {
  res.json({
    name: 'Task/Todo Collaboration API',
    health: '/health',
    docs: {
      auth: '/api/auth',
      projects: '/api/projects',
      tasks: '/api/tasks',
      notifications: '/api/notifications',
      admin: '/api/admin',
    },
  });
});

app.get('/health', (req, res) => res.json({ ok: true }));

app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);

app.use((err, req, res, next) => {
  // eslint-disable-next-line no-console
  console.error(err);
  res.status(500).json({ message: 'Internal server error' });
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: env.clientOrigin, credentials: true },
});

registerSocket(io);
bindIo(io);

server.listen(env.port, () => {
  // eslint-disable-next-line no-console
  console.log(`API listening on http://localhost:${env.port}`);
});
