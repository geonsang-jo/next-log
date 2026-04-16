# i18n URL Routing & SEO Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate this Next.js 14 App Router blog from cookie-based language switching to URL-based locale routing (`/ko/...`, `/en/...`) with proper hreflang/canonical/sitemap/OG, rename locale code `kr` → `ko`, and translate two stub English posts.

**Architecture:** Introduce `app/[lang]/` dynamic segment that owns all locale-specific content and layout. Root `app/layout.tsx` becomes minimal (global styles, Analytics, `metadataBase`). Root `app/page.tsx` handles `/` → Accept-Language-based 307 redirect. Delete `middleware.js` entirely; language is expressed by URL, not by cookie. Missing translations produce 404 via `generateStaticParams` filtering.

**Tech Stack:** Next.js 14 App Router, TypeScript, MDX, i18next/react-i18next, Tailwind. No test framework in the codebase — verification is via `yarn build` + manual dev checks (final chunk).

**Spec reference:** `docs/superpowers/specs/2026-04-16-i18n-url-routing-design.md`

---

## Implementation notes (read before starting)

- **Commit cadence:** Every task ends with a commit. Commits should be small and easy to revert. No "Co-Authored-By" lines (repo convention).
- **No test framework:** This blog has no Jest/Vitest. "Verification" for each task means: build passes, relevant `curl` or browser check succeeds, or diff against expected output.
- **Ordering matters:** Chunks are ordered so each ends in a known-working state (the app builds and serves pages). Mid-chunk may have transient breaks, but every *chunk boundary* must build cleanly.
- **Branch:** Work on the current branch (`held-study` worktree). Do NOT merge to main during this plan.
- **Dev server:** Run `yarn dev` on port 4000 (configured in `package.json`).
- **Clear dev cookies:** The old codebase sets a `lang` cookie. If testing in a browser that previously used the site, clear cookies for `localhost:4000` before boundary checks. (Task 1.4 also invalidates stale `kr` cookies server-side.)

---

## Chunk 1: Locale code migration (`kr` → `ko`)

**Purpose:** Rename every `kr` literal/file/reference in the codebase to `ko`. The app continues to use cookie-based routing at the end of this chunk — no URL structure changes yet. Every file that mentions `kr` gets updated so the chunk boundary leaves the app fully working with the new locale code.

### Task 1.1: Rename post MDX files `.kr.mdx` → `.ko.mdx`

**Files:**
- Rename: `app/posts/ai-review-bot-evolution/index.kr.mdx` → `index.ko.mdx`
- Rename: `app/posts/future-oriented-frontend-architecture/index.kr.mdx` → `index.ko.mdx`
- Rename: `app/posts/journey-zustand/index.kr.mdx` → `index.ko.mdx`
- Rename: `app/posts/migrating-react-to-nextjs/index.kr.mdx` → `index.ko.mdx`
- Rename: `app/posts/type-safe-and-reliable/index.kr.mdx` → `index.ko.mdx`
- Rename: `app/posts/클랩&루비콘회고/index.kr.mdx` → `index.ko.mdx`

- [ ] **Step 1: Rename all 6 post files with git mv**

```bash
cd /Users/marcus/.superset/worktrees/next-log/held-study
git mv "app/posts/ai-review-bot-evolution/index.kr.mdx" "app/posts/ai-review-bot-evolution/index.ko.mdx"
git mv "app/posts/future-oriented-frontend-architecture/index.kr.mdx" "app/posts/future-oriented-frontend-architecture/index.ko.mdx"
git mv "app/posts/journey-zustand/index.kr.mdx" "app/posts/journey-zustand/index.ko.mdx"
git mv "app/posts/migrating-react-to-nextjs/index.kr.mdx" "app/posts/migrating-react-to-nextjs/index.ko.mdx"
git mv "app/posts/type-safe-and-reliable/index.kr.mdx" "app/posts/type-safe-and-reliable/index.ko.mdx"
git mv "app/posts/클랩&루비콘회고/index.kr.mdx" "app/posts/클랩&루비콘회고/index.ko.mdx"
```

Note: The `&` character in `클랩&루비콘회고` is inside double-quotes, which is safe in bash/zsh.

- [ ] **Step 2: Verify renames**

Run: `ls app/posts/*/index.*.mdx`
Expected: 12 files, all with `.ko.mdx` or `.en.mdx` suffix (no `.kr.mdx` remaining).

- [ ] **Step 3: Commit**

```bash
git commit -m "refactor: rename post locale files from kr to ko"
```

### Task 1.2: Rename locale JSON directory `public/locales/kr` → `public/locales/ko`

**Files:**
- Rename: `public/locales/kr/common.json` → `public/locales/ko/common.json`

- [ ] **Step 1: Rename the directory**

```bash
git mv public/locales/kr public/locales/ko
```

- [ ] **Step 2: Verify**

Run: `ls public/locales/`
Expected: Two directories `en/` and `ko/`. No `kr/`.

- [ ] **Step 3: Commit**

```bash
git commit -m "refactor: rename public/locales/kr to ko"
```

### Task 1.3: Update `next-i18next.config.js` to `ko` + default `en`

**Files:**
- Modify: `next-i18next.config.js` (entire file)

- [ ] **Step 1: Replace the config file contents**

Replace entire contents of `next-i18next.config.js` with:

```js
const i18nConfig = {
  locales: ["ko", "en"],
  defaultLocale: "en",
};

module.exports = i18nConfig;
```

- [ ] **Step 2: Verify**

Run: `cat next-i18next.config.js`
Expected: Shows `locales: ["ko", "en"]` and `defaultLocale: "en"`.

- [ ] **Step 3: Commit**

```bash
git add next-i18next.config.js
git commit -m "refactor: update i18n config to ko + default en"
```

### Task 1.4: Update `middleware.js` to use `ko` + invalidate stale `kr` cookies

**Purpose:** Keep existing cookie-based routing working with the new locale code throughout Chunk 1. Critically, existing users may already have a `lang=kr` cookie from prior sessions — the middleware must translate that to `ko` so `getPostBySlug` does not crash on a missing `index.kr.mdx` file.

**Files:**
- Modify: `middleware.js` (entire file)

- [ ] **Step 1: Replace entire file contents**

Replace `middleware.js` with:

```js
import { NextResponse } from "next/server";

export function middleware(request) {
  const langCookie = request.cookies.get("lang")?.value;

  // Migrate stale "kr" cookies from previous versions → "ko"
  if (langCookie === "kr") {
    const response = NextResponse.next();
    response.cookies.set("lang", "ko", {
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
    });
    return response;
  }

  if (langCookie === "ko" || langCookie === "en") {
    return NextResponse.next();
  }

  // First visit (no/invalid cookie): detect from Accept-Language
  const acceptLanguage = request.headers.get("accept-language") || "";
  const detectedLang = acceptLanguage.toLowerCase().startsWith("ko")
    ? "ko"
    : "en";

  const response = NextResponse.next();
  response.cookies.set("lang", detectedLang, {
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  });

  return response;
}

export const config = {
  matcher: ["/((?!api|_next|static|favicon.ico).*)"],
};
```

Changes from the original:
- Treats only `"ko"` or `"en"` as valid cached cookie values (was: any truthy value)
- Migrates legacy `"kr"` cookie to `"ko"`
- Detection default flipped to `"en"` (matches new `defaultLocale: "en"`) with Korean opt-in (was: default `"kr"` with English opt-in)

- [ ] **Step 2: Verify the edit**

Run: `grep -A 2 "langCookie === \"kr\"" middleware.js`
Expected: Shows the migration block.

- [ ] **Step 3: Commit**

```bash
git add middleware.js
git commit -m "refactor: middleware uses ko + migrates stale kr cookies"
```

### Task 1.5: Update `types/translation.ts` to use `ko`

**Files:**
- Modify: `types/translation.ts:1`

- [ ] **Step 1: Replace the type definition**

Replace the single line in `types/translation.ts` with:

```ts
export type Languages = "en" | "ko";
```

- [ ] **Step 2: Verify**

Run: `cat types/translation.ts`
Expected: `export type Languages = "en" | "ko";`

