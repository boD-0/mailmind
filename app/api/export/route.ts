import { NextRequest, NextResponse } from "next/server";
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from "docx";

type ExportPayload = {
  projectName?: string;
  niche?: string;
  email?: {
    subject?: string;
    preheader?: string;
    body?: string;
    ctaVariants?: string[];
    notes?: string;
  };
  strategy?: {
    toneOfVoice?: string;
    campaignStrategy?: string;
    quickWins?: string[];
  } | null;
};

function line(text: string) {
  return new Paragraph({
    spacing: { after: 140 },
    children: [new TextRun(text)],
  });
}

export async function POST(req: NextRequest) {
  try {
    const payload = (await req.json()) as ExportPayload;
    const projectName = payload.projectName || "MailMind Project";
    const niche = payload.niche || "-";
    const email = payload.email || {};
    const strategy = payload.strategy || null;
    const generatedAt = new Date().toLocaleString("ro-RO");

    const doc = new Document({
      sections: [
        {
          properties: {},
          children: [
            new Paragraph({
              heading: HeadingLevel.HEADING_1,
              spacing: { after: 240 },
              children: [new TextRun({ text: "MAILMIND - Export Campanie", bold: true })],
            }),
            line(`Proiect: ${projectName}`),
            line(`Nisa: ${niche}`),
            line(`Generat la: ${generatedAt}`),
            new Paragraph({ text: "" }),

            new Paragraph({
              heading: HeadingLevel.HEADING_2,
              children: [new TextRun({ text: "Email Draft", bold: true })],
            }),
            line(`Subiect: ${email.subject || "-"}`),
            line(`Preheader: ${email.preheader || "-"}`),
            line("Body:"),
            ...String(email.body || "-")
              .split("\n")
              .map((l) => line(l || " ")),
            new Paragraph({ text: "" }),

            new Paragraph({
              heading: HeadingLevel.HEADING_2,
              children: [new TextRun({ text: "CTA Variants", bold: true })],
            }),
            ...(email.ctaVariants && email.ctaVariants.length > 0
              ? email.ctaVariants.map((cta) => line(`- ${cta}`))
              : [line("-")]),
            new Paragraph({ text: "" }),

            new Paragraph({
              heading: HeadingLevel.HEADING_2,
              children: [new TextRun({ text: "Strategic Notes", bold: true })],
            }),
            line(`Tone of voice: ${strategy?.toneOfVoice || "-"}`),
            line(`Campaign strategy: ${strategy?.campaignStrategy || "-"}`),
            ...(strategy?.quickWins && strategy.quickWins.length > 0
              ? strategy.quickWins.map((item) => line(`- ${item}`))
              : [line("-")]),
            line(`Copywriter notes: ${email.notes || "-"}`),
          ],
        },
      ],
    });

    const buffer = await Packer.toBuffer(doc);
    const filename = `${projectName.replace(/[^\w\-]+/g, "_")}_export.docx`;

    return new NextResponse(buffer as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: `Export failed: ${error instanceof Error ? error.message : "unknown error"}` },
      { status: 500 }
    );
  }
}

