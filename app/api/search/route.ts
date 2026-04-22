import { NextRequest, NextResponse } from "next/server";

type SearchPayload = {
  query?: string;
  page?: number;
  perPage?: number;
};

type ApolloPerson = {
  id?: string;
  name?: string;
  first_name?: string;
  last_name?: string;
  title?: string;
  email?: string;
  organization?: { name?: string; website_url?: string };
  linkedin_url?: string;
};

function normalizePerson(person: ApolloPerson) {
  const fullName =
    person.name ||
    [person.first_name, person.last_name].filter(Boolean).join(" ").trim() ||
    "Unknown";

  return {
    id: person.id || fullName,
    name: fullName,
    title: person.title || "",
    company: person.organization?.name || "",
    email: person.email || "",
    website: person.organization?.website_url || "",
    linkedin: person.linkedin_url || "",
  };
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.APOLLO_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing APOLLO_API_KEY in environment variables." },
        { status: 500 }
      );
    }

    const body = (await req.json()) as SearchPayload;
    const query = (body.query || "").trim();
    if (!query) {
      return NextResponse.json({ error: "Query is required." }, { status: 400 });
    }
    const page = Math.max(1, Number(body.page || 1));
    const perPage = Math.min(25, Math.max(1, Number(body.perPage || 10)));

    const payload = {
      q_keywords: query,
      page,
      per_page: perPage,
      person_titles: [],
      q_organization_domains: [],
    };

    const response = await fetch("https://api.apollo.io/api/v1/mixed_people/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": apiKey,
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    if (!response.ok) {
      const details = await response.text();
      return NextResponse.json(
        {
          error: "Apollo API request failed.",
          status: response.status,
          details: details.slice(0, 500),
        },
        { status: response.status }
      );
    }

    const data = (await response.json()) as {
      people?: ApolloPerson[];
      pagination?: { total_entries?: number; total_pages?: number; page?: number };
    };
    const people = Array.isArray(data.people) ? data.people : [];
    const results = people.map(normalizePerson);

    return NextResponse.json({
      query,
      page,
      perPage,
      total: data.pagination?.total_entries ?? results.length,
      totalPages: data.pagination?.total_pages ?? 1,
      results,
    });
  } catch (error) {
    return NextResponse.json(
      { error: `Search failed: ${error instanceof Error ? error.message : "unknown error"}` },
      { status: 500 }
    );
  }
}
