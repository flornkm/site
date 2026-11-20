import { useCallback, useEffect, useState } from "react";
import { PROJECTS } from "@/features/work/projects";
import { useTypingAnimation } from "../../../hooks/use-typing-animation";
import { CRTDisplay } from "../../contact/components/crt/crt-display";
import type { CRTMessage } from "../../contact/components/crt/crt-text-renderer";

const WORK_LIST = new Intl.ListFormat("en", { type: "conjunction" }).format(
  PROJECTS.map((project) => project.name),
);

const BOOT_MESSAGE = "Terminal ready. Ask me anything.";

const INITIAL_SUGGESTIONS = [
  "What does Florian do?",
  "Where has he worked?",
  "How can I reach him?",
];

interface Reply {
  answer: string;
  followups: string[];
}

// Canned, terminal-style answers. Kept plain so the demo works with the chat
// endpoint gone — no network, no model, just a scripted conversation.
const SCRIPT: { match: RegExp; reply: Reply }[] = [
  {
    match: /reach|contact|email|touch|hire|get in|message/i,
    reply: {
      answer:
        "Email him at [hello@floriankiem.com](mailto:hello@floriankiem.com), or find him as [@flornkm](https://twitter.com/flornkm) on X and [GitHub](https://github.com/flornkm).",
      followups: ["What does Florian do?", "What's his tech stack?", "Where has he worked?"],
    },
  },
  {
    match: /stack|tech|tool|framework|language|build.*with/i,
    reply: {
      answer:
        "React, TypeScript, Vite, TanStack, Tailwind, Three.js / R3F, Rive, and Firebase. This site runs on TanStack Start.",
      followups: ["What has he built?", "Where has he worked?", "How can I reach him?"],
    },
  },
  {
    match: /travel|countr|visit|been to|world/i,
    reply: {
      answer:
        "16 countries so far, from Germany across Europe to the UAE, Thailand, and Indonesia.",
      followups: ["What does Florian do?", "What's his tech stack?", "How can I reach him?"],
    },
  },
  {
    match: /work|compan|client|employ|job|team/i,
    reply: {
      answer: `Doing design and code for ${WORK_LIST}.`,
      followups: ["What has he built?", "What's his tech stack?", "How can I reach him?"],
    },
  },
  {
    match: /built|project|made|ship|portfolio|experiment/i,
    reply: {
      answer:
        "Interfaces and internal tools for the companies he's worked with, plus experiments like this CRT terminal.",
      followups: ["What's his tech stack?", "Where has he worked?", "How can I reach him?"],
    },
  },
  {
    match: /do|role|who|about|design engineer|background/i,
    reply: {
      answer:
        "Design, code. He translates design into production-grade code to shorten iteration cycles and ship better products.",
      followups: ["Where has he worked?", "What's his tech stack?", "How can I reach him?"],
    },
  },
];

const FALLBACK: Reply = {
  answer:
    "This is a scripted demo, so it only knows a few things about Florian. Try a suggestion below.",
  followups: INITIAL_SUGGESTIONS,
};

function replyFor(text: string): Reply {
  return SCRIPT.find((entry) => entry.match.test(text))?.reply ?? FALLBACK;
}

type Phase = "boot" | "idle" | "typing";

export const CrtChat = () => {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<CRTMessage[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [followups, setFollowups] = useState<string[]>([]);
  const [phase, setPhase] = useState<Phase>("boot");
  const [target, setTarget] = useState(BOOT_MESSAGE);

  // Feed the hook an empty target while idle so the next answer always animates
  // from scratch, even if it repeats the previous answer verbatim.
  const typed = useTypingAnimation(phase === "idle" ? "" : target);

  useEffect(() => {
    if (phase === "idle" || typed !== target) return;
    if (phase === "boot") {
      setSuggestions(INITIAL_SUGGESTIONS);
    } else {
      setMessages((prev) => [...prev, { role: "assistant", text: target }]);
      setSuggestions(followups);
    }
    setPhase("idle");
  }, [phase, typed, target, followups]);

  const send = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const reply = replyFor(trimmed);
    setMessages((prev) => [...prev, { role: "user", text: trimmed }]);
    setSuggestions([]);
    setFollowups(reply.followups);
    setTarget(reply.answer);
    setPhase("typing");
    setInput("");
  }, []);

  const handleSuggestionClick = useCallback(
    (suggestion: string) => {
      if (phase !== "idle") return;
      send(suggestion);
    },
    [phase, send],
  );

  const displayMessages: CRTMessage[] =
    phase === "boot" ? [] : [{ role: "assistant", text: BOOT_MESSAGE }, ...messages];

  return (
    // Query container so the TV can size its 4:3 tube against this box (not the viewport)
    // and stay contained in either dialog orientation. See CRTDisplay's non-fullscreen root.
    <div className="relative flex h-full w-full items-center justify-center [container-type:size]">
      <CRTDisplay
        messages={displayMessages}
        streamedText={phase === "idle" ? "" : typed}
        isStreaming={phase !== "idle"}
        inputText={input}
        onInputChange={setInput}
        onSubmit={send}
        disabled={phase !== "idle"}
        suggestions={suggestions}
        onSuggestionClick={handleSuggestionClick}
        fullscreen={false}
        scale={typeof window !== "undefined" && window.innerWidth < 768 ? 0.62 : 0.72}
        autoFocus={false}
      />
    </div>
  );
};
