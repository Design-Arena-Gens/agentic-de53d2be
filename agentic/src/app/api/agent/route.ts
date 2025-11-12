import { NextRequest } from 'next/server';
import { generateAgentReply } from '@/lib/agent';
import { appendMessage, getConversation, resetConversation } from '@/lib/memory';

export async function POST(req: NextRequest) {
  const payload = (await req.json().catch(() => null)) as
    | {
        message?: string;
        threadId?: string;
        reset?: boolean;
      }
    | null;

  if (!payload?.threadId) {
    return Response.json(
      { error: 'threadId is required' },
      { status: 400 }
    );
  }

  if (payload.reset) {
    resetConversation(payload.threadId);
    return Response.json({ ok: true, history: [] });
  }

  if (!payload.message || !payload.message.trim()) {
    return Response.json(
      { error: 'message is required' },
      { status: 400 }
    );
  }

  const incoming = payload.message.trim();

  appendMessage(payload.threadId, {
    role: 'user',
    content: incoming,
    timestamp: Date.now(),
  });

  const history = getConversation(payload.threadId);
  const reply = await generateAgentReply({
    threadId: payload.threadId,
    incomingMessage: incoming,
    history,
  });

  appendMessage(payload.threadId, {
    role: 'assistant',
    content: reply,
    timestamp: Date.now(),
  });

  const updatedHistory = getConversation(payload.threadId);

  return Response.json({
    reply,
    history: updatedHistory,
  });
}
