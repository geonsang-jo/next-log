import { cookies } from "next/headers";
import Image from "next/image";
import Link from "next/link";
import dayjs from "dayjs";
import { Post } from "~types/post";
import { getAllPosts } from "~utils/posts";
import i18nConfig from "../../next-i18next.config";
import { Skeleton } from "~components/ui/skeleton";

const getPosts = async (): Promise<Post[]> => {
  const cookieStore = cookies();
  const lang = cookieStore.get("lang")?.value || i18nConfig.defaultLocale;

  const posts = getAllPosts(lang);

  return posts;
};

const Article = async () => {
  const posts = await getPosts();
  const cookieStore = cookies();
  const lang = cookieStore.get("lang")?.value || i18nConfig.defaultLocale;

  const fomattedDate = (date: string) => {
    const formattedDateKr = dayjs(date).format("YYYY년 MM월 DD일");
    const formattedDateEn = dayjs(date).format("MMMM DD, YYYY");

    return lang === "kr" ? formattedDateKr : formattedDateEn;
  };
  return (
    <section className="flex pt-12 pb-14 w-full md:w-[900px] m-auto px-4 md:px-0">
      <ul className="flex flex-col gap-y-10 md:gap-y-20">
        {posts.map((post) => (
          <li
            key={post.slug}
            className="group transition-transform ease-in-out duration-200 "
          >
            <Link
              href={`/posts/${post.slug}`}
              className="flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-x-12"
            >
              {post.metadata.thumbnail && (
                <Image
                  src={`/posts/${post.slug}/${post?.metadata.thumbnail ?? ""}`}
                  alt={`${post.slug} thumbnail`}
                  width={240}
                  height={240}
                  className="rounded-[14px] object-cover group-hover:-translate-y-1 transition-transform ease-in-out duration-200 w-full md:w-[240px] h-auto md:h-[240px]"
                />
              )}
              <div className="flex flex-col">
                <span className="text-2xl md:text-4xl font-bold mb-3 transition-colors duration-300 ease-in-out group-hover:text-blue">
                  {post.metadata.title}
                </span>
                <span className="text-base md:text-lg mb-2.5">
                  {post.metadata.description}
                </span>
                <span className="text-sm text-slate-400">
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