- [ ] **Step 3: Commit**

```bash
git add types/translation.ts
git commit -m "refactor: Languages type uses ko instead of kr"
```

### Task 1.6: Update `LangController` button handler to use `ko`

**Files:**
- Modify: `app/components/header/toggle/LangController/index.tsx:41`

- [ ] **Step 1: Find the kr reference**

Run: `grep -n '"kr"' app/components/header/toggle/LangController/index.tsx`
Expected: One match on the `changeLanguage("kr")` onClick for the 한국어 button.

- [ ] **Step 2: Replace**

In `app/components/header/toggle/LangController/index.tsx`, find:

```tsx
<Button variant={"ghost"} onClick={() => changeLanguage("kr")}>
  한국어
</Button>
```

Replace with:

```tsx
<Button variant={"ghost"} onClick={() => changeLanguage("ko")}>
  한국어
</Button>
```

- [ ] **Step 3: Verify no more `"kr"` string literals in the file**

Run: `grep '"kr"' app/components/header/toggle/LangController/index.tsx`
Expected: No output.

- [ ] **Step 4: Commit**

```bash
git add app/components/header/toggle/LangController/index.tsx
git commit -m "refactor: LangController uses ko locale code"
```

### Task 1.7: Update `lang === "kr"` date format comparisons

**Files:**
- Modify: `app/posts/page.tsx:38`
- Modify: `app/posts/[slug]/page.tsx:28`

- [ ] **Step 1: Find all `lang === "kr"` occurrences**

Run: `grep -rn 'lang === "kr"' app/`
Expected: Two matches (one per file above).

- [ ] **Step 2: Replace in `app/posts/page.tsx`**

Find:

```tsx
return lang === "kr" ? formattedDateKr : formattedDateEn;
```

Replace with:

```tsx
return lang === "ko" ? formattedDateKr : formattedDateEn;
```

- [ ] **Step 3: Replace in `app/posts/[slug]/page.tsx`**

Find:

```tsx
return lang === "kr" ? formattedDateKr : formattedDateEn;
```

Replace with:

```tsx
return lang === "ko" ? formattedDateKr : formattedDateEn;
```

- [ ] **Step 4: Verify no remaining matches**

Run: `grep -rn '"kr"' app/`
Expected: No output. (All `kr` references in `app/` are gone.)

- [ ] **Step 5: Commit**

```bash
git add app/posts/page.tsx "app/posts/[slug]/page.tsx"
git commit -m "refactor: lang comparisons use ko instead of kr"
```

### Task 1.8: Chunk 1 boundary verification

- [ ] **Step 1: Clean build artifacts and build**

```bash
rm -rf .next
yarn build
```

Expected: Build completes successfully. No errors about missing `kr` locale files.

- [ ] **Step 2: Start dev server**

```bash
yarn dev
```

(Leave running in a terminal; proceed to Step 3 in the browser.)

- [ ] **Step 3: Clear browser cookies for `localhost:4000`**

In Chrome/Firefox DevTools → Application → Cookies → clear all for `http://localhost:4000`.

- [ ] **Step 4: Manual verification**

Visit in the browser:

1. `http://localhost:4000/posts` → post list renders (English default)
2. Click language switcher → 한국어 → page reloads showing Korean content
3. Click language switcher → English → page reloads showing English content
4. Click any post link → post detail renders in the selected language
5. Date format changes with language (Korean: "YYYY년 MM월 DD일", English: "MMMM DD, YYYY")

All of the above should succeed. If any fails, revisit Tasks 1.1–1.7 before proceeding to Chunk 2.

- [ ] **Step 5: Stop dev server**

`Ctrl+C` in the terminal running `yarn dev`.

---

## Chunk 2: Data layer refactor (`posts.ts` + `i18n.ts` signature)

**Purpose:** Refactor the post data layer and i18n initialization to match the shapes that the new `[lang]` routing will need. After this chunk, the app still uses cookie-based routing, but `getPostBySlug` returns `null` on missing translations, a new `getAvailableLocales` helper exists, and `initTranslations` accepts `lang` as its first parameter. This chunk is a pure refactor — no URL changes.

### Task 2.1: Refactor `app/utils/posts.ts`

**Files:**
- Modify: `app/utils/posts.ts` (entire file)

- [ ] **Step 1: Replace entire file contents**

Replace `app/utils/posts.ts` with:

```ts
import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { Post, PostMetadata } from "~types/post";
import i18nConfig from "../../next-i18next.config";

const postsDirectory = path.join(process.cwd(), "app/posts");

export function getPostSlugs() {
  return fs.readdirSync(postsDirectory).filter((file) => {
    const fullPath = path.join(postsDirectory, file);
    const stat = fs.statSync(fullPath);
    return stat.isDirectory() && file !== "[slug]";
  });
}

function resolvePostPath(slug: string, lang: string): string | null {
  const decodedSlug = decodeURIComponent(slug);
  const realSlug = decodedSlug.replace(/\.mdx?$/, "");
  const slugDirectoryPath = path.join(postsDirectory, realSlug);

  const mdxPath = path.join(slugDirectoryPath, `index.${lang}.mdx`);
  if (fs.existsSync(mdxPath)) return mdxPath;

  const mdPath = path.join(slugDirectoryPath, `index.${lang}.md`);
  if (fs.existsSync(mdPath)) return mdPath;

  return null;
}

export function getPostBySlug(slug: string, lang?: string): Post | null {
  const detectedLanguage = lang || i18nConfig.defaultLocale;
  const fullPath = resolvePostPath(slug, detectedLanguage);
  if (!fullPath) return null;

  const fileContents = fs.readFileSync(fullPath, "utf8");
  const { data, content } = matter(fileContents);

  if (data.date instanceof Date) {
    data.date = data.date.toISOString();
  }

  const decodedSlug = decodeURIComponent(slug).replace(/\.mdx?$/, "");
  return { slug: decodedSlug, metadata: data as PostMetadata, content };
}

export function getAvailableLocales(slug: string): ("ko" | "en")[] {
  const locales: ("ko" | "en")[] = [];
  if (resolvePostPath(slug, "ko")) locales.push("ko");
  if (resolvePostPath(slug, "en")) locales.push("en");
  return locales;
}

export function getAllPosts(lang?: string): Post[] {
  const slugs = getPostSlugs();
  const detectedLanguage = lang || i18nConfig.defaultLocale;

  const posts: Post[] = slugs
    .map((slug) => getPostBySlug(slug, detectedLanguage))
    .filter((post): post is Post => post !== null);

  posts.sort((post1, post2) => {
    const date1 = new Date(post1.metadata.date);
    const date2 = new Date(post2.metadata.date);
    return date2.getTime() - date1.getTime();
  });

  return posts;
}
```

Changes from the original:
- New private helper `resolvePostPath(slug, lang)` returns the file path if it exists, otherwise `null`
- `getPostBySlug` returns `null` when the file does not exist (was: crashed inside `fs.readFileSync`)
- `getPostBySlug` return type is `Post | null`
- New exported helper `getAvailableLocales(slug)` returns locales whose files exist on disk
- `getAllPosts` filters out posts missing the requested locale

- [ ] **Step 2: Update the single caller that relied on `getPostBySlug` throwing**

In `app/posts/[slug]/page.tsx`, find the wrapper:

```tsx
const getPost = (slug: string | undefined, lang: string): Post => {
  if (!slug || typeof slug !== "string") {
    throw new Response("Not Found", { status: 404 });
  }

  return getPostBySlug(slug, lang);
};
```

Replace with:

```tsx
import { notFound } from "next/navigation";

const getPost = (slug: string | undefined, lang: string): Post => {
  if (!slug || typeof slug !== "string") {
    notFound();
  }
  const post = getPostBySlug(slug, lang);
  if (!post) notFound();
  return post;
};
```

If `notFound` is already imported, don't duplicate the import.

- [ ] **Step 3: Verify build**

```bash
rm -rf .next
yarn build
```

Expected: Build succeeds. Type-check should pass (the caller now handles `null`).

- [ ] **Step 4: Commit**

