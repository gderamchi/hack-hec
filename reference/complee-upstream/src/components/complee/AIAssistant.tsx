// Complee — Floating AI assistant.
// Bottom-right chat widget. Streams answers from the assistant-chat edge
// function via Lovable AI Gateway. When a roadmap step is open, the parent
// supplies stepContext so answers are grounded in that step.

import { useEffect, useRef, useState } from "react";
import { MessageCircle, Send, Sparkles, X } from "lucide-react";

export interface AssistantStepContext {
  requirementTitle?: string;
  authority?: string;
  regulationReference?: string;
  country?: string;
  summary?: string;
  substeps?: { title: string; detail: string }[];
}

interface Msg {
  role: "user" | "assistant";
  content: string;
}

interface Props {
  /** Optional context about the step the user is currently viewing. */
  stepContext?: AssistantStepContext;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/assistant-chat`;

export function AIAssistant({ stepContext }: Props) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, busy]);

  const greeting = stepContext?.requirementTitle
    ? `Ask me anything about "${stepContext.requirementTitle}" — what it means, why it's required, or how to fill in the inputs.`
    : `Ask me anything about EU/UK fintech compliance — capital requirements, safeguarding, AML, SCA, governance, you name it.`;

  const send = async () => {
    const text = input.trim();
    if (!text || busy) return;
    const userMsg: Msg = { role: "user", content: text };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setBusy(true);

    let acc = "";
    const upsertAssistant = (chunk: string) => {
      acc += chunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: acc } : m));
        }
        return [...prev, { role: "assistant", content: acc }];
      });
    };

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: next, stepContext }),
      });

      if (!resp.ok || !resp.body) {
        if (resp.status === 429) {
          upsertAssistant("⚠️ Too many requests right now — give it a moment and try again.");
        } else if (resp.status === 402) {
          upsertAssistant(
            "⚠️ AI credits are exhausted on this workspace. Add funds in Settings → Workspace → Usage.",
          );
        } else {
          upsertAssistant("⚠️ The assistant is temporarily unavailable. Please try again.");
        }
        setBusy(false);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let done = false;

      while (!done) {
        const { value, done: streamDone } = await reader.read();
        if (streamDone) break;
        buf += decoder.decode(value, { stream: true });
        let idx: number;
        while ((idx = buf.indexOf("\n")) !== -1) {
          let line = buf.slice(0, idx);
          buf = buf.slice(idx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line || line.startsWith(":")) continue;
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") {
            done = true;
            break;
          }
          try {
            const parsed = JSON.parse(json);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) upsertAssistant(content);
          } catch {
            buf = line + "\n" + buf;
            break;
          }
        }
      }
    } catch (e) {
      console.error(e);
      upsertAssistant("⚠️ Network error — please try again.");
    } finally {
      setBusy(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <>
      {/* Floating button — z-[60] so it sits above the RoadmapGuide drawer (z-50).
          When a step is open, anchor to bottom-LEFT so it doesn't overlap the drawer on the right. */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className={`fixed bottom-5 z-[60] group flex items-center gap-2 rounded-full bg-brand text-brand-foreground shadow-lg hover:shadow-xl pl-3 pr-4 py-3 text-[13px] font-medium transition-all hover:-translate-y-0.5 ${
            stepContext?.requirementTitle ? "left-5" : "right-5"
          }`}
          aria-label="Open AI assistant"
        >
          <span className="relative flex h-7 w-7 items-center justify-center rounded-full bg-white/15">
            <Sparkles className="h-3.5 w-3.5" />
          </span>
          {stepContext?.requirementTitle ? "Ask about this step" : "Ask Complee AI"}
        </button>
      )}

      {/* Panel — z-[60] so it overlays the RoadmapGuide drawer while a step is open.
          Also anchored left when a step is open. */}
      {open && (
        <div
          className={`fixed bottom-5 z-[60] flex h-[min(620px,calc(100vh-40px))] w-[min(400px,calc(100vw-40px))] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl ${
            stepContext?.requirementTitle ? "left-5" : "right-5"
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border bg-gradient-to-br from-brand to-brand/85 px-4 py-3 text-brand-foreground">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <div className="text-[13px] font-semibold leading-tight">Complee AI</div>
                <div className="text-[10.5px] opacity-80 leading-tight">
                  {stepContext?.requirementTitle ? "Step-aware assistant" : "Compliance assistant"}
                </div>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-white/15"
              aria-label="Close assistant"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-surface-muted/30">
            {messages.length === 0 && (
              <div className="rounded-xl border border-brand/20 bg-brand-soft/40 p-3 text-[12.5px] text-navy leading-relaxed">
                <div className="flex items-start gap-2">
                  <MessageCircle className="h-4 w-4 text-brand mt-0.5 shrink-0" />
                  <div>{greeting}</div>
                </div>
                {stepContext?.substeps && stepContext.substeps.length > 0 && (
                  <div className="mt-3 space-y-1.5">
                    <div className="text-[10.5px] uppercase tracking-[0.08em] font-semibold text-brand">
                      Try
                    </div>
                    {[
                      "Why does the regulator require this?",
                      "What evidence will they actually check?",
                      "What's a common mistake here?",
                    ].map((q) => (
                      <button
                        key={q}
                        onClick={() => setInput(q)}
                        className="block w-full text-left text-[12px] rounded-md border border-border bg-card px-2.5 py-1.5 hover:border-brand/40 hover:bg-brand-soft/30 text-navy"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[88%] rounded-2xl px-3 py-2 text-[12.5px] leading-relaxed ${
                    m.role === "user"
                      ? "bg-brand text-brand-foreground rounded-br-sm whitespace-pre-wrap"
                      : "bg-card border border-border text-navy rounded-bl-sm"
                  }`}
                >
                  {m.role === "assistant" ? (
                    m.content ? (
                      <FormattedMessage text={m.content} />
                    ) : busy ? (
                      "…"
                    ) : (
                      ""
                    )
                  ) : (
                    m.content
                  )}
                </div>
              </div>
            ))}

            {busy && messages[messages.length - 1]?.role === "user" && (
              <div className="flex justify-start">
                <div className="bg-card border border-border text-muted-foreground rounded-2xl rounded-bl-sm px-3 py-2 text-[12.5px]">
                  <span className="inline-flex gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-pulse" />
                    <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-pulse [animation-delay:0.15s]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-pulse [animation-delay:0.3s]" />
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="border-t border-border bg-card p-3">
            <div className="flex items-end gap-2">
              <textarea
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder={
                  stepContext?.requirementTitle
                    ? `Ask about ${stepContext.requirementTitle}…`
                    : "Ask a compliance question…"
                }
                className="flex-1 resize-none rounded-lg border border-border bg-surface-muted/60 px-3 py-2 text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand max-h-[120px]"
              />
              <button
                onClick={send}
                disabled={!input.trim() || busy}
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand text-brand-foreground hover:bg-brand/90 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                aria-label="Send"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-1.5 text-[10px] text-muted-foreground text-center">
              Powered by Lovable AI · Step-aware answers
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/**
 * Lightweight markdown renderer for assistant replies.
 * Models often emit `**bold**`, `*italic*`, `# headings`, `- bullets`, and
 * `` `code` ``. We strip the syntax and render clean, accessible JSX so
 * stars/asterisks never leak into the UI.
 */
function FormattedMessage({ text }: { text: string }) {
  // Split into blocks: paragraphs, bullet lists, numbered lists.
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  type Block =
    | { kind: "p"; lines: string[] }
    | { kind: "ul"; items: string[] }
    | { kind: "ol"; items: string[] }
    | { kind: "h"; text: string };

  const blocks: Block[] = [];
  let buf: string[] = [];
  const flushP = () => {
    if (buf.length) {
      blocks.push({ kind: "p", lines: buf });
      buf = [];
    }
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) {
      flushP();
      continue;
    }
    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      flushP();
      blocks.push({ kind: "h", text: heading[2].trim() });
      continue;
    }
    const bullet = line.match(/^\s*[-*•]\s+(.*)$/);
    if (bullet) {
      flushP();
      const last = blocks[blocks.length - 1];
      if (last && last.kind === "ul") last.items.push(bullet[1]);
      else blocks.push({ kind: "ul", items: [bullet[1]] });
      continue;
    }
    const numbered = line.match(/^\s*\d+[.)]\s+(.*)$/);
    if (numbered) {
      flushP();
      const last = blocks[blocks.length - 1];
      if (last && last.kind === "ol") last.items.push(numbered[1]);
      else blocks.push({ kind: "ol", items: [numbered[1]] });
      continue;
    }
    buf.push(line);
  }
  flushP();

  return (
    <div className="space-y-2">
      {blocks.map((b, i) => {
        if (b.kind === "h") {
          return (
            <div key={i} className="font-semibold text-navy">
              {renderInline(b.text)}
            </div>
          );
        }
        if (b.kind === "ul") {
          return (
            <ul key={i} className="list-disc pl-4 space-y-0.5">
              {b.items.map((it, j) => (
                <li key={j}>{renderInline(it)}</li>
              ))}
            </ul>
          );
        }
        if (b.kind === "ol") {
          return (
            <ol key={i} className="list-decimal pl-4 space-y-0.5">
              {b.items.map((it, j) => (
                <li key={j}>{renderInline(it)}</li>
              ))}
            </ol>
          );
        }
        return (
          <p key={i} className="whitespace-pre-wrap">
            {renderInline(b.lines.join(" "))}
          </p>
        );
      })}
    </div>
  );
}

