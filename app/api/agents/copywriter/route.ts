import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { Mistral } from '@mistralai/mistralai';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const COPYWRITER_MODELS = ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant'];

function extractJsonObject(raw: string): string {
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start >= 0 && end > start) return raw.slice(start, end + 1);
  return raw;
}

function normalizeEmail(parsed: Record<string, unknown>) {
  return {
    subject: typeof parsed.subject === 'string' ? parsed.subject : "Email draft generated",
    preheader: typeof parsed.preheader === 'string' ? parsed.preheader : "",
    body: typeof parsed.body === 'string' ? parsed.body : "",
    ctaVariants: Array.isArray(parsed.ctaVariants) ? parsed.ctaVariants.map((c) => String(c)) : [],
    notes: typeof parsed.notes === 'string' ? parsed.notes : "",
  };
}

export async function POST(req: NextRequest) {
  try {
    const { research, template, emailType, length, toneOfVoice, clientName } = await req.json();
    const safeResearch = research ?? {};
    const painPoints = Array.isArray(safeResearch.painPoints) ? safeResearch.painPoints : [];
    const realLanguage = Array.isArray(safeResearch.realLanguage) ? safeResearch.realLanguage : [];
    const differentiationAngle = safeResearch.differentiationAngle || "Clear value proposition and concrete outcomes";
    const wordCount = { short: '100-150', medium: '200-300', long: '400-500' }[length as string] || '200-300';
    const prompt = `Expert email copywriter. Write a ${emailType} email for "${clientName}".
Pain points: ${painPoints.length > 0 ? painPoints.join(', ') : 'No explicit pain points provided'}
Real language: ${realLanguage.length > 0 ? realLanguage.join(', ') : 'No explicit customer phrases provided'}
Angle: ${differentiationAngle}
Template: ${template || 'Hook → Problem → Solution → CTA'}
Tone: ${toneOfVoice || 'professional but conversational'}
Length: ${wordCount} words

Return ONLY JSON:
{"subject": "...", "body": "...", "ctaVariants": ["5 CTAs"], "notes": "strategy note"}`;

    let raw = '';
    let modelUsed = '';
    let lastError: unknown = null;

    for (const model of COPYWRITER_MODELS) {
      try {
        const response = await groq.chat.completions.create({
          model,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 800,
          temperature: 0.8,
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
        maxTokens: 800,
        temperature: 0.8,
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

    const parsed = JSON.parse(extractJsonObject(raw)) as Record<string, unknown>;

    return NextResponse.json({
      email: normalizeEmail(parsed),
      modelUsed,
    });
 } catch (error) {
    const status = typeof error === "object" && error && "status" in error ? Number((error as { status?: number }).status) : 500;
    const message =
      typeof error === "object" && error && "message" in error
        ? String((error as { message?: string }).message)
        : 'Copywriter failed';
    return NextResponse.json({ error: message }, { status: Number.isFinite(status) ? status : 500 });
  }
}