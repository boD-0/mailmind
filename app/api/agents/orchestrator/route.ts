import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { Mistral } from '@mistralai/mistralai';

const ORCHESTRATOR_MODELS = [
  'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant',
];

type ChatRole = 'system' | 'user' | 'assistant';
type ChatMessage = { role: ChatRole; content: string };

function toSafeMessages(input: unknown) {
  if (!Array.isArray(input)) return [];
  return input
    .filter((m): m is { role: 'user' | 'assistant'; content: string } =>
      Boolean(m) &&
      typeof m === 'object' &&
      'role' in m &&
      'content' in m &&
      ((m as { role?: unknown }).role === 'user' || (m as { role?: unknown }).role === 'assistant') &&
      typeof (m as { content?: unknown }).content === 'string'
    )
    .slice(-8)
    .map((m): ChatMessage => ({ role: m.role, content: m.content }));
}

async function runMistralFallback(system: string, safeMessages: ChatMessage[]) {
  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey) {
    throw new Error('MISTRAL_API_KEY missing');
  }

  const mistral = new Mistral({ apiKey });
  const response = await mistral.chat.complete({
    model: 'mistral-small-latest',
    messages: [{ role: 'system', content: system } as ChatMessage, ...safeMessages],
    maxTokens: 400,
    temperature: 0.7,
  });

  const content = response.choices?.[0]?.message?.content;
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => (typeof part === 'string' ? part : (part && typeof part === 'object' && 'text' in part ? String(part.text) : '')))
      .join('')
      .trim();
  }
  return '';
}

export async function POST(req: NextRequest) {
  try {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const { messages, projectContext } = await req.json();
    const safeMessages = toSafeMessages(messages);

    const system = `You are the Orchestrator of MailMind, an AI email copywriting platform.
Coordinate agents: Research, Copywriter, Strategist, Fact-checker.
Context: ${JSON.stringify(projectContext || {})}

For new projects, ask exactly 3 kickstart questions:
1. Who is the client and what do they sell?
2. Who is the target audience?
3. What is the campaign goal?

Then suggest agent order and wait for user approval.
Respond in the user's language (English or Romanian). Be concise.`;

    let lastError: unknown = null;
    for (const model of ORCHESTRATOR_MODELS) {
      try {
        const response = await groq.chat.completions.create({
          model,
          messages: [{ role: 'system', content: system }, ...safeMessages],
          max_tokens: 400,
          temperature: 0.7,
        });

        return NextResponse.json({
          content: response.choices[0].message.content,
          modelUsed: model,
        });
      } catch (error) {
        lastError = error;
      }
    }
    try {
      const content = await runMistralFallback(system, safeMessages);
      return NextResponse.json({
        content: content || 'Orchestrator fallback response unavailable.',
        modelUsed: 'mistral-small-latest',
      });
    } catch (mistralError) {
      throw mistralError || lastError;
    }
  } catch (error: unknown) {
    console.error("Orchestrator error:", error);
    const status = typeof error === "object" && error && "status" in error ? Number((error as { status?: number }).status) : 500;
    const message =
      typeof error === "object" && error && "message" in error
        ? String((error as { message?: string }).message)
        : "Orchestrator failed";
    return NextResponse.json({ error: message }, { status: Number.isFinite(status) ? status : 500 });
  }
}