import { NextRequest, NextResponse } from 'next/server';
import Cerebras from '@cerebras/cerebras_cloud_sdk';

const cerebras = new Cerebras({ apiKey: process.env.CEREBRAS_API_KEY });

// Interfețe pentru claritate și eliminarea erorilor ESLint
interface TavilyResult { content: string; url: string; }
interface TavilyResponse { results?: TavilyResult[]; }

// Interfață pentru răspunsul Cerebras (SDK-ul returnează de obicei acest format)
interface CerebrasResponse {
  choices: {
    message: {
      content: string | null;
    };
  }[];
}

interface ResearchPayload {
  painPoints: string[];
  realLanguage: string[];
  competition: string;
  trends: string[];
  ctaOpportunities: string[];
  differentiationAngle: string;
}

function extractJsonObject(raw: string): string {
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start >= 0 && end > start) {
    return raw.slice(start, end + 1);
  }
  return raw;
}

function normalizeResearch(input: unknown): ResearchPayload {
  const data = (input ?? {}) as Partial<ResearchPayload>;
  return {
    painPoints: Array.isArray(data.painPoints) ? data.painPoints : [],
    realLanguage: Array.isArray(data.realLanguage) ? data.realLanguage : [],
    competition: typeof data.competition === 'string' ? data.competition : '',
    trends: Array.isArray(data.trends) ? data.trends : [],
    ctaOpportunities: Array.isArray(data.ctaOpportunities) ? data.ctaOpportunities : [],
    differentiationAngle: typeof data.differentiationAngle === 'string' ? data.differentiationAngle : '',
  };
}

async function search(query: string): Promise<TavilyResponse> {
  const res = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      api_key: process.env.TAVILY_API_KEY, 
      query, 
      search_depth: 'basic', 
      max_results: 3 
    }),
  });
  return res.json();
}

export async function POST(req: NextRequest) {
  try {
    const { niche, avatar, projectName } = await req.json();

    const [a, b, c] = await Promise.all([
      search(`${niche} customer pain points 2025`),
      search(`${niche} best email marketing examples`),
      search(`${niche} customer reviews complaints`),
    ]);

    const data = {
      niche: a.results?.map((r) => r.content).join('\n\n').slice(0, 2000),
      competitors: b.results?.map((r) => r.content).join('\n\n').slice(0, 2000),
      forums: c.results?.map((r) => r.content).join('\n\n').slice(0, 2000),
    };

    const response = await cerebras.chat.completions.create({
      model: 'llama3.1-8b',
      messages: [{
        role: 'user',
        content: `Research expert for email copywriting. Niche: "${niche}", Client: "${projectName}", Avatar: ${avatar}

DATA: ${JSON.stringify(data)}

Return ONLY valid JSON, no markdown:
{
  "painPoints": ["5 specific pain points"],
  "realLanguage": ["5 real phrases the avatar uses"],
  "competition": "what competitors do and what is missing",
  "trends": ["3 current trends"],
  "ctaOpportunities": ["5 CTA angles"],
  "differentiationAngle": "one unique angle"
}`
      }],
      max_tokens: 1024,
    });

    // REPARARE: Folosim "as unknown as CerebrasResponse" în loc de "as any"
    const raw = ((response as unknown as CerebrasResponse).choices[0]?.message?.content || '')
      .replace(/```json|```/g, '')
      .trim();
    const candidate = extractJsonObject(raw);
    const parsed = JSON.parse(candidate);
    const research = normalizeResearch(parsed);
    
    return NextResponse.json({ 
      research, 
      sources: a.results?.map((r) => r.url) 
    });

  } catch (err) {
    console.error('Research error:', err);
    return NextResponse.json({ 
      error: err instanceof Error ? err.message : 'Research failed' 
    }, { status: 500 });
  }
}