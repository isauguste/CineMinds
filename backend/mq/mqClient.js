const amqp = require('amqplib');

let channel, connection;

async function connectMQ() {
  connection = await amqp.connect('amqp://localhost'); // change if different VM
  channel = await connection.createChannel();
}

async function sendRPC(queue, messageObj) {
  if (!channel) await connectMQ();

  const correlationId = generateUuid();
  const replyQueue = await channel.assertQueue('', { exclusive: true });

  console.log('[MQ] Sending RPC to:', queue);
  console.log('[MQ] Payload:', messageObj);

  return new Promise((resolve) => {
    channel.consume(replyQueue.queue, (msg) => {
      console.log('[MQ] Reply received:', msg.content.toString());
      if (msg.properties.correlationId === correlationId) {
        resolve(JSON.parse(msg.content.toString()));
      }
    }, { noAck: true });

    channel.sendToQueue(queue, Buffer.from(JSON.stringify(messageObj)), {
      correlationId,
      replyTo: replyQueue.queue,
    });

    console.log('[MQ] Sent RPC message.');
  });
}

function generateUuid() {
  return Math.random().toString() + Math.random().toString() + Math.random().toString();
}

module.exports = { sendRPC };

