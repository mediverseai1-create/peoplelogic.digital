import Link from "next/link";
import { AskClient, type Msg } from "@/components/AskClient";
import { EmptyState, PageHeader } from "@/components/ui";
import { requireContext } from "@/lib/context";
import { can } from "@/lib/roles";

export const metadata = { title: "Ask PeopleLogic" };

export default async function Ask({ searchParams }: { searchParams: Promise<{ c?: string }> }) {
  const ctx = await requireContext();
  const sp = await searchParams;
  if (!can(ctx.role, "use_assistant")) return (<><PageHeader title="Ask PeopleLogic" /><EmptyState title="Not available for your role" body="Ask an administrator to change your role if you need the assistant." /></>);

  const { data: convs } = await ctx.supabase.from("ai_conversations").select("id,title,created_at").eq("org_id", ctx.org.id).eq("user_id", ctx.user.id).order("created_at", { ascending: false }).limit(15);
  const active = (convs ?? []).find((c: any) => c.id === sp.c)?.id ?? null;
  let messages: Msg[] = [];
  if (active) {
    const { data } = await ctx.supabase.from("ai_messages").select("id,role,content,structured").eq("conversation_id", active).eq("org_id", ctx.org.id).order("created_at");
    messages = (data ?? []) as Msg[];
  }
  const aiReady = !!process.env.GEMINI_API_KEY;

  return (
    <>
      <PageHeader title="Ask PeopleLogic" subtitle="A Gemini-powered assistant limited to your organization's aggregated, privacy-scoped analysis results. It has no database or SQL access." actions={<Link href="/app/ask" className="btn-secondary">New conversation</Link>} />
      {!aiReady && <p className="mb-4 rounded-md border border-signal-watch/40 bg-signal-watch/10 p-3 text-sm text-signal-watch">The AI service is not configured on this deployment (GEMINI_API_KEY is missing). Questions will return a setup error until it is added.</p>}
      <div className="grid gap-6 lg:grid-cols-4">
        <div className="lg:col-span-3"><AskClient key={active ?? "new"} conversationId={active} messages={messages} /></div>
        <aside className="no-print">
          <h2 className="label">Your recent conversations</h2>
          <ul className="space-y-1 text-sm">{(convs ?? []).map((c: any) => <li key={c.id}><Link href={`/app/ask?c=${c.id}`} className={`block truncate rounded px-2 py-1 hover:bg-ivory-100 ${c.id === active ? "bg-ivory-100 font-medium" : ""}`}>{c.title ?? "Conversation"}</Link></li>)}</ul>
          {(convs ?? []).length === 0 && <p className="text-xs text-charcoal-400">None yet.</p>}
        </aside>
      </div>
    </>
  );
}
