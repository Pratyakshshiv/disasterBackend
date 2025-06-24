import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import disastersRoute from './routes/disasters.js';
import geocodeRoute from './routes/geocode.js';
import socialMediaRoute from './routes/socialMedia.js';
import resources from './routes/resources.js'
import officialUpdatesRoute from './routes/officialUpdates.js';
import verifyImageRoutes from './routes/verifyImage.js';
import authRoutes from './routes/auth.js';

// app.use(cors({ origin: '*' }));

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.use(cors({ origin: '*' }));
app.use(express.json());

// Make io available in routes
app.set('io', io);

// Routes
app.use('/disasters', disastersRoute);
app.use('/geocode', geocodeRoute);
app.use('/disasters', socialMediaRoute);
app.use('/resources',resources);
app.use('/disasters', officialUpdatesRoute);
app.use('/disasters', verifyImageRoutes);
app.use('/auth', authRoutes);


// Socket.io connection
io.on('connection', (socket) => {
  console.log('🟢 WebSocket connected:', socket.id);
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
