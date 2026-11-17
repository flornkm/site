import Button from "@/components/ui/button";
import { IconArrowDown } from "central-icons/IconArrowDown";
import { IconCheckmark1Small } from "central-icons/IconCheckmark1Small";
import { IconClipboard2 } from "central-icons/IconClipboard2";
import { IconLock } from "central-icons/IconLock";
import { IconUnlocked } from "central-icons/IconUnlocked";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/utils";
import { useCallback, useState, useSyncExternalStore, type FormEvent } from "react";

type Status = "idle" | "sending" | "error";

const SWAP = {
  initial: { opacity: 0, filter: "blur(2px)" },
  animate: { opacity: 1, filter: "blur(0px)" },
  exit: { opacity: 0, filter: "blur(2px)" },
  transition: { duration: 0.18, ease: "easeOut" },
} as const;

// Remembered per browser so a returning reader isn't asked again. Storage can throw (private
// mode, blocked site data); the gate then just shows the form.
function useUnlocked(key: string) {
  const read = useCallback(() => {
    try {
      return localStorage.getItem(key) === "1";
    } catch {
      return false;
    }
  }, [key]);
  const subscribe = useCallback(
    (notify: () => void) => {
      window.addEventListener("storage", notify);
      window.addEventListener(`unlock:${key}`, notify);
      return () => {
        window.removeEventListener("storage", notify);
        window.removeEventListener(`unlock:${key}`, notify);
      };
    },
    [key],
  );
  const unlocked = useSyncExternalStore(subscribe, read, () => false);
  const unlock = () => {
    try {
      localStorage.setItem(key, "1");
    } catch {
      // Unlocks for this visit only; the address was still saved.
    }
    window.dispatchEvent(new Event(`unlock:${key}`));
  };
  return [unlocked, unlock] as const;
}

export function SkillGate({
  skill,
  title,
  description,
  command,
  downloadUrl,
  source,
}: {
  skill: string;
  title: string;
  description: string;
  command: string;
  downloadUrl: string;
  source: string;
}) {
  const [unlocked, unlock] = useUnlocked(`skill-unlocked:${skill}`);
  const [status, setStatus] = useState<Status>("idle");
  const [copied, setCopied] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setStatus("sending");
    try {
      const response = await fetch("/api/stay-in-touch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.get("email"), website: form.get("website"), source }),
      });
      if (!response.ok) return setStatus("error");
      setStatus("idle");
      unlock();
    } catch {
      setStatus("error");
    }
  };

  const copy = () => {
    navigator.clipboard
      .writeText(command)
      .then(() => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1600);
      })
      .catch(() => {});
  };

  const Icon = unlocked ? IconUnlocked : IconLock;
  const commandClass = cn(
    "min-w-0 flex-1 truncate px-1.5 font-mono text-xs",
    unlocked ? "text-primary select-all" : "text-tertiary blur-[3px] select-none",
  );

  return (
    // A div, not a section: the post template caps every other top-level element at the 460px
    // text measure, and this should match the 560px "Stay in touch" card instead.
    <div
      role="region"
      aria-labelledby={`skill-${skill}`}
      className="not-prose my-12 rounded-[14px] bg-tertiary p-1.5 lg:mx-auto lg:max-w-[560px]"
    >
      {/* On lg the card is wider than the 460px text measure, so the title starts on the text's
          left edge: half the leftover width, minus the card's p-1.5 and the icon plus gap. */}
      <div className="flex gap-2 px-2.5 pt-2.5 pb-4 lg:pl-[calc(50%-254px)]">
        <Icon className="mt-0.5 size-4 shrink-0 text-secondary" aria-hidden />
        <div>
          <h2 id={`skill-${skill}`} className="text-sm leading-5 fw-medium text-primary">
            {title}
          </h2>
          <p className="mt-0.5 text-sm leading-5 text-tertiary">{description}</p>
        </div>
      </div>

      <div className="rounded-lg bg-surface smooth-shadow-ring-xs outline outline-transparent outline-offset-0 transition-[outline-color,outline-offset,outline-width] duration-150 has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-blue-300 dark:bg-surface-tertiary">
        <div className="flex h-9 items-center gap-1 p-1">
          <span aria-hidden={!unlocked || undefined} className={commandClass}>
            {command}
          </span>
          {unlocked && (
            <Button
              size="sm"
              variant="secondary"
              onClick={copy}
              prefix={copied ? <IconCheckmark1Small /> : <IconClipboard2 />}
            >
              {copied ? "Copied" : "Copy"}
            </Button>
          )}
        </div>

        <div className="flex h-9 items-center border-t border-primary p-1">
          <AnimatePresence mode="wait" initial={false}>
            {unlocked ? (
              <motion.div
                key="download"
                {...SWAP}
                className="flex h-full w-full items-center justify-between gap-1 pl-1.5"
              >
                <p role="status" className="truncate text-sm text-secondary">
                  Unlocked. Run it in your project, or download it.
                </p>
                <a
                  href={downloadUrl}
                  className="inline-flex h-7 shrink-0 items-center gap-1 rounded-sm bg-accent-primary px-2.5 text-sm font-medium text-accent-foreground transition-colors duration-150 hover:bg-accent-primary-hover active:bg-accent-primary-active"
                >
                  <IconArrowDown className="size-4" aria-hidden />
                  Download
                </a>
              </motion.div>
            ) : (
              <motion.form
                key="form"
                {...SWAP}
                onSubmit={submit}
                // Before hydration Enter would otherwise do a native GET to this page: a reload
                // with the address in the URL. Posting to the API instead still saves it.
                action="/api/stay-in-touch"
                method="post"
                className="flex h-full w-full items-center gap-1"
              >
                <input
                  type="email"
                  name="email"
                  required
                  autoComplete="email"
                  placeholder="you@example.com"
                  aria-label="Email address"
                  aria-invalid={status === "error" || undefined}
                  aria-describedby={status === "error" ? `skill-${skill}-error` : undefined}
                  onChange={() => status === "error" && setStatus("idle")}
                  className="h-full min-w-0 flex-1 bg-transparent px-1.5 text-sm text-primary outline-none placeholder:text-quaternary"
                />
                <input type="hidden" name="source" value={source} />
                {/* Honeypot for form-filling bots; hidden from people and assistive tech. */}
                <input
                  type="text"
                  name="website"
                  tabIndex={-1}
                  autoComplete="off"
                  aria-hidden
                  className="sr-only"
                />
                <Button type="submit" size="sm" disabled={status === "sending"}>
                  Unlock
                </Button>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {status === "error" && (
          <motion.div
            key="error"
            initial={{ height: 0, opacity: 0, filter: "blur(2px)" }}
            animate={{ height: "auto", opacity: 1, filter: "blur(0px)" }}
            exit={{ height: 0, opacity: 0, filter: "blur(2px)" }}
            transition={{ type: "spring", visualDuration: 0.25, bounce: 0 }}
            className="overflow-hidden"
          >
            <p
              id={`skill-${skill}-error`}
              role="alert"
              className="px-2.5 pt-2 pb-1 text-xs text-destructive"
            >
              That didn't go through. Check the address and try again.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
