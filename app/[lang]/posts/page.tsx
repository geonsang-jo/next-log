import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import dayjs from "dayjs";
import { Post } from "~types/post";
import { getAllPosts } from "~utils/posts";
import { Skeleton } from "~components/ui/skeleton";

type Props = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  const description =
    lang === "ko"
      ? "웹 개발과 기술에 대한 글 모음"
      : "A collection of writing on web development and technology";
  return {
    title: "Posts",
    description,
    openGraph: {
      title: "Posts | Geon log",
      description,
    },
    alternates: {
      canonical: `/${lang}/posts`,
      languages: {
        ko: "/ko/posts",
        en: "/en/posts",
        "x-default": "/en/posts",
      },
    },
  };
}

const getPosts = async (lang: string): Promise<Post[]> => {
  return getAllPosts(lang);
};

const Article = async ({ params }: Props) => {
  const { lang } = await params;
  const posts = await getPosts(lang);

  const fomattedDate = (date: string) => {
    const formattedDateKr = dayjs(date).format("YYYY년 MM월 DD일");
    const formattedDateEn = dayjs(date).format("MMMM DD, YYYY");
    return lang === "ko" ? formattedDateKr : formattedDateEn;
  };

  return (
    <section className="flex pt-12 pb-14 w-full max-w-[900px] m-auto px-4 md:px-0">
      <ul className="flex w-full flex-col gap-y-10 md:gap-y-20">
        {posts.map((post, index) => (
          <li
            key={post.slug}
            className="group transition-transform ease-in-out duration-200 "
          >
            <Link
              href={`/${lang}/posts/${post.slug}`}
              className={
                post.metadata.thumbnail
                  ? "grid grid-cols-1 items-stretch gap-4 md:grid-cols-[240px_minmax(0,1fr)] md:gap-x-12"
                  : "block"
              }
            >
              {post.metadata.thumbnail && (
                <div className="relative aspect-video w-full overflow-hidden rounded-[14px] group-hover:-translate-y-1 transition-transform ease-in-out duration-200 md:aspect-auto">
                  <Image
                    src={`/posts/${post.slug}/${post.metadata.thumbnail}`}
                    alt={`${post.slug} thumbnail`}
                    fill
                    sizes="(min-width: 768px) 240px, calc(100vw - 4rem)"
                    priority={index === 0}
                    className="object-cover"
                  />
                </div>
              )}
              <div className="flex min-w-0 flex-col">
                <span className="break-keep text-[20px] leading-[1.4] md:text-4xl font-bold mb-3 transition-colors duration-300 ease-in-out group-hover:text-blue">
                  {post.metadata.title}
                </span>
                <span className="line-clamp-2 text-base leading-6 md:text-lg mb-2.5">
                  {post.metadata.description}
                </span>
                <span className="text-[14px] leading-5 text-slate-400">
                  {fomattedDate(post.metadata.date)}
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
};

export default Article;