```bash
git add app/utils/posts.ts "app/posts/[slug]/page.tsx"
git commit -m "refactor: getPostBySlug returns null; add getAvailableLocales"
```

### Task 2.2: Refactor `i18n.ts` signature to accept `lang`

**Files:**
- Modify: `i18n.ts` (entire file)

- [ ] **Step 1: Replace entire contents**

Replace `i18n.ts` with:

```ts
import { createInstance, i18n } from "i18next";
import { initReactI18next } from "react-i18next/initReactI18next";
import resourcesToBackend from "i18next-resources-to-backend";
import i18nConfig from "./next-i18next.config";

const namespace = "common";

export default async function initTranslations(
  lang?: string,
  i18nInstance?: i18n,
  resources?: any
) {
  i18nInstance = i18nInstance || createInstance();
  i18nInstance.use(initReactI18next);

  if (!resources) {
    i18nInstance.use(
      resourcesToBackend(
        (language: string) =>
          import(`./public/locales/${language}/${namespace}.json`)
      )
    );
  }

  await i18nInstance.init({
    lng: lang || i18nConfig.defaultLocale,
    resources,
    fallbackLng: i18nConfig.defaultLocale,
    supportedLngs: i18nConfig.locales,
    defaultNS: namespace,
    fallbackNS: namespace,
    ns: namespace,
    preload: resources ? [] : [lang || i18nConfig.defaultLocale],
  });

  return {
    i18n: i18nInstance,
    resources: i18nInstance.services.resourceStore.data,
    t: i18nInstance.t,
  };
}
```

Changes from the original:
- First parameter is `lang?: string` (was: `i18nInstance`)
- Removes `LanguageDetector` usage (no more cookie/navigator detection)
- Removes `js-cookie` import and `Cookies.set` call
- `preload` is `[lang]` when provided (avoids loading both locales per request)
- Removes the `detection` config block

- [ ] **Step 2: Update `app/core/translation/translationProvider.tsx` to accept and forward `lang`**

Replace entire contents of `app/core/translation/translationProvider.tsx` with:

```tsx
"use client";

import React, { PropsWithChildren } from "react";
import { I18nextProvider } from "react-i18next";
import { createInstance } from "i18next";
import initTranslations from "../../../i18n";

interface TranslationProviderProps {
  lang?: string;
  resources?: any;
}

// eslint-disable-next-line react/display-name
const TranslationProvider = React.memo<
  PropsWithChildren<TranslationProviderProps>
>(({ children, lang, resources }) => {
  const i18n = createInstance();
  initTranslations(lang, i18n, resources);
  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
});

export default TranslationProvider;
```

Changes: added optional `lang` prop, forwards it as the new first argument to `initTranslations`.

- [ ] **Step 3: Update `app/layout.tsx` to pass `lang` to `TranslationProvider`**

In `app/layout.tsx`, find:

```tsx
<TranslationProvider resources={resources}>
```

Replace with:

```tsx
<TranslationProvider lang={detectedLanguage} resources={resources}>
```

Also, in the same file, find where `initTranslations` is called:

```tsx
const { resources, i18n } = await initTranslations();
```

Replace with:

```tsx
const { resources, i18n } = await initTranslations(
  cookies().get("lang")?.value
);
```

(This keeps Chunk 2 working with cookie-based routing; Chunk 3 will replace this entire layout.)

- [ ] **Step 4: Verify build**

```bash
rm -rf .next
yarn build
```

Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add i18n.ts app/core/translation/translationProvider.tsx app/layout.tsx
git commit -m "refactor: initTranslations takes lang as first parameter"
```

### Task 2.3: Chunk 2 boundary verification

- [ ] **Step 1: Start dev server**

```bash
yarn dev
```

- [ ] **Step 2: Clear cookies and verify**

Clear `localhost:4000` cookies in browser DevTools, then:

1. `http://localhost:4000/posts` → post list renders in default language
2. Toggle language switcher → content switches correctly
3. Navigate to a post detail → detail renders with correct language
4. Visit a slug that doesn't exist (e.g., `http://localhost:4000/posts/bogus-slug`) → 404 page (was: throw previously)

- [ ] **Step 3: Stop dev server**

---

## Chunk 3: URL-based routing (`[lang]` segment)

**Purpose:** Move all locale-aware pages under `app/[lang]/` and replace cookie-driven logic with URL-driven logic. At end of chunk, URLs are `/ko/...` and `/en/...`; root `/` redirects based on Accept-Language; middleware still runs but is no longer the source of truth for language (deletion is in Chunk 4).

### Task 3.1: Create `app/[lang]/layout.tsx`

**Files:**
- Create: `app/[lang]/layout.tsx`

- [ ] **Step 1: Create directory and file**

```bash
mkdir -p "app/[lang]"
```

Create `app/[lang]/layout.tsx` with:

```tsx
import { Metadata } from "next";
import { notFound } from "next/navigation";
import Header from "~components/header";
import ThemeProvider from "~styles/themeProvider";
import TranslationProvider from "~core/translation/translationProvider";
import initTranslations from "../../i18n";

const SUPPORTED_LOCALES = ["ko", "en"] as const;
type Locale = (typeof SUPPORTED_LOCALES)[number];

export async function generateStaticParams() {
  return SUPPORTED_LOCALES.map((lang) => ({ lang }));
}

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://if-geon.xyz";

export async function generateMetadata({
  params,
}: {
  params: { lang: string };
}): Promise<Metadata> {
  const lang = params.lang as Locale;
  if (!SUPPORTED_LOCALES.includes(lang)) return {};

  const ogLocale = lang === "ko" ? "ko_KR" : "en_US";
  const ogAlternate = lang === "ko" ? "en_US" : "ko_KR";
  const description =
    lang === "ko"
      ? "웹 개발과 기타 주제에 관한 블로그"
      : "A blog about web development and other stuff";

  return {
    title: {
      default: "Geon log",
      template: "%s | Geon log",
    },
    description,
    openGraph: {
      type: "website",
      locale: ogLocale,
      alternateLocale: ogAlternate,
      url: `${SITE_URL}/${lang}`,
      siteName: "Geon log",
      title: "Geon log",
      description,
    },
    twitter: {
      card: "summary_large_image",
      title: "Geon log",
      description,
    },
    alternates: {
      canonical: `/${lang}`,
      languages: {
        ko: "/ko",
        en: "/en",
        "x-default": "/en",
      },
    },
  };
}

const LangLayout = async ({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { lang: string };
}) => {
  const lang = params.lang as Locale;
  if (!SUPPORTED_LOCALES.includes(lang)) notFound();

  const { resources } = await initTranslations(lang);

  return (
    <html suppressHydrationWarning lang={lang}>
      <body>
        <TranslationProvider lang={lang} resources={resources}>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <Header />
            <div className="flex w-full justify-center">
              <main className="container relative lg:px-8">{children}</main>
            </div>
          </ThemeProvider>
        </TranslationProvider>
      </body>
    </html>
  );
};

export default LangLayout;
```

- [ ] **Step 2: Note: do NOT build yet**

This file compiles, but the app will not serve any `[lang]/...` pages until Tasks 3.2–3.4 move them in. Do not run `yarn build` between 3.1 and 3.5 — expect transient issues.

- [ ] **Step 3: Commit**

```bash
git add "app/[lang]/layout.tsx"
git commit -m "feat: add [lang] dynamic segment layout"
```

### Task 3.2: Move `app/posts/page.tsx` → `app/[lang]/posts/page.tsx`

**Files:**
- Move + edit: `app/posts/page.tsx` → `app/[lang]/posts/page.tsx`

- [ ] **Step 1: Move the file**

```bash
mkdir -p "app/[lang]/posts"
git mv app/posts/page.tsx "app/[lang]/posts/page.tsx"
```

- [ ] **Step 2: Replace the moved file's contents**

Replace `app/[lang]/posts/page.tsx` with:

