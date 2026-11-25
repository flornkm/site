import { Body1 } from "@/components/design-system/body";
import Button from "@/components/ui/button";
import { IconArrowRight } from "central-icons/IconArrowRight";
import { cn } from "@/lib/utils";
import { useAnimate } from "motion/react";
import { useState, type FormEvent } from "react";

const STATUS = {
  idle: "",
  checking: "Opening…",
  wrong: "That's not it. Try again.",
} as const;

// Sits under the card (or beside it on a phone held sideways), where the turn-over hint
// appears once it opens.
export function PasswordForm({
  onUnseal,
  aside,
}: {
  onUnseal: (password: string) => Promise<boolean>;
  aside: boolean;
}) {
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<keyof typeof STATUS>("idle");
  const [scope, animateScope] = useAnimate<HTMLFormElement>();

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!password.trim() || status === "checking") return;
    setStatus("checking");
    if (await onUnseal(password)) return;
    setStatus("wrong");
    animateScope(scope.current, { x: [0, -6, 5, -3, 2, 0] }, { duration: 0.4 });
  }

  return (
    <div
      className={cn(
        "pointer-events-auto absolute",
        aside
          ? "top-1/2 left-full ml-8 w-[min(280px,calc(50vw-50%-3rem))] -translate-y-1/2"
          : "top-full left-1/2 mt-10 w-[min(100%,280px)] -translate-x-1/2",
      )}
    >
      <form
        ref={scope}
        onSubmit={onSubmit}
        className="flex items-center gap-1.5 rounded-full bg-tertiary p-1 pl-4 transition-colors duration-150 focus-within:bg-quaternary"
      >
        {/* 16px keeps iOS from zooming the page on focus. */}
        <input
          value={password}
          onChange={(event) => {
            setPassword(event.target.value);
            if (status === "wrong") setStatus("idle");
          }}
          name="gift-password"
          placeholder="Password"
          aria-label="Password"
          autoComplete="off"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          className="min-w-0 flex-1 bg-transparent text-base text-primary outline-none placeholder:text-tertiary"
        />
        <Button
          type="submit"
          aria-label="Open"
          size="md"
          iconOnly
          rounded
          disabled={status === "checking"}
          className="rounded-full"
        >
          <IconArrowRight />
        </Button>
      </form>
      <Body1 aria-live="polite" className="mt-3 h-5 text-center text-pretty text-tertiary">
        {STATUS[status]}
      </Body1>
    </div>
  );
}
