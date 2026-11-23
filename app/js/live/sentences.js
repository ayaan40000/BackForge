// Sentence splitting shared by the coach player and the voice-pack builder
// (tools/voice_corpus.mjs). A line is played as one clip per sentence.
export function splitSentences(text) {
  return String(text).replace(/\s+/g, ' ').trim().split(/(?<=[.!?])\s+(?=[A-Z0-9"“(])/).map(s => s.trim()).filter(Boolean);
}
