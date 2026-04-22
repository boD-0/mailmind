import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { Mistral } from '@mistralai/mistralai';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const FACTCHECKER_MODELS = ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant'];

function extractJsonObject(raw: string): string {
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start >= 0 && end > start) return raw.slice(start, end + 1);
  return raw;
}

export async function POST(req: NextRequest) {
  try {
    const { email, research, toneOfVoice, emailType } = await req.json();
    const safeEmail = email ?? {};
    const safeResearch = research ?? {};
    const painPoints = Array.isArray(safeResearch.painPoints) ? safeResearch.painPoints : [];

    const prompt = `QA expert for email copywriting. Review critically:
Subject: ${safeEmail.subject || 'No subject provided'}
Body: ${safeEmail.body || 'No email body provided'}
Required tone: ${toneOfVoice || 'professional but conversational'} | Type: ${emailType || 'nurture'}
Pain points: ${painPoints.length > 0 ? painPoints.join(', ') : 'No explicit pain points provided'}

Return ONLY JSON:
{
  "score": 0-100,
  "strengths": ["2 strengths"],
  "weaknesses": ["2 weaknesses"],
  "ctaFeedback": "CTA analysis",
  "toneMatch": true/false,
  "suggestedImprovements": ["3 improvements"],
  "revisedSubject": "better subject line",
  "overallVerdict": "Approve / Needs revision / Major rewrite"
}`;

    let raw = '';
    let modelUsed = '';
    let lastError: unknown = null;

    for (const model of FACTCHECKER_MODELS) {
      try {
        const response = await groq.chat.completions.create({
          model,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 1024,
          temperature: 0.4,
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
        temperature: 0.4,
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

    const parsed = JSON.parse(extractJsonObject(raw));

    return NextResponse.json({
      review: {
        score: typeof parsed.score === 'number' ? parsed.score : 0,
        strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
        weaknesses: Array.isArray(parsed.weaknesses) ? parsed.weaknesses : [],
        ctaFeedback: parsed.ctaFeedback || '',
        toneMatch: typeof parsed.toneMatch === 'boolean' ? parsed.toneMatch : false,
        suggestedImprovements: Array.isArray(parsed.suggestedImprovements) ? parsed.suggestedImprovements : [],
        revisedSubject: parsed.revisedSubject || '',
        overallVerdict: parsed.overallVerdict || 'Needs revision',
      },
      modelUsed,
    });
  } catch (error) {
    const status = typeof error === 'object' && error && 'status' in error ? Number((error as { status?: number }).status) : 500;
    const message =
      typeof error === 'object' && error && 'message' in error
        ? String((error as { message?: string }).message)
        : 'Fact-checker failed';
    return NextResponse.json(
      { error: message },
      { status: Number.isFinite(status) ? status : 500 }
    );
  }
}