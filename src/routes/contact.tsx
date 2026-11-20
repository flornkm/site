import { Body1 } from "@/components/design-system/body";
import { H2 } from "@/components/design-system/heading";
import { Link } from "@/components/ui/link";
import { CONTACTS } from "@/const/contacts";
import { absoluteUrl, canonicalLink } from "@/lib/site";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact ‹ Florian Kiem" },
      {
        name: "description",
        content: "How to reach Florian Kiem - email, social profiles, and what to expect.",
      },
      { property: "og:title", content: "Contact" },
      {
        property: "og:description",
        content: "How to reach Florian Kiem - email, social profiles, and what to expect.",
      },
      { property: "og:image", content: absoluteUrl("/api/og?title=Contact") },
      { name: "twitter:title", content: "Contact" },
      {
        name: "twitter:description",
        content: "How to reach Florian Kiem - email, social profiles, and what to expect.",
      },
      { name: "twitter:image", content: absoluteUrl("/api/og?title=Contact") },
    ],
    links: [canonicalLink("/contact")],
  }),
  component: ContactPage,
});

function ContactPage() {
  return (
    <div className="grid grid-cols-9 gap-x-6">
      <section className="col-start-1 col-span-9 md:col-start-3 md:col-span-3 lg:col-span-2">
        <H2 className="mb-4">Contact</H2>
        <Body1>
          The fastest way to reach me is email: hello@floriankiem.com. I read everything that lands
          there — questions about my work, advisory or embedded design-engineering collaborations,
          or just a hello.
        </Body1>
        <Body1 className="mt-4">
          If you are writing about a project, a short note on what you are building and where design
          or engineering help is needed makes it easy for me to respond quickly. I usually reply
          within a few days.
        </Body1>
        <H2 className="mt-12 mb-4">Elsewhere</H2>
        <ul className="space-y-1">
          {CONTACTS.map((contact) => (
            <li key={contact.name} className="text-sm">
              <Link
                href={contact.href}
                className="text-secondary transition-colors hover:text-primary"
              >
                {contact.name}
                {contact.handle ? ` — ${contact.handle}` : ""}
              </Link>
            </li>
          ))}
        </ul>
        <Body1 className="mt-12 text-tertiary">
          I am Florian Kiem, a designer and engineer building software products — currently based in
          Dubai, working with teams worldwide. Postal details are on the{" "}
          <Link href="/imprint" className="underline underline-offset-2">
            imprint
          </Link>{" "}
          page.
        </Body1>
      </section>
    </div>
  );
}