```tsx
import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import dayjs from "dayjs";
import { Post } from "~types/post";
import { getAllPosts } from "~utils/posts";
import { Skeleton } from "~components/ui/skeleton";

type Props = { params: { lang: string } };

export function generateMetadata({ params }: Props): Metadata {
  const lang = params.lang;
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
  const lang = params.lang;
  const posts = await getPosts(lang);

  const fomattedDate = (date: string) => {
    const formattedDateKr = dayjs(date).format("YYYY년 MM월 DD일");
    const formattedDateEn = dayjs(date).format("MMMM DD, YYYY");
    return lang === "ko" ? formattedDateKr : formattedDateEn;
  };

  return (
    <section className="flex pt-12 pb-14 w-[900px] m-auto">
      <ul className="flex flex-col gap-y-20">
        <Skeleton className="w-240 h-240" />
        <Skeleton className="w-240 h-240" />
        {posts.map((post) => (
          <li
            key={post.slug}
            className="group transition-transform ease-in-out duration-200 "
          >
            <Link
              href={`/${lang}/posts/${post.slug}`}
              className="flex items-center gap-x-12"
            >
              {post.metadata.thumbnail && (
                <Image
                  src={`/posts/${post.slug}/${post?.metadata.thumbnail ?? ""}`}
                  alt={`${post.slug} thumbnail`}
                  width={240}
                  height={240}
                  className="rounded-[14px] object-cover group-hover:-translate-y-1 transition-transform ease-in-out duration-200"
                  style={{ width: "240px", height: "240px" }}
                />
              )}
              <div className="flex flex-col">
                <span className="text-4xl font-bold mb-3  transition-colors duration-300 ease-in-out group-hover:text-blue">
                  {post.metadata.title}
                </span>
                <span className="text-lg mb-2.5">
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
```

Changes from the original:
- Reads `lang` from `params` (no `cookies()` call)
- Post links use `/${lang}/posts/${slug}` (was: `/posts/${slug}`)
- `generateMetadata` exports canonical and hreflang

- [ ] **Step 3: Commit**

```bash
git commit -am "feat: move posts index page under [lang] segment"
```

### Task 3.3: Move `app/posts/[slug]/page.tsx` → `app/[lang]/posts/[slug]/page.tsx`

**Files:**
- Move + edit: `app/posts/[slug]/page.tsx` → `app/[lang]/posts/[slug]/page.tsx`

- [ ] **Step 1: Move the file**

```bash
mkdir -p "app/[lang]/posts/[slug]"
git mv "app/posts/[slug]/page.tsx" "app/[lang]/posts/[slug]/page.tsx"
```

- [ ] **Step 2: Replace contents**

Replace `app/[lang]/posts/[slug]/page.tsx` with:

```tsx
import Image from "next/image";
import { notFound } from "next/navigation";
import dayjs from "dayjs";

import { getPostBySlug, getAllPosts, getAvailableLocales } from "~utils/posts";
import { MdxRenderer } from "~components/mdx/MdxRenderer";

type Props = { params: { lang: string; slug: string } };

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://if-geon.xyz";

const PostPage = async ({ params }: Props) => {
  const { lang, slug } = params;
  const post = getPostBySlug(slug, lang);
  if (!post) notFound();

  const fomattedDate = (date: string) => {
    const formattedDateKr = dayjs(date).format("YYYY년 MM월 DD일");
    const formattedDateEn = dayjs(date).format("MMMM DD, YYYY");
    return lang === "ko" ? formattedDateKr : formattedDateEn;
  };

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.metadata.title,
    description: post.metadata.description,
    datePublished: new Date(post.metadata.date).toISOString(),
    inLanguage: lang === "ko" ? "ko-KR" : "en-US",
    author: {
      "@type": "Person",
      name: "Geon",
      url: `${SITE_URL}/${lang}/resume`,
    },
    url: `${SITE_URL}/${lang}/posts/${post.slug}`,
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

export async function generateMetadata({ params }: Props) {
  const { lang, slug } = params;
  const post = getPostBySlug(slug, lang);
  if (!post) return {};

  const availableLocales = getAvailableLocales(slug);

  const highlightParam = post.metadata.highlightWord
    ? `&highlightWord=${encodeURIComponent(post.metadata.highlightWord)}`
    : "";
  const ogImageUrl = post.metadata.thumbnail
    ? `${SITE_URL}/posts/${slug}/${post.metadata.thumbnail}`
    : `${SITE_URL}/api/og/${slug}?title=${encodeURIComponent(
        post.metadata.title
      )}${highlightParam}`;

  const languages: Record<string, string> = {};
  if (availableLocales.includes("ko")) languages.ko = `/ko/posts/${slug}`;
  if (availableLocales.includes("en")) languages.en = `/en/posts/${slug}`;
  languages["x-default"] = availableLocales.includes("en")
    ? `/en/posts/${slug}`
    : `/ko/posts/${slug}`;

  const ogLocale = lang === "ko" ? "ko_KR" : "en_US";
  const ogAlternate = lang === "ko" ? "en_US" : "ko_KR";

  return {
    title: post.metadata.title,
    description: post.metadata.description,
    authors: {
      name: "Geon",
      url: `${SITE_URL}/${lang}/resume`,
    },
    alternates: {
      canonical: `/${lang}/posts/${slug}`,
      languages,
    },
    openGraph: {
      type: "article",
      locale: ogLocale,
      alternateLocale: ogAlternate,
      title: post.metadata.title,
      description: post.metadata.description,
      url: `/${lang}/posts/${slug}`,
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
  const locales = ["ko", "en"] as const;
  const params: { lang: string; slug: string }[] = [];
  for (const lang of locales) {
    const posts = getAllPosts(lang);
    for (const post of posts) {
      params.push({ lang, slug: post.slug });
    }
  }
  return params;
};
```

Changes from the original:
- Reads `lang` + `slug` from params (no `cookies()` call)
- Calls `getPostBySlug` and uses `notFound()` when null (was: wrapper that threw)
- Uses `getAvailableLocales` for hreflang generation
- Resume URL in JSON-LD is locale-prefixed
- JSON-LD includes `inLanguage`
- `generateStaticParams` emits `{lang, slug}` pairs, filtered by locale availability via `getAllPosts(lang)`
- OG includes `locale` + `alternateLocale`

- [ ] **Step 3: Verify post content directories are still in place**

Run: `ls app/posts/`
Expected: Only the 6 post content directories (e.g., `ai-review-bot-evolution/`, `journey-zustand/`, etc.). No `page.tsx` or `[slug]/` subdirectory.

> Important: The post content directories (`app/posts/*/index.ko.mdx`) must remain — `getPostBySlug` reads from `app/posts` via `path.join(process.cwd(), "app/posts")`. Do NOT run `rm -rf app/posts`.

- [ ] **Step 4: Commit**

```bash
git commit -am "feat: move post detail page under [lang] segment"
```

### Task 3.4: Move `app/resume/` → `app/[lang]/resume/`

**Files:**
- Move: `app/resume/page.tsx` → `app/[lang]/resume/page.tsx`

- [ ] **Step 1: Move the directory**

```bash
git mv app/resume "app/[lang]/resume"
```

- [ ] **Step 2: Verify no hardcoded internal links in `resume/page.tsx`**

Run: `grep -n 'href="/' "app/[lang]/resume/page.tsx"`
Expected: No matches. The current resume page uses no internal navigation (verified at plan-writing time — it only renders resume info via `resumeInfo` metadata and two sub-components).

If the above `grep` produces output, update each `href="/posts"` → `href={`/${lang}/posts`}` and similar. Then add `params` to the component:

```tsx
function Resume({ params }: { params: { lang: string } }) {
```

Otherwise, the file needs no edits because it has no internal links.

- [ ] **Step 3: Commit**

```bash
git commit -am "feat: move resume page under [lang] segment"
```

### Task 3.5: Update `Header` nav links to be locale-aware

**Files:**
- Modify: `app/components/header/nav/index.tsx`
- Modify: `app/components/header/navSheet/index.tsx`

**Purpose:** The `Header` component is rendered inside `[lang]/layout.tsx`. Its nested `PageNav` and `NavSheet` components currently hardcode `/posts` and `/resume`. Update them to extract the current locale from the URL via `usePathname` and prefix links accordingly.

- [ ] **Step 1: Replace `app/components/header/nav/index.tsx`**

