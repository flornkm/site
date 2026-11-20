import { CONTACT_TRIGGER_PROPS, openContactDialog } from "@/components/shared/contact-dialog";
import { Link } from "@/components/ui/link";
import Tooltip from "@/components/ui/tooltip";
import { CONTACTS } from "@/const/contacts";
import { PROJECTS } from "@/features/work/projects";
import { absoluteUrl, canonicalLink } from "@/lib/site";
import { createFileRoute } from "@tanstack/react-router";
import { Fragment, useEffect, useRef, useState } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Florian Kiem ‹ Designer, Engineer" },
      {
        name: "description",
        content:
          "Designs and builds software with early teams. Selected work for Cognition, Legora, Flow, and more.",
      },
      { property: "og:title", content: "Florian Kiem" },
      {
        property: "og:description",
        content:
          "Designs and builds software with early teams. Selected work for Cognition, Legora, Flow, and more.",
      },
      { property: "og:image", content: absoluteUrl("/api/og?title=Florian%20Kiem") },
      { name: "twitter:title", content: "Florian Kiem" },
      {
        name: "twitter:description",
        content:
          "Designs and builds software with early teams. Selected work for Cognition, Legora, Flow, and more.",
      },
      { name: "twitter:image", content: absoluteUrl("/api/og?title=Florian%20Kiem") },
    ],
    links: [canonicalLink("/")],
  }),
  component: IndexPage,
});

const INLINE_LINK =
  "underline decoration-tertiary/30 decoration-1 underline-offset-[3px] transition-all duration-200 hover:decoration-tertiary/70 active:no-underline";

const EMAIL = CONTACTS.find((contact) => contact.name === "Email")?.handle ?? "";

// Copies the address instead of opening a mail client; without clipboard access the
// mailto href still works.
function CopyEmailLink() {
  const [copied, setCopied] = useState(false);
  const [hovered, setHovered] = useState(false);
  const resetTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(resetTimeout.current), []);

  return (
    <>
      <Tooltip
        inline
        content={copied ? "Copied" : EMAIL}
        // Forced open while "Copied" shows, so touch and keyboard users see it too. Base UI
        // dismisses a tooltip when its trigger is pressed; here the press is the copy action.
        open={hovered || copied}
        onOpenChange={(open, details) => {
          if (!open && details.reason === "trigger-press") return;
          setHovered(open);
        }}
      >
        <a
          href={`mailto:${EMAIL}`}
          onClick={(e) => {
            if (!navigator.clipboard) return;
            e.preventDefault();
            void navigator.clipboard.writeText(EMAIL);
            setCopied(true);
            clearTimeout(resetTimeout.current);
            resetTimeout.current = setTimeout(() => setCopied(false), 2000);
          }}
          className={INLINE_LINK}
        >
          email
        </a>
      </Tooltip>
      <span className="sr-only" aria-live="polite">
        {copied ? "Email address copied" : ""}
      </span>
    </>
  );
}

function IndexPage() {
  return (
    <div className="md:grid md:grid-cols-9 md:gap-x-6">
      <div className="max-w-96 space-y-6 text-sm leading-relaxed text-pretty text-primary md:col-span-3 md:col-start-3">
        <h1 className="fw-medium">Florian Kiem</h1>
        <p>
          Working where design meets code. Partnering with ambitious teams, occasionally as an
          investor.
        </p>
        <p>
          Teams include{" "}
          {PROJECTS.map((project) => (
            <Fragment key={project.name}>
              <a
                href={project.url}
                target="_blank"
                rel="noopener noreferrer"
                title={project.description}
                className={INLINE_LINK}
              >
                {project.name}
              </a>
              ,{" "}
            </Fragment>
          ))}
          and some in stealth.
        </p>
        <p>
          Reach out on{" "}
          <a
            href="https://x.com/messages/compose?recipient_id=1053753388289155073"
            target="_blank"
            rel="noopener noreferrer"
            className={INLINE_LINK}
          >
            X
          </a>
          , by <CopyEmailLink />, or{" "}
          <Link
            href="/contact"
            {...CONTACT_TRIGGER_PROPS}
            onClick={(e) => {
              if (openContactDialog()) e.preventDefault();
            }}
            className={INLINE_LINK}
          >
            elsewhere
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