/**
 * Inline markdown: **bold**, *italic*, `code`, [text](url).
 * Returns an array of React nodes — never leaks raw `*` characters.
 */
function renderInline(text: string): React.ReactNode[] {
  // Order matters: bold before italic so `**foo**` isn't mis-parsed.
  // Tokenise with a single regex.
  const tokens: React.ReactNode[] = [];
  const regex = /(\*\*([^*]+)\*\*|__([^_]+)__|\*([^*\n]+)\*|_([^_\n]+)_|`([^`]+)`|\[([^\]]+)\]\(([^)]+)\))/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) tokens.push(text.slice(last, m.index));
    if (m[2] !== undefined || m[3] !== undefined) {
      tokens.push(
        <strong key={key++} className="font-semibold">
          {m[2] ?? m[3]}
        </strong>,
      );
    } else if (m[4] !== undefined || m[5] !== undefined) {
      tokens.push(
        <em key={key++} className="italic">
          {m[4] ?? m[5]}
        </em>,
      );
    } else if (m[6] !== undefined) {
      tokens.push(
        <code
          key={key++}
          className="rounded bg-surface-muted px-1 py-0.5 text-[11.5px] font-mono"
        >
          {m[6]}
        </code>,
      );
    } else if (m[7] !== undefined && m[8] !== undefined) {
      tokens.push(
        <a
          key={key++}
          href={m[8]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-brand underline hover:text-brand/80"
        >
          {m[7]}
        </a>,
      );
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) tokens.push(text.slice(last));
  // Final safety net: strip any stray asterisks/underscores that survived.
  return tokens.map((t, i) =>
    typeof t === "string" ? t.replace(/\*+|__+/g, "") : <span key={i}>{t}</span>,
  );
}
