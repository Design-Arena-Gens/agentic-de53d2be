import { NextRequest } from 'next/server';
import { generateAgentReply } from '@/lib/agent';
import { env } from '@/lib/env';
import { appendMessage, getConversation } from '@/lib/memory';
import { escapeXml, formDataToRecord, verifyTwilioSignature } from '@/lib/twilio';

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const params = formDataToRecord(formData);

  if (env.twilioAuthToken) {
    const signature = req.headers.get('x-twilio-signature');
    const webhookUrl =
      env.twilioWebhookUrl ?? `${req.nextUrl.origin}${req.nextUrl.pathname}`;

    const isValid = verifyTwilioSignature({
      authToken: env.twilioAuthToken,
      signature,
      url: webhookUrl,
      params,
    });

    if (!isValid) {
      console.warn('Invalid Twilio signature detected');
      return new Response('Signature validation failed', { status: 403 });
    }
  }

  const body = params.Body ?? '';
  const from = params.From ?? '';
  const waId = params.WaId ?? from;
  const profileName = params.ProfileName ?? undefined;
  const threadId = waId || from || 'unknown';

  if (!body) {
    return new Response('<Response></Response>', {
      headers: { 'Content-Type': 'application/xml' },
    });
  }

  appendMessage(threadId, {
    role: 'user',
    content: body,
    timestamp: Date.now(),
  });

  const history = getConversation(threadId);
  const reply = await generateAgentReply({
    threadId,
    incomingMessage: body,
    profileName,
    history,
  });

  appendMessage(threadId, {
    role: 'assistant',
    content: reply,
    timestamp: Date.now(),
  });

  const twiml = `<Response><Message>${escapeXml(reply)}</Message></Response>`;

  return new Response(twiml, {
    headers: { 'Content-Type': 'application/xml' },
  });
}

export async function GET() {
  return Response.json({
    status: 'ok',
    message: 'WhatsApp webhook is ready to receive POST requests from Twilio.',
  });
}
