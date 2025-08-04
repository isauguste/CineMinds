const express = require('express');
const router = express.Router();
const db = require('../config/db');

router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM genres');
    res.json(rows);
  } catch (err) {
    console.error('[ERROR fetching genres]', err);
    res.status(500).json({ error: 'Failed to fetch genres' });
  }
});

module.exports = router;
