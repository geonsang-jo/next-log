import { MetadataRoute } from "next";
import { getAllPosts } from "~utils/posts";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://if-geon.xyz";

export default function sitemap(): MetadataRoute.Sitemap {
  const posts = getAllPosts();

  const postEntries: MetadataRoute.Sitemap = posts.map((post) => ({
    url: `${SITE_URL}/posts/${post.slug}`,
    lastModified: new Date(post.metadata.date),
    changeFrequency: "monthly",
    priority: 0.8,
  }));

  return [
    {
      url: `${SITE_URL}/posts`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${SITE_URL}/resume`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    ...postEntries,
  ];
}
