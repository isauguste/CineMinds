const express = require('express');
const cors = require('express');

const app = express();
app.use(cors());

const moviesRouter = require('./routes/movies');
const moodRoutes = require('./routes/mood');

// Middleware
app.use(express.json());

// Register routes
app.use('/api/movies', moviesRouter);
app.use('/api', moodRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
