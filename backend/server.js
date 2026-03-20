const express  = require('express');
const mongoose = require('mongoose');
const cors     = require('cors');
const http     = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, {
  cors: { origin: process.env.CLIENT_URL || 'http://localhost:3000', methods: ['GET','POST'] }
});

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:3000' }));
app.use(express.json());
app.use((req, res, next) => { req.io = io; next(); });

app.use('/api/auth',   require('./routes/auth'));
app.use('/api/squads', require('./routes/squads'));
app.use('/api/streaks',require('./routes/streaks'));
app.use('/api/users',  require('./routes/users'));
app.use('/api/chat',   require('./routes/chat'));

io.on('connection', (socket) => {
  socket.on('join_squad', (squadId) => socket.join(`squad_${squadId}`));
  socket.on('leave_squad',(squadId) => socket.leave(`squad_${squadId}`));

  // Real-time chat — client emits send_message, server broadcasts to room
  socket.on('send_message', async ({ squadId, userId, text, type, badge }) => {
    try {
      const Message = require('./models/Message');
      const User    = require('./models/User');
      const user    = await User.findById(userId).select('username photoUrl badges');
      if (!user) return;
      const msg = await Message.create({
        squad: squadId, user: userId,
        text: text?.trim() || '', type: type || 'text',
        badge: type === 'badge' ? badge : undefined
      });
      const populated = await msg.populate('user','username photoUrl badges');
      io.to(`squad_${squadId}`).emit('new_message', populated);
    } catch(e) { console.error('Chat error:', e.message); }
  });

  socket.on('disconnect', () => {});
});

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/streaksquad')
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB error:', err));

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`StreakSquad server on port ${PORT}`));
