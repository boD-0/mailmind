import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { Mistral } from '@mistralai/mistralai';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const STRATEGIST_MODELS = ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant'];

function extractJsonObject(raw: string): string {
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start >= 0 && end > start) {
    return raw.slice(start, end + 1);
  }
  return raw;
}

export async function POST(req: NextRequest) {
  try {
    const { answers } = await req.json();
    const prompt = `Strategic email marketing consultant. Create client profile from:
${JSON.stringify(answers)}

Return ONLY JSON:
{
  "clientSummary": "2-3 sentences",
  "niche": "specific niche",
  "avatar": {"name": "...", "age": "...", "painPoints": ["3"], "goals": ["2"], "objections": ["2"]},
  "toneOfVoice": "description",
  "campaignStrategy": "recommended sequence",
  "quickWins": ["3 immediate actions"]
}`;

    let raw = '';
    let modelUsed = '';
    let lastError: unknown = null;

    for (const model of STRATEGIST_MODELS) {
      try {
        const response = await groq.chat.completions.create({
          model,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 1024,
          temperature: 0.6,
        });
        raw = response.choices[0].message.content?.replace(/\`\`\`json|\`\`\`/g, '').trim() || '{}';
        modelUsed = model;
        break;
      } catch (error) {
        lastError = error;
      }
    }

    if (!raw) {
      const mistralApiKey = process.env.MISTRAL_API_KEY;
      if (!mistralApiKey) throw lastError || new Error('MISTRAL_API_KEY missing');

      const mistral = new Mistral({ apiKey: mistralApiKey });
      const response = await mistral.chat.complete({
        model: 'mistral-small-latest',
        messages: [{ role: 'user', content: prompt }],
        maxTokens: 1024,
        temperature: 0.6,
      });
      const content = response.choices?.[0]?.message?.content;
      raw = (typeof content === 'string'
        ? content
        : Array.isArray(content)
          ? content
              .map((part) => (typeof part === 'string' ? part : (part && typeof part === 'object' && 'text' in part ? String(part.text) : '')))
              .join('')
          : '{}'
      ).replace(/\`\`\`json|\`\`\`/g, '').trim();
      modelUsed = 'mistral-small-latest';
    }

    const candidate = extractJsonObject(raw);
    const parsed = JSON.parse(candidate);
    return NextResponse.json({
      profile: {
        clientSummary: parsed.clientSummary || '',
        niche: parsed.niche || '',
        avatar: parsed.avatar || {},
        toneOfVoice: parsed.toneOfVoice || 'professional but conversational',
        campaignStrategy: parsed.campaignStrategy || '',
        quickWins: Array.isArray(parsed.quickWins) ? parsed.quickWins : [],
      },
      modelUsed,
    });
  } catch (error) {
    const status = typeof error === 'object' && error && 'status' in error ? Number((error as { status?: number }).status) : 500;
    const message =
      typeof error === 'object' && error && 'message' in error
        ? String((error as { message?: string }).message)
        : 'Strategist failed';
    return NextResponse.json(
      { error: message },
      { status: Number.isFinite(status) ? status : 500 }
    );
  }
}