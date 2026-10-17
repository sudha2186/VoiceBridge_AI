/**
 * Chat controller — PLACEHOLDER.
 *
 * Will handle the AI assistant conversation: receive messages, call the
 * LLM with scheme-eligibility context, and return the assistant's reply.
 * Not implemented in this foundation phase.
 *
 * Endpoints:
 *   POST /api/chat/message   — send a message and receive an AI reply
 *   GET  /api/chat/history    — retrieve conversation history (future)
 */

export function sendMessage(_req, res) {
  res.status(501).json({ error: 'AI chat will be implemented in a later phase.' });
}

export function getHistory(_req, res) {
  res.status(501).json({ error: 'Chat history will be implemented in a later phase.' });
}
