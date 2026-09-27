# Sarvam voice runtime

This backend contains the Sarvam Voice Agents integration. Sarvam is the only supported voice provider.

The realtime WebSocket endpoint is `/ws/sarvam`; HTTP provider webhooks remain at `/webhooks/sarvam/*`, and outbound calls remain at `/api/sarvam/calls`.

Realtime processing is still attached to the backend process for now. A later phase can move the WebSocket runtime to a separate service without changing the HTTP webhook contract.

## Environment

- `SARVAM_API_KEY` — Sarvam subscription key
- `SARVAM_STT_URL` — optional; default `wss://api.sarvam.ai/speech-to-text-realtime/ws`
- `SARVAM_TTS_URL` — optional; default `wss://api.sarvam.ai/text-to-speech/ws`
- `SARVAM_VOICE` — optional voice name
- `SARVAM_TTS_CODEC` — optional; default `linear16`
- `SARVAM_TTS_RATE` — optional; default `24000`
- `PUBLIC_BASE_URL` and `Pfrom pathlib import Path
p = Path('backend/src/commun
#p = Path('backend/src/ce Sarvam keys to `backend/.env`.
2. Set `PUBLIC_BASE_URL` and `PUBLIC_WS_URL` to the public backend host.
3. Start the backend and place a Sarvam test call.
4. Verify `/ws/sarvam` connects, audio is accepted, and the Sarvam answer/hangup webhooks complete.
