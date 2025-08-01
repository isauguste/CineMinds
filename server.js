const express = require('express');
const cors = require('cors');

const app = express();

// Explicit CORS configuration to fix CORS error
const corsOptions = {
  origin: 'http://localhost:5500',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type']
};

app.use(cors(corsOptions));
app.use(express.json());

// Import routes
const authRoutes = require('./routes/auth');
const moviesRouter = require('./routes/movies');
const moodRoutes = require('./routes/mood');
const userRoutes = require('./routes/user');

// Register routes
app.use('/api/auth', authRoutes);
app.use('/api/movies', moviesRouter);
app.use('/api', moodRoutes);
app.use('/api/user', userRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

