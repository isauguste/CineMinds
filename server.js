require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();

// Explicit CORS configuration to fix CORS error
const corsOptions = {
  origin: 'http://localhost:5500',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.use(express.json());

// Import routes
const authRoutes = require('./routes/auth');
const moviesRouter = require('./routes/movies');
const moodRoutes = require('./routes/mood');
const userRoutes = require('./routes/user');
const genreRoutes = require('./routes/genres');
const managerRoutes = require('./routes/manager');
const moderationRoutes = require('./routes/moderation');
const adminRoutes = require('./routes/admin'); 
const reviewRoutes = require('./routes/reviews');

// Register routes
app.use('/api/auth', authRoutes);
app.use('/api/movies', moviesRouter);
app.use('/api/mood', moodRoutes);
app.use('/api/user', userRoutes);
app.use('/api/genres', genreRoutes);        
app.use('/api/manager', managerRoutes);
app.use('/api/moderation', moderationRoutes); 
app.use('/api/admin', adminRoutes);
app.use('/api/reviews', reviewRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

