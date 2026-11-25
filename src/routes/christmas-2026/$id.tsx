import { GiftPage } from "@/features/gifts/components/gift-page";
import { getSealedGift } from "@/features/gifts/lib/sealed-gifts";
import { absoluteUrl } from "@/lib/site";
import { createFileRoute, notFound } from "@tanstack/react-router";

const COLLECTION = "christmas-2026";
const YEAR = "2026";

export const Route = createFileRoute("/christmas-2026/$id")({
  staticData: { bare: true },
  loader: async ({ params }) => {
    const sealed = await getSealedGift({ data: { collection: COLLECTION, id: params.id } });
    if (!sealed) throw notFound();
    return sealed;
  },
  // Titled for the recipient (the front of the card says as much), but kept out of every
  // index: the link is the only way in. vercel.json sends the same as an X-Robots-Tag.
  head: ({ loaderData, params }) => {
    const title = loaderData?.cover.title ?? "A little something";
    const image = absoluteUrl(`/api/gift-preview?c=${COLLECTION}&id=${params.id}`);
    const description = "A little something. Open it with the password you were given.";
    return {
      meta: [
        { title },
        { name: "robots", content: "noindex, nofollow, noarchive, nosnippet, noimageindex" },
        { name: "referrer", content: "no-referrer" },
        { name: "theme-color", content: "#fdfdfd" },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:image", content: image },
        { property: "og:image:width", content: "2400" },
        { property: "og:image:height", content: "1260" },
        { property: "og:image:alt", content: title },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
        { name: "twitter:image", content: image },
      ],
    };
  },
  component: GiftRoute,
});

function GiftRoute() {
  const sealed = Route.useLoaderData();
  const { id } = Route.useParams();

  return <GiftPage sealed={sealed} storageKey={`gift:${COLLECTION}/${id}`} year={YEAR} />;
}
