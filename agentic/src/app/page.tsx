'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
import styles from './page.module.css';

type Role = 'user' | 'assistant';

interface ChatMessage {
  role: Role;
  content: string;
  timestamp: number;
}

const envRequirements = [
  {
    key: 'TWILIO_ACCOUNT_SID',
    description: 'Twilio Account SID used for outbound replies.',
  },
  {
    key: 'TWILIO_AUTH_TOKEN',
    description: 'Used to verify webhook signatures from Twilio.',
  },
  {
    key: 'TWILIO_WHATSAPP_NUMBER',
    description:
      'The WhatsApp-enabled Twilio number (e.g. whatsapp:+123456789).',
  },
  {
    key: 'TWILIO_WEBHOOK_URL',
    description:
      'Public URL of this webhook (https://your-app.vercel.app/api/webhook/whatsapp).',
  },
  {
    key: 'OPENAI_API_KEY',
    description:
      'Optional. Enables LLM-powered responses instead of the rule-based fallback.',
  },
];

const welcomeMessage: ChatMessage = {
  role: 'assistant',
  content:
    'Hi! I’m your WhatsApp concierge. Test your flows here and hook me up to Twilio when you’re ready.',
  timestamp: Date.now(),
};

export default function Home() {
  const [threadId, setThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([welcomeMessage]);
  const [inputValue, setInputValue] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const existing =
      window.localStorage.getItem('agent-thread-id') ?? createThreadId();
    window.localStorage.setItem('agent-thread-id', existing);
    setThreadId(existing);
  }, []);

  useEffect(() => {
    if (!messagesEndRef.current) {
      return;
    }

    messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = useCallback(async () => {
    if (!threadId || !inputValue.trim()) {
      return;
    }

    setIsSending(true);
    setError(null);

    try {
      const response = await fetch('/api/agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          threadId,
          message: inputValue,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error ?? 'Failed to reach the agent.');
      }

      const { history } = (await response.json()) as {
        history: ChatMessage[];
      };

      setMessages(history);
      setInputValue('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setIsSending(false);
    }
  }, [inputValue, threadId]);

  const handleReset = useCallback(async () => {
    if (!threadId) {
      return;
    }

    setIsSending(true);
    setError(null);
    try {
      await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          threadId,
          reset: true,
        }),
      });
      setMessages([welcomeMessage]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to reset chat.');
    } finally {
      setIsSending(false);
    }
  }, [threadId]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  const statusLabel = useMemo(() => {
    if (isSending) {
      return 'Sending...';
    }
    if (error) {
      return error;
    }
    return 'Type a message to see how the agent responds.';
  }, [isSending, error]);

  return (
    <div className={styles.page}>
      <div className={styles.layout}>
        <section className={styles.panel}>
          <header className={styles.header}>
            <span className={styles.eyebrow}>WhatsApp AI Concierge</span>
            <h1 className={styles.title}>
              Deploy an AI agent that answers WhatsApp messages instantly.
            </h1>
            <p className={styles.subtitle}>
              Connect this webhook to your Twilio WhatsApp sender. Customize the
              prompt, plug in your APIs, and ship automated customer support
              that feels human within minutes.
            </p>
          </header>

          <div className={styles.infoGrid}>
            <div className={styles.infoCard}>
              <h3>How to wire it up</h3>
              <div className={styles.steps}>
                <div className={styles.step}>
                  <h4>1. Configure environment variables</h4>
                  <p>
                    Add the Twilio and OpenAI environment variables below to
                    your Vercel project and local <code>.env.local</code> file.
                  </p>
                </div>
                <div className={styles.step}>
                  <h4>2. Point your WhatsApp sandbox / number</h4>
                  <p>
                    In the Twilio console, set the incoming message webhook to{' '}
                    <code>/api/webhook/whatsapp</code> using your deployed URL.
                  </p>
                </div>
                <div className={styles.step}>
                  <h4>3. Test live conversations</h4>
                  <p>
                    Send a WhatsApp message to your Twilio number. Twilio
                    forwards it here, the agent crafts a reply, and Twilio
                    delivers it back.
                  </p>
                </div>
              </div>
            </div>

            <div className={styles.infoCard}>
              <h3>Key environment variables</h3>
              <div className={styles.envList}>
                {envRequirements.map((envVar) => (
                  <div key={envVar.key} className={styles.envItem}>
                    <span className={styles.badge}>{envVar.key}</span>
                    <span>{envVar.description}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className={`${styles.panel} ${styles.chatPanel}`}>
          <div className={styles.chatWindow}>
            <div className={styles.messages}>
              {messages.map((message) => (
                <div
                  key={`${message.timestamp}-${message.role}-${message.content.slice(
                    0,
                    12,
                  )}`}
                  className={`${styles.bubble} ${
                    message.role === 'user'
                      ? styles.userBubble
                      : styles.assistantBubble
                  }`}
                >
                  {message.content}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            <div className={styles.composer}>
              <textarea
                className={styles.input}
                placeholder="Type a WhatsApp message…"
                value={inputValue}
                onChange={(event) => setInputValue(event.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isSending}
              />
              <button
                type="button"
                className={styles.sendButton}
                onClick={handleSend}
                disabled={isSending || !inputValue.trim() || !threadId}
              >
                Send
              </button>
            </div>
          </div>
          <div className={styles.statusBar}>
            <span className={error ? styles.statusError : undefined}>
              {statusLabel}
            </span>
            <button
              type="button"
              className={styles.resetButton}
              onClick={handleReset}
              disabled={isSending}
            >
              Reset conversation
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

function createThreadId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `thread_${Math.random().toString(36).slice(2, 10)}`;
}
