import { NextResponse } from "next/server";
import { DATASET_TYPES, templateCsv, type DatasetType } from "@/lib/csv";

export async function GET(_: Request, { params }: { params: Promise<{ type: string }> }) {
  const { type } = await params;
  if (!(DATASET_TYPES as readonly string[]).includes(type)) return NextResponse.json({ error: "Unknown dataset type" }, { status: 404 });
  return new NextResponse(templateCsv(type as DatasetType), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="peoplelogic-template-${type}.csv"` },
  });
}
