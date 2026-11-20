import { CONTACTS } from "@/const/contacts";
import { SITE_URL, canonicalUrl } from "@/lib/site";

const SOCIAL_PROFILES = CONTACTS.map((c) => c.href).filter((href) => href.startsWith("https://"));

const PERSON_ID = `${SITE_URL}/#person`;
const BLOG_URL = canonicalUrl("/writing");
const BLOG_ID = `${BLOG_URL}#blog`;

// schema.org identity for the site: a Person (this is a personal site) plus the
// WebSite that belongs to him, linked via @id so agents resolve both as one entity.
export const STRUCTURED_DATA = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Person",
      "@id": PERSON_ID,
      name: "Florian Kiem",
      url: SITE_URL,
      email: "mailto:hello@floriankiem.com",
      jobTitle: "Designer, Engineer",
      description:
        "Florian Kiem designs and builds software with early teams, and invests in a few.",
      sameAs: SOCIAL_PROFILES,
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      name: "Florian Kiem",
      url: SITE_URL,
      description:
        "The personal site of Florian Kiem - design and code, bridging the gap between creativity and logic in this portfolio.",
      author: { "@id": PERSON_ID },
      publisher: { "@id": PERSON_ID },
    },
  ],
} as const;

export const structuredDataJson = () => JSON.stringify(STRUCTURED_DATA);

export type WritingPost = {
  slug: string;
  title: string;
  description?: string;
  // ISO date from frontmatter. Empty for live posts (e.g. runs), which carry no
  // publish date — theirs streams in from Firebase long after the head is built.
  date: string;
};

export const writingPostUrl = (slug: string) => canonicalUrl(`/writing/${slug}`);

const postNodeId = (slug: string) => `${writingPostUrl(slug)}#article`;

// A post is only a BlogPosting once it has a publish date — Google requires
// datePublished for article results, and a dateless one would claim to be an
// article without ever qualifying as one. Live posts are honest WebPages instead.
// Both pages that describe a post derive its type here so the same @id never
// resolves to two different types.
const postNodeType = (post: WritingPost) => (post.date ? "BlogPosting" : "WebPage");

const breadcrumbList = (trail: { name: string; path: string }[]) => ({
  "@type": "BreadcrumbList",
  itemListElement: trail.map((crumb, index) => ({
    "@type": "ListItem",
    position: index + 1,
    name: crumb.name,
    item: canonicalUrl(crumb.path),
  })),
});

// Article-level data for a single post, plus its breadcrumb trail. The Person and
// WebSite nodes come from the root's own ld+json block on the same page; search
// engines merge every block, so the @id references below resolve.
export function writingPostStructuredData(post: WritingPost, image: string) {
  const url = writingPostUrl(post.slug);

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": postNodeType(post),
        "@id": postNodeId(post.slug),
        headline: post.title,
        name: post.title,
        ...(post.description ? { description: post.description } : {}),
        url,
        mainEntityOfPage: { "@type": "WebPage", "@id": url },
        // No dateModified: nothing in the repo tracks edits, and repeating
        // datePublished there would just assert a freshness that isn't measured.
        ...(post.date ? { datePublished: post.date } : {}),
        image,
        inLanguage: "en",
        isPartOf: { "@id": BLOG_ID },
        author: { "@id": PERSON_ID },
        publisher: { "@id": PERSON_ID },
      },
      breadcrumbList([
        { name: "Home", path: "/" },
        { name: "Writing", path: "/writing" },
        { name: post.title, path: `/writing/${post.slug}` },
      ]),
    ],
  };
}

// The index describes the collection itself and lists its posts as an ItemList of
// URLs rather than inlining each post — the detail pages carry the article data,
// and ItemList takes entries of any type, so live posts fit without a range violation.
export function writingIndexStructuredData(posts: WritingPost[], description: string) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Blog",
        "@id": BLOG_ID,
        name: "Writing",
        description,
        url: BLOG_URL,
        inLanguage: "en",
        author: { "@id": PERSON_ID },
        publisher: { "@id": PERSON_ID },
        mainEntity: { "@id": `${BLOG_URL}#posts` },
      },
      {
        "@type": "ItemList",
        "@id": `${BLOG_URL}#posts`,
        numberOfItems: posts.length,
        itemListElement: posts.map((post, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: post.title,
          url: writingPostUrl(post.slug),
        })),
      },
      breadcrumbList([
        { name: "Home", path: "/" },
        { name: "Writing", path: "/writing" },
      ]),
    ],
  };
}
