Sarvam voice agent integration
=================================

This folder contains the voice agent provider adapters and helpers. The repository supports switching between `openai` (OpenAI realtime) and `sarvam` providers.

Required environment variables
- `VOICE_PROVIDER` — `openai` or `sarvam` (set to `sarvam` for testing)
- `SARVAM_API_KEY` — Sarvam subscription key
- `SARVAM_STT_URL` — (optional) default `wss://api.sarvam.ai/speech-to-text-realtime/ws`
- `SARVAM_TTS_URL` — (optional) default `wss://api.sarvam.ai/text-to-speech/ws`
- `SARVAM_VOICE` — (optional) voice name
- `SARVAM_TTS_CODEC` — (optional) e.g. `linear16` (default)
- `SARVAM_TTS_RATE` — (optional) sample rate (default `24000`)
- `OPENAI_API_KEY` — used by the adapter for LLM generation in MVP

Quick test steps (end-to-end)
1. Set `VOICE_PROVIDER=sarvam` and add `SARVAM_API_KEY` and `OPENAI_API_KEY` to `backend/.env`.
2. Ensure `PUBLIC_BASE_URL` points to your public server (ngrok or production) and your Sarvam number/webhooks are configured to forward calls to this server. Two options:
   - If Sarvam can stream mu-law@8000 frames to a websocket on call connect, configure it to connect to `wss://<your-host>/ws/plivo` (we reuse the Plivo WS path). The server expects JSON frames similar to Plivo: `{ event: 'start' }` and `{ event: 'media', media: { payload: '<base64 mu-law>' } }`. The adapter will forward audio to Sarvam STT and handle TTS.
   - If Sarvam sends HTTP webhooks for call audio, add a small adapter route that converts incoming webhooks into WebSocket-like messages and POST them to `/ws/plivo` clients. (Ask me to scaffold if needed.)
3. Start the backend and verify logs. Look for `[PROVIDER] open`, `[ffmpeg] started pid=` and `[PLIVO] sending transcoded bytes=`.
4. Place a call to your Sarvam number and confirm the server logs show transcripts and playback.

If you want me to fully automate Sarvam webhook wiring (create a `/webhooks/sarvam` route and map Sarvam's HTTP events to the WS adapter), tell me and I'll scaffold it.

MCP (Model Context Protocol) — global setup
-----------------------------------------
This project intentionally does not include MCP registration or server configuration at the repository level. If you want an MCP to be available across multiple projects (recommended), register and configure it at the global/user level in your VS Code/agent host exactly as you did for your Cursor app.

Guidance:
- Remove any `.mcp.json` file from project roots (done here). Do not add MCP entries to this repository.
- Configure MCP servers and credentials in your global VS Code/user environment or MCP host so the editor/agent can access tools and skills across projects.
- If you need a project-local test or a script to validate connectivity, ask and I will provide a non-committal helper that you can run locally — but I will not keep any MCP credentials or config in this repo.

If you want, I can produce the exact global `.mcp.json` snippet and the user-level location you should add it to (based on your VS Code setup). Tell me whether you use VS Code Stable or Insiders and I’ll provide the exact path and JSON to add globally.

