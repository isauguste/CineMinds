const amqp = require('amqplib');
const pool = require('../../config/db'); 
require('dotenv').config();

async function startConsumer() {
  try {
    const connection = await amqp.connect('amqp://localhost');
    const channel = await connection.createChannel();

    const queue = 'get_movies_queue';
    await channel.assertQueue(queue, { durable: false });

    console.log(`[CONSUMER] Waiting for messages in ${queue}...`);

    channel.consume(queue, async (msg) => {
      if (!msg) return;

      const request = JSON.parse(msg.content.toString());
      console.log('[CONSUMER] Received:', request);

      if (request.type === 'fetch_movies') {
        try {
          const [rows] = await pool.query('SELECT * FROM movies');
          console.log('[CONSUMER] Sending movie data:', rows);

          channel.sendToQueue(
            msg.properties.replyTo,
            Buffer.from(JSON.stringify({ movies: rows })),
            {
              correlationId: msg.properties.correlationId,
            }
          );
        } catch (err) {
          console.error('[CONSUMER ERROR] DB query failed:', err.message);
          channel.sendToQueue(
            msg.properties.replyTo,
            Buffer.from(JSON.stringify({ error: 'DB error' })),
            {
              correlationId: msg.properties.correlationId,
            }
          );
        }
      } else {
        console.warn('[CONSUMER] Unknown request type:', request.type);
      }

      channel.ack(msg);
    });
  } catch (err) {
    console.error('[CONSUMER ERROR] Could not start consumer:', err.message);
  }
}

startConsumer();

