import { Image } from "@/components/shared/image";
import { PHOTOS } from "@/features/about/const/photos";
import { absoluteUrl, canonicalLink } from "@/lib/site";
import { createFileRoute } from "@tanstack/react-router";
import { motion, useReducedMotion } from "motion/react";

const AVATAR = { src: "/images/avatars/florian_kiem.webp", alt: "Florian Kiem" };

// Per-photo grid placement, indexed to match PHOTOS order.
const PHOTO_LAYOUT = [
  "col-start-1 col-span-4 md:col-start-2 md:col-span-2",
  "col-start-3 col-span-4 mt-6 md:col-start-5 md:col-span-2 md:mt-20",
  "col-start-2 col-span-4 mt-2 md:col-start-8 md:col-span-2 md:mt-40",
  "col-start-1 col-span-4 mt-8 md:col-start-1 md:col-span-1 md:mt-12",
  "col-start-3 col-span-4 mt-2 md:col-start-3 md:col-span-2 md:mt-36",
  "col-start-1 col-span-5 mt-8 md:col-start-6 md:col-span-2 md:mt-12",
  "col-start-2 col-span-4 mt-2 md:col-start-8 md:col-span-1 md:mt-28",
  "col-start-3 col-span-4 mt-8 md:col-start-4 md:col-span-1 md:mt-24",
  "col-start-1 col-span-5 mt-2 md:col-start-7 md:col-span-2 md:mt-20",
  "col-start-2 col-span-4 mt-8 md:col-start-2 md:col-span-2 md:mt-28",
  "col-start-3 col-span-4 mt-2 md:col-start-4 md:col-span-2 md:mt-8",
  "col-start-1 col-span-5 mt-8 md:col-start-7 md:col-span-2 md:mt-40",
  "col-start-2 col-span-4 mt-2 md:col-start-1 md:col-span-2 md:mt-16",
];

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About ‹ Florian Kiem" },
      {
        name: "description",
        content:
          "How I got to design and coding, what I learned and accomplished so far, and why I love doing what I do.",
      },
      { property: "og:title", content: "About" },
      {
        property: "og:description",
        content:
          "How I got to design and coding, what I learned and accomplished so far, and why I love doing what I do.",
      },
      { property: "og:image", content: absoluteUrl("/api/og?title=About") },
      { name: "twitter:title", content: "About" },
      {
        name: "twitter:description",
        content:
          "How I got to design and coding, what I learned and accomplished so far, and why I love doing what I do.",
      },
      { name: "twitter:image", content: absoluteUrl("/api/og?title=About") },
    ],
    links: [canonicalLink("/about")],
  }),
  component: AboutPage,
});

function AboutPage() {
  const reduceMotion = useReducedMotion();

  return (
    <div>
      <div className="grid grid-cols-9 gap-x-6">
        <div className="col-start-1 col-span-9 mb-10 flex flex-col md:col-start-3 md:col-span-2 md:mb-0">
          <h1 className="text-sm fw-medium leading-snug text-primary">Background</h1>
          <p className="text-sm fw-medium leading-snug text-tertiary">
            From product design to code
          </p>
          <div className="order-first mb-8 max-w-40 bg-[#FDFDFC] md:order-none md:mt-12 md:mb-0">
            <Image
              src={AVATAR.src}
              alt={AVATAR.alt}
              objectFit="cover"
              priority
              className="h-auto w-full"
            />
          </div>
        </div>

        <div className="col-start-3 col-span-7 md:col-start-6 md:col-span-4 lg:col-span-2">
          <div className="hyphens-auto space-y-6 text-justify text-sm leading-relaxed text-primary md:max-w-72">
            <p>
              When people ask about my background, I usually say{" "}
              {/* The page's own background colour, so the answer flips with the theme. */}
              <span className="type-mono dark:hidden">#FDFDFD</span>
              <span className="type-mono hidden dark:inline">#000000</span>. The longer answer is
              below.
            </p>
            <p>
              Born in the south of Germany, I grew up with the Internet. In my childhood, I tried a
              bunch of different disciplines, ranging from 3D art to graphic design.
            </p>
            <p>
              After studying product design, my day-to-day work evolved into something different.
              Pure Figma designs aren't enough, so I see my value in developing foundational design
              systems hands-on.
            </p>
            <p>
              Outside of work, I like discovering the world and other cultures. Below are a few
              photos I took along the way.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-28 grid grid-cols-6 items-start gap-x-3 gap-y-2 md:mt-44 md:grid-cols-9 md:gap-x-6 md:gap-y-4">
        {PHOTOS.map((photo, index) => (
          <motion.figure
            key={photo.src}
            className={PHOTO_LAYOUT[index]}
            initial={reduceMotion ? false : { opacity: 0, y: 16, filter: "blur(4px)" }}
            whileInView={reduceMotion ? undefined : { opacity: 1, y: 0, filter: "blur(0px)" }}
            viewport={{ once: true, amount: "some", margin: "0px 0px 15% 0px" }}
            transition={{ duration: 0.5, delay: index * 0.08, ease: "easeOut" }}
          >
            <Image
              src={photo.src}
              alt={photo.caption}
              objectFit="cover"
              priority={index < 2}
              className="h-auto w-full"
            />
            <figcaption className="mt-2 font-serif font-normal text-[10px] italic text-primary">
              {photo.caption}
            </figcaption>
          </motion.figure>
        ))}
      </div>
    </div>
  );
}