Replace entire contents with:

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import useIsRouteActive from "~hooks/useIsActive";
import { cn } from "~lib/utils";
import NavSheet from "../navSheet";

function extractLang(pathname: string): "ko" | "en" {
  const seg = pathname.split("/")[1];
  return seg === "ko" ? "ko" : "en";
}

function PageNav() {
  const pathname = usePathname();
  const lang = extractLang(pathname);
  const isArticleActive = useIsRouteActive(`/${lang}/posts`);
  const isResumeActive = useIsRouteActive(`/${lang}/resume`);

  return (
    <div className="md:flex">
      <Link
        href={`/${lang}/posts`}
        className="hidden md:flex mr-6 items-center space-x-2"
      >
        <span className="font-bold sm:inline-block">Geon-log</span>
      </Link>
      <nav className="hidden md:flex gap-6 items-center font-medium text-sm">
        <Link
          href={`/${lang}/posts`}
          className={cn(
            "transition-colors hover:text-foreground/80 text-foreground/60",
            isArticleActive && "text-foreground"
          )}
        >
          Posts
        </Link>
        <Link
          href={`/${lang}/resume`}
          className={cn(
            "transition-colors hover:text-foreground/80 text-foreground/60",
            isResumeActive && "text-foreground"
          )}
        >
          Resume
        </Link>
      </nav>
      <NavSheet />
    </div>
  );
}

export default PageNav;
```

Changes:
- Added `"use client";` directive (needed for `usePathname`)
- Added `usePathname` import and `extractLang` helper
- Links use `/${lang}/posts` and `/${lang}/resume` instead of hardcoded `/posts` and `/resume`
- `useIsRouteActive` receives the locale-prefixed path

- [ ] **Step 2: Replace `app/components/header/navSheet/index.tsx`**

Replace entire contents with:

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Logo from "~components/icon/logo";
import MenuIcon from "~components/icon/menuIcon";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "~components/ui/sheet";

function extractLang(pathname: string): "ko" | "en" {
  const seg = pathname.split("/")[1];
  return seg === "ko" ? "ko" : "en";
}

function NavSheet() {
  const pathname = usePathname();
  const lang = extractLang(pathname);

  return (
    <Sheet>
      <SheetTrigger className="inline-flex items-center justify-center whitespace-nowrap rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover:text-accent-foreground h-9 py-2 mr-2 px-0 text-base hover:bg-transparent focus-visible:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 md:hidden">
        <MenuIcon />
      </SheetTrigger>
      <SheetContent side={"left"}>
        <SheetHeader className="text-left">
          <SheetTitle>
            <Link className="flex items-center" href={`/${lang}/posts`}>
              <Logo className="mr-2 h-4 w-4" />
              <span className="font-bold">next log</span>
            </Link>
          </SheetTitle>
          <SheetDescription className="relative overflow-hidden my-4 h-[calc(100vh-8rem)] pb-10 pl-6">
            <div className="flex flex-col space-y-3">
              <Link href={`/${lang}/posts`}>Article</Link>
              <Link href={`/${lang}/resume`}>Resume</Link>
              <Link href="https://github.com/geonsang-jo" target="_blank">
                GitHub
              </Link>
              <Link
                href={"https://www.linkedin.com/in/geonsang-jo-5a570612b/"}
                target="_blank"
              >
                LinkdeIn
              </Link>
            </div>
          </SheetDescription>
        </SheetHeader>
      </SheetContent>
    </Sheet>
  );
}

export default NavSheet;
```

Changes:
- Added `"use client";` directive
- Added `usePathname` + `extractLang`
- Logo link: `/` → `/${lang}/posts`
- Article link: `/article` → `/${lang}/posts` (the original `/article` was a dead link — corrected to match the actual posts route)
- Resume link: `/resume` → `/${lang}/resume`
- External links unchanged

- [ ] **Step 3: Update `LangController` to URL-swap instead of cookie-set**

Replace entire contents of `app/components/header/toggle/LangController/index.tsx` with:

```tsx
"use client";

import { usePathname, useRouter } from "next/navigation";
import LangIcon from "~components/icon/langIcon";
import { Button } from "~components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~components/ui/dropdown-menu";
import { Languages } from "~types/translation";

const LanguageSwitcher = () => {
  const pathname = usePathname();
  const router = useRouter();

  const changeLanguage = (target: Languages) => {
    const segments = pathname.split("/");
    if (segments[1] === target) return;
    segments[1] = target;
    router.push(segments.join("/") || "/");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger>
        <Button variant={"ghost"} className="w-9 shrink-9 px-0">
          <LangIcon className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem>
          <Button variant={"ghost"} onClick={() => changeLanguage("en")}>
            English
          </Button>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Button variant={"ghost"} onClick={() => changeLanguage("ko")}>
            한국어
          </Button>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default LanguageSwitcher;
```

Changes:
- Removed `js-cookie`, `Cookies.set`, `window.location.reload`, and `i18n.changeLanguage` calls
- Uses `usePathname` + `useRouter` to swap the first path segment
- Short-circuits if already on the target locale

> Note: Currently `LangController` does not know whether the target locale exists for the current post (e.g., clicking "English" on a Korean-only post). After Chunk 5's translations, all 6 posts will have both locales, so this is a no-op concern. If a future stub workflow is added, pass `availableLocales` as a prop and disable the unavailable option.

- [ ] **Step 4: Commit**

```bash
git add app/components/header/nav/index.tsx app/components/header/navSheet/index.tsx app/components/header/toggle/LangController/index.tsx
git commit -m "feat: header nav + lang switcher derive locale from URL"
```

### Task 3.6: Replace root `app/layout.tsx` with minimal version

**Files:**
- Modify: `app/layout.tsx` (entire file)

- [ ] **Step 1: Replace contents**

Replace `app/layout.tsx` with:

```tsx
import "~styles/globals.css";
import { Metadata } from "next";
import { Analytics } from "@vercel/analytics/react";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://if-geon.xyz";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  verification: {
    google: "IvtO23xqXBRCTsg8vvSstjRpZT-bQJ-6Z5620rO6gHU",
  },
};

const RootLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <>
      {children}
      <Analytics />
    </>
  );
};

export default RootLayout;
```

Changes:
- Removed `<html>` and `<body>` (moved to `[lang]/layout.tsx` and `not-found.tsx`)
- Removed i18n init, `cookies()` call, `TranslationProvider`, `ThemeProvider`, `Header`
- Kept `metadataBase` and `verification.google` (both global)
- Kept `Analytics`

- [ ] **Step 2: Commit**

```bash
git add app/layout.tsx
git commit -m "refactor: strip locale logic from root layout"
```

### Task 3.7: Create `app/page.tsx` (root redirect)

**Files:**
- Create: `app/page.tsx`
- Modify: `next.config.js` (remove existing `/ → /posts` redirect)

- [ ] **Step 1: Create the root page**

Create `app/page.tsx` with:

```tsx
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default function RootPage() {
  const acceptLang = headers().get("accept-language") || "";
  const lang = acceptLang.toLowerCase().startsWith("ko") ? "ko" : "en";
  redirect(`/${lang}/posts`);
}
```

Returns a 307 via `next/navigation`'s `redirect()`.

- [ ] **Step 2: Remove the old `/ → /posts` redirect in `next.config.js`**

In `next.config.js`, find:

```js
async redirects() {
  return [
    {
      source: "/",
      destination: "/posts",
      permanent: true,
    },
  ];
},
```

Replace the body of `redirects()` with an empty array:

```js
async redirects() {
  return [];
},
```

- [ ] **Step 3: Commit**

```bash
git add app/page.tsx next.config.js
git commit -m "feat: root / redirects to /ko or /en via Accept-Language"
```

### Task 3.8: Create `app/not-found.tsx`

**Files:**
- Create: `app/not-found.tsx`

- [ ] **Step 1: Create the file**

Create `app/not-found.tsx` with:

```tsx
import Link from "next/link";

export default function NotFound() {
  return (
    <html lang="en">
      <body>
        <div style={{ padding: "4rem", textAlign: "center" }}>
          <h1>404 — Not Found</h1>
          <p>The page you requested does not exist.</p>
          <p>
            <Link href="/en/posts">Go to English posts</Link>
            {" · "}
            <Link href="/ko/posts">한국어 포스트로 이동</Link>
          </p>
        </div>
      </body>
    </html>
  );
}
```

