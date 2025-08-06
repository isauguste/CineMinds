const amqp = require('amqplib');
const pool = require('../../config/db');
require('dotenv').config();
const fetch = require('node-fetch');

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
      const { type, movieId } = request;
      console.log('[CONSUMER] Received:', request);

      let responsePayload;

      if (type === 'fetch_movies') {
        try {
          const [rows] = await pool.query('SELECT * FROM movies');
          console.log('[CONSUMER] Sending movie data:', rows);
          responsePayload = { movies: rows };
        } catch (err) {
          console.error('[CONSUMER ERROR] DB query failed:', err.message);
          responsePayload = { error: 'DB error' };
        }

      } else if (type === 'fetch_movie_by_id') {
        try {
          const url = `https://moviesdatabase.p.rapidapi.com/titles/${movieId}`;
          const options = {
            method: 'GET',
            headers: {
              'X-RapidAPI-Key': process.env.RAPIDAPI_KEY,
              'X-RapidAPI-Host': 'moviesdatabase.p.rapidapi.com'
            }
          };

          const apiResponse = await fetch(url, options);
          const result = await apiResponse.json();

          if (!result || !result.results) {
            responsePayload = { error: 'Movie not found in API response' };
          } else {
            responsePayload = { movie: result.results };
          }

        } catch (err) {
          console.error('[CONSUMER ERROR] API fetch failed:', err.message);
          responsePayload = { error: 'API error' };
        }

      } else {
        console.warn('[CONSUMER] Unknown request type:', type);
        responsePayload = { error: 'Unknown request type' };
      }

      channel.sendToQueue(
        msg.properties.replyTo,
        Buffer.from(JSON.stringify(responsePayload)),
        {
          correlationId: msg.properties.correlationId,
        }
      );

      channel.ack(msg);
    });

  } catch (err) {
    console.error('[CONSUMER ERROR] Could not start consumer:', err.message);
  }
}

startConsumer();

