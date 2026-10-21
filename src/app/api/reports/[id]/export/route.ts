import { NextResponse } from "next/server";
import { audit, getAppContext, requirePermission } from "@/lib/context";
import { sectionsToCsv } from "@/lib/reports";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const ctx = await getAppContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    requirePermission(ctx, "view_overview");
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  // RLS plus the explicit org filter keeps exports inside the caller's organization.
  const { data: report } = await ctx.supabase.from("leadership_reports").select("id,title").eq("id", id).eq("org_id", ctx.org.id).maybeSingle();
  if (!report) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { data: sections } = await ctx.supabase.from("report_sections").select("heading,body,provenance").eq("report_id", id).eq("org_id", ctx.org.id).order("position");
  await audit(ctx, "report.exported", "leadership_reports", { id });
  const csv = sectionsToCsv(report.title, (sections ?? []) as any);
  return new NextResponse(csv, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="peoplelogic-report-${id.slice(0, 8)}.csv"`, "Cache-Control": "no-store" },
  });
}