Note: The root `layout.tsx` no longer renders `<html>`/`<body>`, so this file provides its own document structure.

- [ ] **Step 2: Commit**

```bash
git add app/not-found.tsx
git commit -m "feat: add top-level not-found page"
```

### Task 3.9: Chunk 3 boundary verification

- [ ] **Step 1: Clean build and build**

```bash
rm -rf .next
yarn build
```

Expected: Build succeeds. Output includes static params like `/ko/posts/journey-zustand`, `/en/posts/journey-zustand`, etc.

- [ ] **Step 2: Start dev server and verify URLs**

```bash
yarn dev
```

In browser (clear cookies for `localhost:4000` first):

1. `http://localhost:4000/` → 307 to `/en/posts` (if browser is English) or `/ko/posts` (if Korean)
2. `http://localhost:4000/ko/posts` → post list in Korean
3. `http://localhost:4000/en/posts` → post list in English
4. `http://localhost:4000/ko/posts/journey-zustand` → Korean content (this post has full translations)
5. `http://localhost:4000/en/posts/journey-zustand` → English content
6. `http://localhost:4000/ko/resume` → resume page
7. `http://localhost:4000/en/resume` → resume page
8. `http://localhost:4000/fr/posts` → 404
9. `http://localhost:4000/posts` (no locale) → 404
10. Language switcher on `/ko/posts/journey-zustand` → clicking "English" navigates to `/en/posts/journey-zustand`
11. Nav "Posts" link preserves current locale
12. Nav "Resume" link preserves current locale

Note: `/en/posts/ai-review-bot-evolution` still shows stub English content — that's resolved in Chunk 5.

- [ ] **Step 3: Verify HTML source of a post page**

`curl http://localhost:4000/ko/posts/journey-zustand | grep -E "canonical|alternate|og:locale"`

Expected to see:
- `<link rel="canonical" href="/ko/posts/journey-zustand"/>` (or full URL depending on metadataBase)
- `<link rel="alternate" hreflang="ko" href="/ko/posts/journey-zustand"/>`
- `<link rel="alternate" hreflang="en" href="/en/posts/journey-zustand"/>`
- `<link rel="alternate" hreflang="x-default" href="/en/posts/journey-zustand"/>`
- `<meta property="og:locale" content="ko_KR"/>`
- `<meta property="og:locale:alternate" content="en_US"/>`

- [ ] **Step 4: Stop dev server**

---

## Chunk 4: Cleanup (delete middleware, remove dead deps, localized sitemap)

**Purpose:** Remove code that the new URL-based routing makes dead. Update the sitemap to emit localized entries with hreflang alternates. After this chunk, there is no cookie-based logic left in the codebase.

### Task 4.1: Delete `middleware.js`

**Files:**
- Delete: `middleware.js`

- [ ] **Step 1: Delete**

```bash
git rm middleware.js
```

- [ ] **Step 2: Verify no callers import from `middleware.js`**

Run: `grep -r "middleware" app/ i18n.ts next.config.js types/ 2>/dev/null | grep -v "^Binary"`
Expected: No import references (only string mentions in comments/docs if any).

- [ ] **Step 3: Commit**

```bash
git commit -m "chore: delete middleware.js (URL-based routing supersedes it)"
```

### Task 4.2: Remove unused npm dependencies

**Files:**
- Modify: `package.json`
- Modify: `yarn.lock`

- [ ] **Step 1: Remove packages**

```bash
yarn remove js-cookie @types/js-cookie i18next-browser-languagedetector next-i18n-router
```

- [ ] **Step 2: Verify no remaining imports**

```bash
grep -r "js-cookie\|i18next-browser-languagedetector\|next-i18n-router" app/ i18n.ts
```

Expected: No matches.

- [ ] **Step 3: Build to confirm**

```bash
rm -rf .next
yarn build
```

Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add package.json yarn.lock
git commit -m "chore: remove unused i18n dependencies"
```

### Task 4.3: Update `app/sitemap.ts` to emit per-locale entries with hreflang alternates

**Files:**
- Modify: `app/sitemap.ts` (entire file)

- [ ] **Step 1: Replace contents**

Replace `app/sitemap.ts` with:

```ts
import { MetadataRoute } from "next";
import {
  getPostSlugs,
  getAvailableLocales,
  getPostBySlug,
} from "~utils/posts";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://if-geon.xyz";
const LOCALES = ["ko", "en"] as const;

function buildPostAlternates(slug: string): Record<string, string> {
  const available = getAvailableLocales(slug);
  const languages: Record<string, string> = {};
  for (const locale of available) {
    languages[locale] = `${SITE_URL}/${locale}/posts/${slug}`;
  }
  return languages;
}

export default function sitemap(): MetadataRoute.Sitemap {
  const slugs = getPostSlugs();
  const entries: MetadataRoute.Sitemap = [];

  // Posts index per locale
  for (const lang of LOCALES) {
    entries.push({
      url: `${SITE_URL}/${lang}/posts`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
      alternates: {
        languages: {
          ko: `${SITE_URL}/ko/posts`,
          en: `${SITE_URL}/en/posts`,
        },
      },
    });
  }

  // Resume per locale
  for (const lang of LOCALES) {
    entries.push({
      url: `${SITE_URL}/${lang}/resume`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
      alternates: {
        languages: {
          ko: `${SITE_URL}/ko/resume`,
          en: `${SITE_URL}/en/resume`,
        },
      },
    });
  }

  // Posts: one entry per available locale per slug
  for (const slug of slugs) {
    const available = getAvailableLocales(slug);
    if (available.length === 0) continue;

    const alternates = buildPostAlternates(slug);
    // Use the first available locale's file to pull lastModified.
    const samplePost = getPostBySlug(slug, available[0]);
    const lastModified = samplePost
      ? new Date(samplePost.metadata.date)
      : new Date();

    for (const lang of available) {
      entries.push({
        url: `${SITE_URL}/${lang}/posts/${slug}`,
        lastModified,
        changeFrequency: "monthly",
        priority: 0.8,
        alternates: { languages: alternates },
      });
    }
  }

  return entries;
}
```

- [ ] **Step 2: Verify build**

```bash
rm -rf .next
yarn build
```

- [ ] **Step 3: Verify sitemap output**

```bash
yarn dev
# In another terminal:
curl http://localhost:4000/sitemap.xml | head -80
```

Expected: XML output with `<loc>` entries for `/ko/posts`, `/en/posts`, `/ko/resume`, `/en/resume`, and per-locale post URLs. Each URL should have sibling `<xhtml:link rel="alternate" hreflang="ko|en" ... />` entries.

Count expected: 2 (posts index) + 2 (resume) + 6×2 (posts assuming both locales exist post-Chunk 5) = 16 entries. (During Chunk 4 only, the 2 stub English posts won't have English MDX yet, but they *do* have stub files — so 16 even now, though two will point to the stubs. This is OK until Chunk 5 replaces the stubs with real translations.)

- [ ] **Step 4: Stop dev server**

- [ ] **Step 5: Commit**

```bash
git add app/sitemap.ts
git commit -m "feat: sitemap emits per-locale entries with hreflang alternates"
```

### Task 4.4: Chunk 4 boundary verification

- [ ] **Step 1: Full rebuild**

```bash
rm -rf .next node_modules
yarn install
yarn build
```

Expected: Clean install and build. No warnings about removed packages.

- [ ] **Step 2: Start dev server, repeat Chunk 3 verification**

Repeat the 12 manual checks from Task 3.9 Step 2 to confirm nothing regressed.

- [ ] **Step 3: Stop dev server**

---

## Chunk 5: Translations (parallel subagents + self-review passes)

**Purpose:** Replace the two stub English MDX files with real translations. Dispatch two subagents in parallel (one per post) for the translation work. After both return, the main session runs two self-review passes over each translated file, then hands off to human review.

### Task 5.1: Dispatch translation subagents in parallel

**Files (via subagents):**
- Overwrite: `app/posts/ai-review-bot-evolution/index.en.mdx`
- Overwrite: `app/posts/클랩&루비콘회고/index.en.mdx`

- [ ] **Step 1: Dispatch two subagents in a single message (parallel)**

Use `superpowers:dispatching-parallel-agents` pattern. Each subagent receives a Korean MDX source path, a target English MDX path, and the style guide below. Neither subagent touches the other's file.

**Subagent A prompt (ai-review-bot-evolution):**

```
You are a bilingual Korean-English technical translator. Your task is to translate one blog post from Korean to English.

