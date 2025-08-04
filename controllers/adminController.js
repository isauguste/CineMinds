const db = require('../config/db');

// Get all users
exports.getAllUsers = async (req, res) => {
  try {
    const [users] = await db.query(`
      SELECT id, username, email, role, created_at
      FROM users
      ORDER BY created_at DESC
    `);
    res.json(users);
  } catch (err) {
    console.error("Error fetching users:", err);
    res.status(500).json({ error: "Failed to retrieve users" });
  }
}; 

// Promote user to manager
exports.promoteUser = async (req, res) => {
  const { userId, email } = req.body;
  try {
    const identifier = userId ? 'id' : 'email';
    const value = userId || email;

    const [result] = await db.query(
      `UPDATE users SET role = 'manager' WHERE ${identifier} = ?`,
      [value]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ success: true, message: 'User promoted to Manager' });
  } catch (err) {
    console.error('Error promoting user:', err);
    res.status(500).json({ error: 'Failed to promote user' });
  }
}; 

// Fetch recent moderation actions
exports.getLogs = async (req, res) => {
  try {
    const [logs] = await db.query(`
      SELECT rml.id, rml.review_id, u.username AS moderator, rml.action, rml.reason, rml.timestamp
      FROM review_moderation_log rml
      JOIN users u ON rml.moderator_id = u.id
      ORDER BY rml.timestamp DESC
      LIMIT 50
    `);
    res.json(logs);
  } catch (err) {
    console.error("Error fetching logs:", err);
    res.status(500).json({ error: "Failed to retrieve moderation logs" });
  }
};

// Clear cached mood-to-genre mappings
exports.resetCache = async (req, res) => {
  try {
    const [result] = await db.query(`DELETE FROM cached_mood_genre_results`);
    res.json({
      success: true,
      message: `Cache cleared — ${result.affectedRows} rows removed`,
    });
  } catch (err) {
    console.error("Error resetting cache:", err);
    res.status(500).json({ error: "Failed to reset cache" });
  }
};



