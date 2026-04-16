import Image from "next/image";
import { cookies } from "next/headers";
import dayjs from "dayjs";

import { getPostBySlug, getAllPosts } from "~utils/posts";
import { MdxRenderer } from "~components/mdx/MdxRenderer";

import { Post } from "../../../types/post";
import i18nConfig from "../../../next-i18next.config";

const getPost = (slug: string | undefined, lang: string): Post => {
  if (!slug || typeof slug !== "string") {
    throw new Response("Not Found", { status: 404 });
  }

  return getPostBySlug(slug, lang);
};

const PostPage = async ({ params }: { params: { slug: string } }) => {
  const cookieStore = cookies();
  const lang = cookieStore.get("lang")?.value || i18nConfig.defaultLocale;
  const post = getPost(params.slug, lang);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://if-geon.xyz";

  const fomattedDate = (date: string) => {
    const formattedDateKr = dayjs(date).format("YYYY년 MM월 DD일");
    const formattedDateEn = dayjs(date).format("MMMM DD, YYYY");
    return lang === "kr" ? formattedDateKr : formattedDateEn;
  };

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.metadata.title,
    description: post.metadata.description,
    datePublished: new Date(post.metadata.date).toISOString(),
    author: {
      "@type": "Person",
      name: "Geon",
      url: `${siteUrl}/resume`,
    },
    url: `${siteUrl}/posts/${post.slug}`,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <article className="prose dark:prose-invert max-w-none prose-pre:rounded-[9px] my-16">
        <div className="max-w-[1000px] m-auto text-center">
          <h1>{post.metadata.title}</h1>
          {post.metadata.thumbnail && (
            <Image
              src={`/posts/${post.slug}/${post.metadata.thumbnail}`}
              alt="post_thumbnail"
              className="rounded-[14px]"
              sizes="100vw"
              style={{ width: "100%", height: "auto" }}
              width={0}
              height={0}
            />
          )}
          <p>
            {post.metadata.category} | {fomattedDate(post.metadata.date)}
          </p>
        </div>
        <div className="max-w-[800px] m-auto">
          <div className="flex-col my-12">
            <h3
              dangerouslySetInnerHTML={{ __html: post.metadata.introTitle }}
            />
            <span
              dangerouslySetInnerHTML={{ __html: post.metadata.introDesc }}
            />
          </div>
          <hr className="border-1 w-4/12 m-auto mb-20" />
          <MdxRenderer source={post.content} />
        </div>
      </article>
    </>
  );
};
export default PostPage;

type Props = {
  params: { slug: string };
};

export async function generateMetadata({ params }: Props) {
  const cookieStore = cookies();
  const lang = cookieStore.get("lang")?.value || i18nConfig.defaultLocale;
  const post = getPost(params.slug, lang);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://if-geon.xyz";

  const highlightParam = post.metadata.highlightWord
    ? `&highlightWord=${encodeURIComponent(post.metadata.highlightWord)}`
    : "";
  const ogImageUrl = post.metadata.thumbnail
    ? `${siteUrl}/posts/${params.slug}/${post.metadata.thumbnail}`
    : `${siteUrl}/api/og/${params.slug}?title=${encodeURIComponent(
        post.metadata.title
      )}${highlightParam}`;

  return {
    title: post.metadata.title,
    description: post.metadata.description,
    authors: {
      name: "Geon",
      url: `${siteUrl}/resume`,
    },
    alternates: {
      canonical: `/posts/${params.slug}`,
    },
    openGraph: {
      type: "article",
      title: post.metadata.title,
      description: post.metadata.description,
      url: `/posts/${params.slug}`,
      publishedTime: new Date(post.metadata.date).toISOString(),
      authors: ["Geon"],
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: post.metadata.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: post.metadata.title,
      description: post.metadata.description,
      images: [ogImageUrl],
    },
  };
}

export const generateStaticParams = async () => {
  const posts = getAllPosts();
  return posts.map((post) => ({ slug: post.slug }));
};
