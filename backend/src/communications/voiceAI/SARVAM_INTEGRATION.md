# Sarvam Voice Agent Integration - End-to-End Setup

This document describes the complete Sarvam voice agent integration for the Aasaan app, covering both inbound and outbound calling using Sarvam's official REST API (no MCP, no queue, no cron required).

## Overview

The integration uses Sarvam's Voice Agents platform for:
- Inbound calls: Via Deployment (agent answers on Sarvam number +918064261388)
- Outbound calls: Via Instant Outbound Call API (no campaign required)
- Real-time audio: WebSocket streaming at /ws/sarvam
- AI Agent: Sarvam's LLM + STT + TTS pipeline (Agent v3 - Pure Hindi)

## Architecture

```
Caller (Phone) <--> Sarvam Platform <--> Aasaan Backend
                      |
              Agent: Aasaan Priya (v3)
              +918064261388
```

## Configuration

### Environment Variables (.env)

```bash
# Model APIs (api.sarvam.ai) - STT, TTS, Translation, Chat
SARVAM_API_KEY=sk_jp0fjlno_gryCXvmNE0bxjUkmKqw9RzMJ

# Voice Agents APIs (apps.sarvam.ai) - Voice Agents Platform
SARVAM_VOICE_AGENTS_API_KEY=sk_samvaad_4psj7gwa_SJ0L60zO0w2PMBeMbjPeblUX

# Voice Agent Configuration
SARVAM_FROM_NUMBER=+918064261388
SARVAM_AGENT_ID=Aasaan-Priy-df7121a8-673d
SARVAM_AGENT_VERSION=3
SARVAM_ORG_ID=01a0b4c9-b383-7725-8437-0f2be51c264d
SARVAM_WORKSPACE_ID=01a0b4c9-b388-7c99-b7eb-b672f405486d
SARVAM_CONNECTION_ID=88247919-14-c020a913-0b0c

# Public URLs (ngrok for development)
PUBLIC_BASE_URL=https://your-ngrok-url.ngrok-free.dev
PUBLIC_WS_URL=wss://your-ngrok-url.ngrok-free.dev
```

### Key Separation

| Variable | Purpose | Platform | Endpoint |
|----------|---------|----------|----------|
| SARVAM_API_KEY | Model APIs (STT, TTS, Translation, Chat) | api.sarvam.ai | api-subscription-key header |
| SARVAM_VOICE_AGENTS_API_KEY | Voice Agents Platform (Outbound, Campaigns, Deployments) | apps.sarvam.ai | X-API-Key + Authorization: Bearer headers |

## API Endpoints

### Outbound Call (Production)

POST /api/sarvam/calls

```bash
curl -X POST https://your-ngrok-url.ngrok-free.dev/api/sarvam/calls \
  -H "Content-Type: application/json" \
  -d '{"to": "+918004920005"}'
```

Response:
```json
{
  "success": true,
  "message": "Call initiated successfully via Sarvam official API",
  "attempt_id": "be1b2c20-1587-457f-bb87-17eda870d9c8",
  "agent": {
    "id": "Aasaan-Priy-df7121a8-673d",
    "version": 3
  }
}
```

### Direct Sarvam API (for reference)

POST https://apps.sarvam.ai/api/outbounds/v1/orgs/{org_id}/workspaces/{workspace_id}/outbounds

```bash
curl -X POST https://apps.sarvam.ai/api/outbounds/v1/orgs/01a0b4c9-b383-7725-8437-0f2be51c264d/workspaces/01a0b4c9-b388-7c99-b7eb-b672f405486d/outbounds \
  -H "Content-Type: application/json" \
  -H "X-API-Key: sk_samvaad_4psj7gwa_SJ0L60zO0w2PMBeMbjPeblUX" \
  -H "Authorization: Bearer sk_samvaad_4psj7gwa_SJ0L60zO0w2PMBeMbjPeblUX" \
  -d '{
    "app_config": {
      "app_id": "Aasaan-Priy-df7121a8-673d",
      "app_version": 3,
      "connection_config": {
        "connection_id": "88247919-14-c020a913-0b0c",
        "agent_phone_number": "+918064261388"
      },
      "app_type": "agent"
    },
    "user_config": {
      "user_phone_number": "+918004920005"
    }
  }'
```

Response:
```json
{
  "attempt_id": "30d578e8-b805-4098-a218-9f59a5187b68"
}
```

### Inbound Webhooks

| Endpoint | Method | Purpose |
|----------|--------|---------|
| /webhooks/sarvam/answer | POST | Returns WebSocket URL for inbound call |
| /webhooks/sarvam/hangup | POST | Call end notification |
| /webhooks/sarvam/stream-status | POST | Stream lifecycle notifications |

### WebSocket Streaming

Endpoint: /ws/sarvam

Real-time bidirectional audio streaming (mu-law @ 8kHz).

## Sarvam Platform Resources

| Resource | ID | Status |
|----------|-----|--------|
| Connection | 88247919-14-c020a913-0b0c | Vobiz provider |
| Phone Number | +918064261388 | Sarvam number |
| Agent | Aasaan-Priy-df7121a8-673d | v3 (Pure Hindi) |
| Deployment | Aasaan-Priy-e0013a36-1540 | Active, 24/7 |
| Connection Phone | +918064261388 | Sarvam number |

## Testing Endpoints

### Campaign Status
```bash
curl https://your-ngrok-url.ngrok-free.dev/api/sarvam/campaign
```

### Test Call (requires verified number via MCP)
```bash
curl -X POST https://your-ngrok-url.ngrok-free.dev/api/sarvam/test-call \
  -H "Content-Type: application/json" \
  -d '{"to": "+918004920005"}'
```

## Production Checklist

- Voice Agents enabled on workspace
- SARVAM_VOICE_AGENTS_API_KEY generated from Voice Agents dashboard
- SARVAM_API_KEY for Model APIs (if using STT/TTS/Translation directly)
- ngrok tunnel running for webhook URLs
- Deployment active on +918064261388
- Agent version committed (v3)

## Important Notes

1. No Campaign Required for outbound calls - uses Instant Outbound API
2. No OTP Required for production calls
3. No MCP Required for production - uses official REST API
4. No Queue/Cron/Worker needed - direct API call
5. Agent v3 speaks pure Hindi from start
6. WebSocket at /ws/sarvam handles real-time audio
7. Keys Separated: Model API key (SARVAM_API_KEY) vs Voice Agents key (SARVAM_VOICE_AGENTS_API_KEY)

## Quick Start

1. Add environment variables to .env
2. Start ngrok: ngrok http 3000
3. Update PUBLIC_BASE_URL and PUBLIC_WS_URL with ngrok URLs
4. Start backend: cd backend && npm run dev
5. Test call: curl -X POST http://localhost:3000/api/sarvam/calls -H "Content-Type: application/json" -d '{"to": "+918004920005"}'

## Support

- Sarvam Dashboard: https://dashboard.sarvam.ai
- Voice Agents: https://indus.sarvam.ai/samvaad
- Documentation: https://docs.sarvam.ai
- API Reference: https://docs.sarvam.ai/conversations/api/introduction