**Source (read this):** /Users/marcus/.superset/worktrees/next-log/held-study/app/posts/ai-review-bot-evolution/index.ko.mdx

**Target (overwrite this):** /Users/marcus/.superset/worktrees/next-log/held-study/app/posts/ai-review-bot-evolution/index.en.mdx

Current target contents are a stub ("English version coming soon"). Replace with a full translation.

## Translation rules

1. Preserve the frontmatter structure. Translate values of `title`, `description`, `introTitle`, `introDesc`, `category` to English. Keep `date`, `tags`, `published` unchanged in value (just translate tag strings where natural).

2. Preserve all heading levels (##, ###, etc.) and their order.

3. Preserve all code blocks VERBATIM. Do not translate any line of code. You may translate single-line comments inside code blocks if they clarify meaning to English readers.

4. Preserve all inline code spans (backtick syntax), all links (`[text](url)`), and all images.

5. Preserve the author's voice: this is a first-person engineering retrospective. Keep sentences informative and grounded, not marketing-speak.

6. Match the tone of the four existing English posts at:
   - /Users/marcus/.superset/worktrees/next-log/held-study/app/posts/journey-zustand/index.en.mdx
   - /Users/marcus/.superset/worktrees/next-log/held-study/app/posts/future-oriented-frontend-architecture/index.en.mdx
   - /Users/marcus/.superset/worktrees/next-log/held-study/app/posts/migrating-react-to-nextjs/index.en.mdx
   - /Users/marcus/.superset/worktrees/next-log/held-study/app/posts/type-safe-and-reliable/index.en.mdx
   Read at least one of these to calibrate tone and heading capitalization conventions.

7. Technical terms: use common English translations. Pick ONE rendering per term and use it consistently throughout the file (e.g., if `리뷰 봇` = "review bot" in the first section, stay with "review bot"; do not alternate with "review assistant").

8. Do NOT add content the Korean original does not have. Do NOT remove sections the Korean original does have.

9. Output only the full MDX file contents written to the target path. No commentary.

## Deliverable

Write the translated file to the target path and return a brief summary (3 lines) of:
- Number of sections translated
- Any sentences where you picked an interpretation that a human may want to reconsider
- Any technical terms you chose that may have better alternatives
```

**Subagent B prompt (클랩&루비콘회고):**

```
You are a bilingual Korean-English technical translator. Your task is to translate one blog post from Korean to English.

**Source (read this):** /Users/marcus/.superset/worktrees/next-log/held-study/app/posts/클랩&루비콘회고/index.ko.mdx

**Target (overwrite this):** /Users/marcus/.superset/worktrees/next-log/held-study/app/posts/클랩&루비콘회고/index.en.mdx

Current target file has English frontmatter but Korean body. Completely overwrite it. Also translate the frontmatter `title` (currently "Lubycon & Clelab 에 대한 회고") to a natural English equivalent such as "Retrospective on Lubycon & Clelab".

## Translation rules

[same as Subagent A — duplicate the 9 rules above]

## Deliverable

[same as Subagent A]
```

- [ ] **Step 2: Wait for both subagents to complete**

They run independently and write directly to disk. When both return, proceed to Step 3.

- [ ] **Step 3: Verify files were written**

```bash
grep -c "coming soon" app/posts/ai-review-bot-evolution/index.en.mdx
```
Expected: `0` (stub text removed).

```bash
head -20 "app/posts/클랩&루비콘회고/index.en.mdx"
```
Expected: English body text, not Korean.

- [ ] **Step 4: Commit the raw translations (before self-review)**

```bash
git add "app/posts/ai-review-bot-evolution/index.en.mdx" "app/posts/클랩&루비콘회고/index.en.mdx"
git commit -m "feat: draft English translations (pre-review)"
```

### Task 5.2: Self-review Pass 1 — Accuracy & Fidelity

**Purpose:** Diff each English translation against its Korean source. Catch silent omissions, inconsistent term usage, modified code blocks, dropped frontmatter fields, and invented content.

**Files reviewed:**
- `app/posts/ai-review-bot-evolution/index.en.mdx`
- `app/posts/클랩&루비콘회고/index.en.mdx`

- [ ] **Step 1: Read both Korean sources and both English targets**

Use `Read` tool on all four files. Keep them in context for the comparison.

- [ ] **Step 2: For each file, perform the Pass 1 checklist**

For each post:

1. Count `##` and `###` headings in Korean source, count in English target. Match?
2. Count fenced code blocks (```): match?
3. Diff each code block content: verbatim (code lines unchanged)?
4. Compare frontmatter keys: every Korean frontmatter field has an English counterpart?
5. Pick 5 technical terms that appear 2+ times. For each, confirm the same English rendering is used every time in the translation.
6. Scan for English sentences that have no corresponding Korean counterpart (potential invented content).
7. Scan Korean paragraphs that have no corresponding English paragraph (potential silent omission).

Produce a written report per file, as plain text in your session (not committed). Each report lists findings:

```
## Pass 1 Report — ai-review-bot-evolution

### Heading count
- Korean: 12 (## × 4, ### × 8)
- English: 12 ✓

### Code blocks
- Korean: 7 blocks
- English: 7 blocks ✓ (all verbatim)

### Frontmatter
- ✓ all 7 fields translated

### Term consistency
- "리뷰 봇" → "review bot" (6 occurrences, all consistent) ✓
- ...

### Silent omissions
- Korean paragraph line 145-150 about <X> has no English equivalent ❌
- ...

### Invented content
- English line 203 mentions <Y> not in source ❌
- ...
```

- [ ] **Step 3: Apply fixes**

For every ❌ finding, edit the English MDX file to bring it in line with the Korean source (restore omissions, remove inventions, unify terms).

- [ ] **Step 4: Commit fixes**

```bash
git add "app/posts/ai-review-bot-evolution/index.en.mdx" "app/posts/클랩&루비콘회고/index.en.mdx"
git commit -m "fix(translation): Pass 1 accuracy corrections"
```

### Task 5.3: Self-review Pass 2 — Tone & Readability

**Purpose:** Read each translated file with Korean source hidden. Focus on whether the English flows naturally.

- [ ] **Step 1: Read each English file as if for the first time**

For each post, read the file without re-reading the Korean. Note passages where the English feels awkward, overly literal, or culturally untranslated.

- [ ] **Step 2: Pass 2 checklist per file**

1. Read 3 consecutive sentences aloud (mentally). Does the rhythm feel natural or like a direct gloss of Korean syntax?
2. Look for literal Korean patterns: "~라고 할 수 있다" → "can be said to be" (unnatural). "~것이다" → "is a thing that" (unnatural).
3. Look for Korean idioms/culturally-specific expressions translated literally. If found, replace with a natural English equivalent OR add a brief inline gloss.
4. Check heading capitalization: compare the 4 existing translations' heading style (title case vs sentence case). Match the existing convention.
5. Look for run-on sentences. Korean tolerates longer sentences with connective particles; English prefers shorter units.
6. Check opening of each section: does it hook the reader or does it start with a throat-clear like "In this section we will discuss..."?

Produce a written report per file, same format as Pass 1.

- [ ] **Step 3: Apply fixes**

Edit each English MDX to address Pass 2 findings. Be careful: this pass adjusts *style*; do not remove content that Pass 1 verified is faithful to the source.

- [ ] **Step 4: Commit fixes**

```bash
git add "app/posts/ai-review-bot-evolution/index.en.mdx" "app/posts/클랩&루비콘회고/index.en.mdx"
git commit -m "fix(translation): Pass 2 tone and readability polish"
```

### Task 5.4: Hand off to human review gate

- [ ] **Step 1: Build to confirm translations render**

```bash
rm -rf .next
yarn build
```

Expected: Build succeeds. No MDX parse errors on the new files.

- [ ] **Step 2: Start dev server and spot-check**

```bash
yarn dev
```

Visit in browser:
- `http://localhost:4000/en/posts/ai-review-bot-evolution` → renders the translated body
- `http://localhost:4000/en/posts/클랩&루비콘회고` → renders the translated body
- Content should look formatted correctly (headings, code blocks, links, images).

- [ ] **Step 3: Stop dev server**

- [ ] **Step 4: Notify the user**

Present the two translated files to the user with a summary:

> Both English translations are ready for your review. Self-review Passes 1 and 2 have been applied. Please check the author voice (personal/narrative passages) and let me know if anything needs adjustment. Files to review:
> - `app/posts/ai-review-bot-evolution/index.en.mdx`
> - `app/posts/클랩&루비콘회고/index.en.mdx`

Wait for user feedback. Apply any changes requested. When user approves, proceed to Chunk 6.

---

## Chunk 6: Final verification & deployment readiness

**Purpose:** Full end-to-end verification of the new URL structure, metadata, and sitemap. Capture findings for the post-deploy GSC checklist.

### Task 6.1: Full build verification

- [ ] **Step 1: Clean rebuild**

```bash
rm -rf .next
yarn build
```

Expected:
- Build succeeds with no errors
- Output lists generated static pages:
  - `/ko` + `/en` (from `[lang]/layout` generateStaticParams wrapping `/posts`)
  - `/ko/posts` + `/en/posts`
  - `/ko/posts/[slug]` × 6 slugs = 6 routes
  - `/en/posts/[slug]` × 6 slugs = 6 routes
  - `/ko/resume` + `/en/resume`
  - `/sitemap.xml`
  - `/robots.txt`

- [ ] **Step 2: Inspect build output for any warnings**

Scroll the `yarn build` output. Expected warnings: none specific to i18n. Pre-existing warnings from the codebase (e.g., MDX theme warnings) are out of scope.

### Task 6.2: Manual dev verification checklist

- [ ] **Step 1: Start dev server**

```bash
yarn dev
```

- [ ] **Step 2: Clear browser cookies for `localhost:4000`**

- [ ] **Step 3: Run through the checklist**

- [ ] `/` with browser Accept-Language `en` → 307 → `/en/posts` (check with DevTools Network tab or `curl -I`)
- [ ] `/` with browser Accept-Language `ko` → 307 → `/ko/posts` (use DevTools → Settings → Preferences → Network → custom Accept-Language, or `curl -I -H "Accept-Language: ko"`)
- [ ] `/` with Accept-Language `fr` → 307 → `/en/posts`
- [ ] `/ko/posts` renders post list with 6 posts; all 6 titles in Korean
- [ ] `/en/posts` renders post list with 6 posts; all 6 titles in English
- [ ] `/ko/posts/ai-review-bot-evolution` renders Korean body
- [ ] `/en/posts/ai-review-bot-evolution` renders English body (from Chunk 5 translation)
- [ ] `/ko/posts/클랩&루비콘회고` renders Korean body
- [ ] `/en/posts/클랩&루비콘회고` renders English body
- [ ] `/ko/resume` renders resume
- [ ] `/en/resume` renders resume
- [ ] `/ko/posts/nonexistent-slug` → 404
- [ ] `/fr/posts` → 404
- [ ] `/posts` (no locale prefix) → 404
- [ ] On `/ko/posts/journey-zustand`, click "English" in language switcher → URL becomes `/en/posts/journey-zustand`, content is English
- [ ] On `/en/posts/journey-zustand`, click "한국어" in language switcher → URL becomes `/ko/posts/journey-zustand`, content is Korean
- [ ] Nav "Posts" link on `/ko/...` page → `/ko/posts`
- [ ] Nav "Resume" link on `/en/...` page → `/en/resume`

- [ ] **Step 4: Inspect page source on a post page**

`curl http://localhost:4000/ko/posts/journey-zustand`

Confirm the response contains:
- `<html lang="ko">`
- `<link rel="canonical" href="http://localhost:4000/ko/posts/journey-zustand"/>` (or with prod URL)
- `<link rel="alternate" hreflang="ko" ...>`
- `<link rel="alternate" hreflang="en" ...>`
- `<link rel="alternate" hreflang="x-default" href=".../en/posts/journey-zustand"/>`
- `<meta property="og:locale" content="ko_KR"/>`
- `<meta property="og:locale:alternate" content="en_US"/>`
- JSON-LD `"inLanguage":"ko-KR"`

Repeat for an English page:

`curl http://localhost:4000/en/posts/journey-zustand`

Expected:
- `<html lang="en">`
- `canonical` to the `/en/...` URL
- `og:locale` = `en_US`
- `og:locale:alternate` = `ko_KR`
- JSON-LD `"inLanguage":"en-US"`

- [ ] **Step 5: Inspect sitemap**

`curl http://localhost:4000/sitemap.xml`

Expected: 16 URL entries (2 posts-index + 2 resume + 6×2 posts). Each post entry has `<xhtml:link rel="alternate" hreflang="ko|en" ...>` alternates.

- [ ] **Step 6: Stop dev server**

### Task 6.3: Commit checkpoint and surface PR-ready state

- [ ] **Step 1: Final git state check**

```bash
git status
```

Expected: Working tree clean. All Chunks 1–5 changes committed.

- [ ] **Step 2: Log summary for PR description**

Produce a short summary listing:
- Files renamed (12 MDX + locales dir)
- Files created (app/page.tsx, app/[lang]/layout.tsx, app/not-found.tsx)
- Files modified (layout, posts.ts, sitemap.ts, nav components, LangController, i18n.ts, next-i18next.config.js, next.config.js)
- Files deleted (middleware.js)
- Dependencies removed (js-cookie, @types/js-cookie, i18next-browser-languagedetector, next-i18n-router)
- Translations completed (ai-review-bot-evolution, 클랩&루비콘회고)

- [ ] **Step 3: Surface to user for deployment decision**

Ask the user how they want to handle integration (merge to main / PR / etc.). Use the `superpowers:finishing-a-development-branch` skill guidance.

### Task 6.4: Post-deploy Google Search Console checklist (reminder for user)

This is a reminder for the user to execute after merging and deploying. No code changes in this task.

- [ ] **Step 1: After deploy, run production curl checks**

```
curl -I -H "Accept-Language: en" https://if-geon.xyz/
# Expected: HTTP/2 307, Location: /en/posts

curl -I -H "Accept-Language: ko" https://if-geon.xyz/
# Expected: HTTP/2 307, Location: /ko/posts

curl -I https://if-geon.xyz/en/posts/ai-review-bot-evolution
# Expected: HTTP/2 200

curl https://if-geon.xyz/sitemap.xml | head -20
# Expected: 16 URL entries
```

- [ ] **Step 2: Google Search Console actions**

- Sitemap URL is unchanged (`/sitemap.xml`); contents are expanded. Submit a fresh fetch via "Sitemaps → Add a new sitemap" if GSC shows stale data.
- Use the URL Inspection Tool on both `/ko/posts/journey-zustand` and `/en/posts/journey-zustand` to request indexing.
- After 3–7 days, check "Indexed pages" report: both `/ko/` and `/en/` URLs should appear.
- Check "International Targeting" for hreflang errors.

- [ ] **Step 3: Social preview verification**

- Twitter Card Validator: `https://if-geon.xyz/en/posts/ai-review-bot-evolution` → preview renders with English title/description, OG image
- Facebook Sharing Debugger: same URL → OG locale = `en_US`

---

## Summary

After all 6 chunks:
- All URLs carry an explicit locale prefix (`/ko/...` or `/en/...`)
- Root `/` redirects based on `Accept-Language`
- Per-post hreflang, canonical, sitemap alternates all in place
- OG metadata is locale-specific
- `middleware.js` and cookie-based detection are gone
- Locale code is `ko` (ISO 639-1 standard) throughout
- Both stub English posts have real translations
- Dead dependencies removed
