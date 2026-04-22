import { NextRequest, NextResponse } from "next/server";

type SearchPayload = {
  query?: string;
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as SearchPayload;
    const query = (body.query || "").trim();

    // Placeholder route so production build passes until search is implemented.
    return NextResponse.json({
      query,
      results: [],
      message: "Search endpoint scaffolded. Connect provider in next step.",
    });
  } catch (error) {
    return NextResponse.json(
      { error: `Invalid request: ${error instanceof Error ? error.message : "unknown error"}` },
      { status: 400 }
    );
  }
}
