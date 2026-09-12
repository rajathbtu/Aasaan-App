# WhatsApp Module (Meta Cloud API)

Initiates WhatsApp conversations on a requested phone number when a trigger is
generated, using the **Meta WhatsApp Cloud API directly** (plain HTTPS calls to
the Graph API — no SDK).

## Files

| File | Purpose |
| --- | --- |
| `config.ts` | Reads credentials from `backend/.env`, with actionable error messages |
| `client.ts` | Thin HTTP client for `POST /graph.facebook.com/{version}/{phoneNumberId}/messages` |
| `service.ts` | `initiateConversation()` (template message) and `sendTextMessage()` (24-h window) |
| `routes.ts` | Express routes: `POST /trigger`, `GET/POST /webhook`, `GET /status` |
| `sendTestMessage.ts` | CLI test script (`npm run whatsapp:send-test`) | npm run whatsapp:send-test -- +919873938108 2>&1

## Required API keys & how to generate them

Add these to `backend/.env` (already added as placeholders):

WHATSAPP_ACCESS_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_API_VERSION=v23.0
WHATSAPP_VERIFY_TOKEN=
WHATSAPP_APP_SECRET=
WHATSAPP_DEFAULT_TEMPLATE=hello_world
WHATSAPP_DEFAULT_TEMPLATE_LANG=en_US

### 1. `WHATSAPP_ACCESS_TOKEN` (mandatory)

**Development / test (fast, expires in 24h):**
1. Go to https://developers.facebook.com/apps and click **Create App** (or open an existing one).
2. Choose the **"Connect with customers through WhatsApp"** use case and create/link a business portfolio.
3. In the left menu open **WhatsApp → API Setup**.
4. Click **Generate access token** — copy the token into `WHATSAPP_ACCESS_TOKEN`.

**Production (permanent token, does not expire):**
1. Open https://business.facebook.com/settings → **Users → System users** → **Add** (create an Admin system user).
2. Select the user → **Add Assets** → grant it your **App** and **WhatsApp Account** (with full control).
3. Click **Generate Token** for that system user and select the permissions:
   - `whatsapp_business_messaging`
   - `whatsapp_business_management`
   - `business_management`
4. Copy the token into `WHATSAPP_ACCESS_TOKEN` and store it securely (never commit it).

### 2. `WHATSAPP_PHONE_NUMBER_ID` (mandatory)

On the same **WhatsApp → API Setup** page, the "From" phone number section shows
**Phone number ID** (a numeric ID, not the phone number itself). Copy it into
`WHATSAPP_PHONE_NUMBER_ID`.

> For production, register a real business phone number under
> **WhatsApp Manager → Phone numbers** and use its Phone number ID. The test
> number Meta gives you (`+1 628 555 8899`-style) can only message up to 5
> **test recipients** you add on the API Setup page.

### 3. `WHATSAPP_VERIFY_TOKEN` (needed for webhooks)

Any random string you invent (e.g. `aasaan-whatsapp-webhook-secret`). You must
enter the same value when configuring the webhook URL in the App Dashboard
(**WhatsApp → Configuration → Edit** for the `messages` field).

### 4. `WHATSAPP_APP_SECRET` (optional but recommended)

App Dashboard → **App Settings → Basic → App secret → Show**. Used to
cryptographically verify that incoming webhook payloads really come from Meta
(`X-Hub-Signature-256`). Leave empty to skip verification (dev only).

### 5. Template message (needed to *initiate* conversations)

WhatsApp only lets a business **start** a conversation using a pre-approved
**template message**:

- **Test number:** the `hello_world` template (`en_US`) is pre-approved and is
  the default (`WHATSAPP_DEFAULT_TEMPLATE=hello_world`).
- **Production:** create your own in **WhatsApp Manager → Message templates**
  (UTILITY / MARKETING / AUTHENTICATION category), submit it for approval, and
  then set `WHATSAPP_DEFAULT_TEMPLATE` to its name. Templates can contain
  `{{1}}`, `{{2}}`, ... placeholders which you fill via `bodyParams`.

## Usage

### Trigger from code (any controller/service)

```ts
import { initiateConversation } from '../../whatsapp/service';

// e.g. when a work request trigger fires:
await initiateConversation({
  to: user.phone,               // any format, normalized internally
  templateName: 'hello_world',  // optional, defaults to env value
  bodyParams: ['Ravi'],         // optional, fills {{1}}, {{2}}...
});
```

### Trigger via HTTP

```bash
curl -X POST http://localhost:3000/whatsapp/trigger \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <user-id-token>' \
  -d '{ "phone": "+919876543210", "bodyParams": ["Ravi"] }'
```

Response: `{ "success": true, "to": "919876543210", "messageId": "wamid..." }`

### Test without the server

```bash
cd backend
npm run whatsapp:send-test -- +919876543210
```

### Webhook

Point Meta to `https://<your-backend>/whatsapp/webhook` (use
`npm run dev:tunnel` for a public ngrok URL during development) with the verify
token from `WHATSAPP_VERIFY_TOKEN`, subscribing to the `messages` field.

## Important WhatsApp rules

- **Initiating = template only.** Outside a 24-hour customer-service window
  only approved templates can be sent; `sendTextMessage()` works only inside it.
- **Phone format:** international format without `+` (e.g. `919876543210`);
  the service normalizes common formats for you.
- **Test number limit:** with Meta's test number, only the 5 numbers you
  registered as recipients on the API Setup page can receive messages.
- **Opt-in:** users must have opted in to receive messages from your business.
