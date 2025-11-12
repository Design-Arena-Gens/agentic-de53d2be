## WhatsApp Concierge Agent

An AI-powered agent that replies to WhatsApp messages using Twilio webhooks and OpenAI (optional). The project ships with:

- `/api/webhook/whatsapp`: production webhook compatible with Twilio’s WhatsApp Sandbox and production numbers
- `/api/agent`: local simulator powering the in-browser chat playground
- Memory helpers for short-term conversation context
- Rule-based fallback responses when OpenAI isn’t configured

The landing page (`/`) walks through setup and includes a live tester so you can iterate quickly before hooking the agent up to Twilio.

---

## 1. Environment Variables

Create a `.env.local` for development and configure the same variables in Vercel.

| Variable | Required | Description |
| --- | --- | --- |
| `TWILIO_ACCOUNT_SID` | ✅ | Your Twilio account SID. |
| `TWILIO_AUTH_TOKEN` | ✅ | Used to validate incoming webhook signatures. |
| `TWILIO_WHATSAPP_NUMBER` | ✅ | The Twilio WhatsApp sender (e.g. `whatsapp:+123456789`). |
| `TWILIO_WEBHOOK_URL` | ✅ (prod) | Public URL Twilio hits, e.g. `https://agentic-de53d2be.vercel.app/api/webhook/whatsapp`. Required for signature verification in production. |
| `OPENAI_API_KEY` | optional | Enables LLM-generated replies. Without it the agent falls back to deterministic responses. |
| `OPENAI_CHAT_MODEL` | optional | Defaults to `gpt-4o-mini`. Override if you prefer a different chat-completions model. |

During development you can temporarily omit `TWILIO_*` variables—signature validation only runs when `TWILIO_AUTH_TOKEN` is set.

---

## 2. Local Development

```bash
npm install
npm run dev
```

Open http://localhost:3000 to use the playground. The simulator calls `POST /api/agent`, which shares logic with the production webhook, so your tests match live behaviour.

---

## 3. Twilio Webhook Configuration

1. Visit **Twilio Console → Messaging → Senders → WhatsApp** (or the Sandbox page).
2. Set the **Webhook URL for incoming messages** to your deployment URL plus `/api/webhook/whatsapp`. Example:  
   `https://agentic-de53d2be.vercel.app/api/webhook/whatsapp`
3. Ensure the webhook method is **POST**.
4. Save the configuration and send a WhatsApp message to your Twilio number to test end-to-end.

The webhook:

- Converts Twilio form data into a conversation thread using the sender’s `WaId`.
- Validates the request signature when `TWILIO_AUTH_TOKEN` is configured.
- Generates a reply (OpenAI if available, otherwise rule-based).
- Responds with TwiML `<Message>` so Twilio can deliver the answer immediately.

---

## 4. Customising Responses

Edit `src/lib/agent.ts` to tweak:

- The system prompt describing your agent’s tone and policies.
- Fallback heuristics inside `ruleBasedResponse`.
- Model selection and OpenAI request parameters.

If you need persistent memory, plug in a database inside `src/lib/memory.ts`.

---

## 5. Useful Commands

```bash
npm run dev     # start local development on http://localhost:3000
npm run lint    # static analysis
npm run build   # production build
npm start       # start production server (after build)
```

---

## 6. Deployment

This project is optimised for Vercel. After pushing to your repository or using `vercel deploy`, verify the production URL responds:

```bash
curl https://agentic-de53d2be.vercel.app/api/webhook/whatsapp
```

You should see a JSON status indicating the webhook is reachable.
