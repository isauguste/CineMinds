const express = require('express');
const app = express();
const moviesRouter = require('./routes/movies');

app.use(express.json());
app.use('/api/movies', moviesRouter);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

