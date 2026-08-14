import { useState } from "react";
import { MessageSquareText, Send, Loader2, GitCompareArrows } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { aiApi } from "@/lib/api/ai";
import { apiErrorMessage } from "@/lib/api/client";
import { toast } from "sonner";
import type { MentorAnswerDTO } from "@/lib/api/types";

interface Message {
  role: "user" | "assistant";
  content: string;
  followUp?: string;
  sources?: { title?: string; section?: string }[];
  grounded?: boolean;
}

/**
 * Right-Way-of-Thinking Mentor. Every message is proxied through the backend,
 * which retrieves the most relevant Case File sections (RAG) before the AI
 * answers. The answer is meant to guide reasoning, not just give an answer.
 */
export function ProjectMentorChat({
  projectTitle,
  projectId,
}: {
  projectTitle: string;
  projectId?: string;
}) {
  const suggestions = [
    "Is this idea realistic for a 24-hour hackathon?",
    "Which feature should we remove?",
    "How would a judge challenge this project?",
    "Is this case file ready to publish?",
  ];

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  const send = async (question: string, addToHistory = true) => {
    const q = question.trim();
    if (!q || sending) return;
    if (addToHistory) setInput("");

    if (addToHistory) {
      setMessages((prev) => [...prev, { role: "user", content: q }]);
    }
    setSending(true);
    try {
      const res = await aiApi.mentor({ question: q, projectId });
      const m: MentorAnswerDTO = res.data.mentor;
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: m.response,
          followUp: m.follow_up_question,
          grounded: m.grounded,
          sources: m.sources,
        },
      ]);
    } catch (err) {
      if (addToHistory) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: apiErrorMessage(err, "The mentor is unavailable right now."),
          },
        ]);
      }
      toast.error(apiErrorMessage(err, "Mentor request failed"));
    } finally {
      setSending(false);
    }
  };

  const hasGroundedEvidence = messages.some((m) => m.grounded && m.sources && m.sources.length > 0);

  return (
    <section className="rounded-2xl border border-border/60 bg-card p-5 shadow-card">
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <MessageSquareText className="h-4 w-4 text-primary" /> Project mentor
        </h3>
        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
          <GitCompareArrows className="h-3 w-3" /> RAG-grounded
        </span>
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        Ask questions about “{projectTitle}”. The mentor reasons through the case file instead of
        just answering — it explains why, how, and the trade-offs.
      </p>

      <div className="mt-4 max-h-80 space-y-3 overflow-y-auto pr-1">
        {messages.length === 0 && !sending && (
          <div className="space-y-1.5">
            {suggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => send(s)}
                className="block w-full rounded-lg border border-dashed border-border/60 px-3 py-2 text-left text-[11px] text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className="space-y-2">
            {m.role === "user" ? (
              <div className="rounded-xl rounded-br-sm bg-primary/10 px-3 py-2 text-xs">
                {m.content}
              </div>
            ) : (
              <div className="rounded-xl rounded-bl-sm border border-border/60 bg-background/60 px-3 py-2.5">
                <p className="whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground">
                  {m.content}
                </p>
                {m.grounded && m.sources && m.sources.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {m.sources.slice(0, 4).map((s, j) => (
                      <span
                        key={j}
                        className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
                      >
                        {s.title} · {s.section}
                      </span>
                    ))}
                  </div>
                )}
                {m.followUp && (
                  <button
                    type="button"
                    onClick={() => send(m.followUp!)}
                    className="mt-2 block rounded-lg border border-dashed border-primary/40 px-2 py-1 text-left text-[11px] text-primary transition hover:bg-primary/5"
                  >
                    💡 {m.followUp}
                  </button>
                )}
              </div>
            )}
          </div>
        ))}

        {sending && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> The mentor is thinking…
          </div>
        )}
      </div>

      {hasGroundedEvidence && (
        <p className="mt-3 text-[10px] text-muted-foreground">
          Answers are grounded in Case File sections you can see. Private content is never used.
        </p>
      )}

      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask the mentor…"
          className="h-9 text-xs"
          disabled={sending}
        />
        <Button type="submit" size="sm" disabled={sending || !input.trim()}>
          {sending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Send className="h-3.5 w-3.5" />
          )}
        </Button>
      </form>
    </section>
  );
}
