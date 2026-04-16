# i18n URL Routing & SEO Redesign

**Date**: 2026-04-16
**Status**: Approved
**Author**: Geon (with Claude)

## Summary

Restructure the blog's internationalization from cookie-based language switching (same URL serves different languages) to URL-based locale routing (`/ko/...`, `/en/...`). Add proper hreflang, per-locale canonical URLs, localized sitemap, and locale-specific Open Graph metadata. Translate the two stub English posts (`ai-review-bot-evolution`, `클랩&루비콘회고`) to complete bilingual coverage. Migrate locale code from non-standard `kr` to ISO-standard `ko`.

## Context & Motivation

### Current State (Broken SEO)

- Next.js 14 App Router blog at `if-geon.xyz`
- Two locales: `en`, `kr` (defaultLocale: `kr`)
- **No URL-based locale routing** — the same URL (e.g., `/posts/ai-review-bot-evolution`) serves different languages based on:
  - `lang` cookie (set by middleware from `Accept-Language` header on first visit)
  - Falls back to `defaultLocale` (`kr`) if cookie missing
- Middleware (`middleware.js`) runs on nearly every request, detects language via `Accept-Language`, sets cookie
- Post data loader (`app/utils/posts.ts`) reads language-specific MDX files (`index.kr.mdx`, `index.en.mdx`) based on cookie value
- All posts have both language files on disk, but two posts have stub/mixed English versions:
  - `ai-review-bot-evolution/index.en.mdx` → "English version coming soon"
  - `클랩&루비콘회고/index.en.mdx` → frontmatter in English, body in Korean

### Problems This Design Solves

1. **Google indexes only one language per URL.** Googlebot sends `Accept-Language: en`, so it currently sees the English stub for `ai-review-bot-evolution` instead of the real Korean content. Korean content is effectively invisible to Google.
2. **No hreflang signal.** Google cannot discover that Korean and English versions exist as alternates, so it cannot serve the right version to the right user.
3. **Same canonical URL for two languages.** Both language versions map to the same URL, violating SEO best practices and confusing search engines.
4. **No URL ownership per language.** Cannot share "the English version of this post" as a distinct link.
5. **Locale code `kr` is non-standard.** `kr` is the ISO 3166-1 country code for South Korea; the ISO 639-1 language code is `ko`. Google hreflang requires `ko`.

### Why Now

- URL was changed earlier today (2026-04-16); no existing Google index to preserve. This allows a clean-break redesign without the cost of preserving legacy paths.
- User (blog author) is planning a future career move to an English-speaking market and wants English content to be properly discoverable.

## Goals

- URL structure clearly distinguishes Korean and English content
- Google can correctly index, rank, and serve both language versions
- English content is maximally discoverable for international/English-speaking visitors
- Single language switch produces a shareable language-specific URL
- Foundation supports adding more locales (e.g., `ja`, `zh`) without redesign

## Non-Goals

- Preserving existing URL shapes (no existing index to preserve)
- Auto-translation of content (translations are human-authored and reviewed)
- Server-side content negotiation on arbitrary paths (handled only at `/`)
- Moving the blog platform; remains Next.js 14 App Router

## Design Decisions

### Decision 1: URL Strategy — Always Prefix Locale

All content URLs include the locale segment.

```
/                                → 302 redirect to /ko/posts or /en/posts
/ko/posts                        → Korean post list
/en/posts                        → English post list
/ko/posts/[slug]                 → Korean post detail
/en/posts/[slug]                 → English post detail
/ko/resume                       → Korean resume
/en/resume                       → English resume
```

**Why:** Symmetric treatment of both languages, clean mental model, simple hreflang/canonical/sitemap logic, trivial to extend to additional locales. Chosen over the "default has no prefix" alternative because there is no existing index to preserve, making symmetry more valuable than URL shortness.

### Decision 2: Locale Codes — `ko` and `en`

Migrate locale code from `kr` to ISO 639-1 standard `ko`. Rename all `.kr.mdx` files and `public/locales/kr/` directory. English stays `en`.

**Why:** Google hreflang requires ISO 639-1. `kr` is the country code for South Korea, not a language code.

### Decision 3: Default / Fallback Locale — `en`

When `Accept-Language` is neither Korean nor English (e.g., Italian, Portuguese, Japanese visitors), redirect to English. The `x-default` hreflang points to the English URL.

**Why:** English has the broadest cross-language accessibility for ambiguous visitors. This aligns with the author's career goal of reaching English-speaking audiences. Does not affect Korean users (explicit `Accept-Language: ko` still routes to Korean). Impact scope: estimated <5% of traffic whose language is neither Korean nor English.

### Decision 4: Missing Translation Handling — 404

If a post exists in only one locale, the other locale URL returns 404. Not included in sitemap. Not listed in hreflang `alternates.languages`. Not offered in language switcher UI.

**Why:** Simplest, SEO-cleanest. After this work, all 6 posts will have both languages, so 404 is rarely hit in practice. YAGNI: can add fallback/placeholder behavior later if stub workflow becomes common. Avoids "page language does not match declared language" warnings in Google Search Console.

### Decision 5: Root `/` Redirect via Server Component, Not Middleware

Handle `/` → locale redirect in `app/page.tsx` using `next/headers` + `redirect()`. Delete the existing `middleware.js`.

**Why:**
- Only one path needs language detection (`/`). All other paths carry explicit locale in URL. Middleware that runs on every request for one-path logic is overkill.
- Simpler mental model: `/` behavior is in `app/page.tsx` alongside all other page code.
- Node runtime (vs Edge): no runtime constraints.
- Easier debugging (standard server component logging).
- Existing middleware would need to be fully rewritten anyway for the new design.

### Decision 6: Translation Scope — Translate Both Stubs, Split as Subagents

Includes translating `ai-review-bot-evolution` and `클랩&루비콘회고` into English as part of this work. Each translation is a parallel subagent task to keep contexts isolated.

**Why:** Launching the new URL structure with English stubs present would hurt first-impression SEO for English. Subagent split prevents translation context from polluting infrastructure work, and the two translations are independent (can run in parallel). Main session handles infrastructure; subagents handle translations.

## Architecture

### Directory Structure (App Router)

```
app/
  layout.tsx                      ← minimal <html>/<body>, Analytics (global only)
  page.tsx                        ← NEW: root `/` → redirect to /ko or /en
  sitemap.ts                      ← MODIFIED: locale-aware entries + hreflang alternates
  robots.ts                       ← unchanged

  [lang]/                         ← NEW: dynamic locale segment
    layout.tsx                    ← <html lang={params.lang}>, TranslationProvider,
                                    OG metadata per locale, i18n init
    posts/
      page.tsx                    ← moved from app/posts/page.tsx
      [slug]/
        page.tsx                  ← moved from app/posts/[slug]/page.tsx
    resume/
      page.tsx                    ← moved from app/resume/page.tsx

  api/                            ← unchanged (locale-agnostic)

  core/
    translation/
      translationProvider.tsx     ← unchanged (still wraps children)

  components/
    header/
      toggle/
        LangController/           ← MODIFIED: URL-swap instead of cookie-set
    ...

  utils/
    posts.ts                      ← MODIFIED: null return on missing, new helper

public/
  locales/
    ko/common.json                ← renamed from kr/
    en/common.json                ← unchanged
  posts/                          ← unchanged (post assets)

app/posts/*/index.ko.mdx          ← renamed from index.kr.mdx (6 files)
app/posts/*/index.en.mdx          ← unchanged for 4 posts;
                                    rewritten for ai-review-bot-evolution;
                                    rewritten for 클랩&루비콘회고
```

### Deletions

- `middleware.js` — entire file
- All `js-cookie` usage in `LangController` and elsewhere
- All `Cookies.set("lang", ...)` calls
- npm dependencies removed from `package.json`:
  - `next-i18n-router` (unused)
  - `js-cookie` and `@types/js-cookie` (no longer used after cookie removal)
  - `i18next-browser-languagedetector` (dead code once URL-based detection replaces cookie/navigator)

### Configuration Changes

**`next-i18next.config.js`:**
```js
const i18nConfig = {
  locales: ["ko", "en"],
  defaultLocale: "en",
};
module.exports = i18nConfig;
```

**`metadataBase` location:** The `metadataBase: new URL(...)` currently lives in `app/layout.tsx`'s `metadata` export. After the split, `app/layout.tsx` keeps only the `metadataBase` + global defaults (e.g., `verification`, `twitter.card` fallback). Locale-specific fields (`title.default`, `description`, `openGraph.locale`, `openGraph.url`) move to `app/[lang]/layout.tsx`. This way, `metadataBase` applies uniformly and the per-locale OG fields override/extend it.

**`i18n.ts`:**
- Remove cookie/navigator-based language detection
- Initialize i18next with locale passed from route params, not from cookie
- Simpler signature: `initTranslations(lang: "ko" | "en", i18nInstance?, resources?)`

## Components

### `app/page.tsx` (root)

```tsx
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default function RootPage() {
  const acceptLang = headers().get("accept-language") || "";
  const lang = acceptLang.toLowerCase().startsWith("ko") ? "ko" : "en";
  redirect(`/${lang}/posts`);
}
```

Returns a 307 (temporary, method-preserving) redirect via `next/navigation`'s `redirect()`. No rendering. Runs only for path `/`. Verification steps should expect any `30x` status (307 specifically).

### `app/[lang]/layout.tsx`

Takes over locale-specific responsibilities from the previous root layout:
- `<html lang={params.lang}>`
- Validate `params.lang` is one of `"ko" | "en"`; invalid → `notFound()`
- Export `generateStaticParams` returning `[{ lang: "ko" }, { lang: "en" }]` so the dynamic segment is statically generable
- `initTranslations(params.lang)` and wrap in `TranslationProvider`
- Generate per-locale OG metadata:
  - `ko`: `og:locale = ko_KR`, `og:locale:alternate = en_US`
  - `en`: `og:locale = en_US`, `og:locale:alternate = ko_KR`
- Use the existing `Header` component (modified to consume `lang` prop)

### `app/not-found.tsx`

Add a minimal 404 page so `notFound()` calls in `[lang]/layout.tsx` render cleanly. Can be a simple text page ("Not Found" / translated based on detectable context, but static text is fine).

### `app/[lang]/posts/[slug]/page.tsx`

- `params: { lang: "ko" | "en", slug: string }`
- `generateStaticParams`: returns only `{ lang, slug }` pairs where the MDX file exists; a missing file means that combination is excluded, producing a 404 automatically
- `generateMetadata`: produces `alternates.canonical = /${lang}/posts/${slug}` and `alternates.languages` with only the locales that actually have translations (plus `x-default = /en/...` when English exists)
- JSON-LD `BlogPosting` gains `inLanguage` field: `ko-KR` or `en-US`

### `app/[lang]/posts/page.tsx`

- `params: { lang: "ko" | "en" }`
- Calls `getAllPosts(params.lang)` which returns only posts with translations in that locale
- Post list links use `/${lang}/posts/${slug}`

### `app/utils/posts.ts`

Current behavior: `getPostBySlug` uses `fs.readFileSync` which crashes on missing files. The `throw new Response("Not Found", ...)` lives in the page wrapper (`app/posts/[slug]/page.tsx`), not in this util.

Changes:
- `getPostBySlug(slug, lang)`: returns `null` when the corresponding MDX file does not exist on disk (check with `fs.existsSync` before reading)
- `getAllPosts(lang)`: filters out posts lacking the given locale
- New: `getAvailableLocales(slug): ("ko" | "en")[]` — used by hreflang generator, sitemap generator, and language switcher

The page wrapper's throw is replaced by `notFound()` from `next/navigation` when `getPostBySlug` returns null.

### `LangController` component

```tsx
"use client";
import { usePathname, useRouter } from "next/navigation";

type Props = { availableLocales: ("ko" | "en")[] };

const LangController = ({ availableLocales }: Props) => {
  const pathname = usePathname();
  const router = useRouter();

  const changeLanguage = (target: "ko" | "en") => {
    const segments = pathname.split("/");
    segments[1] = target;              // /ko/posts/foo → /en/posts/foo
    router.push(segments.join("/"));
  };
  // render dropdown; disable the locale not in availableLocales
};
```

Removed: `js-cookie` import, `Cookies.set`, `window.location.reload`.

### Navigation links

`Header`, `Nav`, any `<Link href="/posts">` style links are updated to `<Link href={`/${lang}/posts`}>`. The `lang` value threads from `[lang]/layout.tsx` to children via props or a simple server-side read of `params`.

## Data Flow

### Request to `/`

1. Browser sends `GET /` with `Accept-Language: en-US,en;q=0.9,ko;q=0.8`
2. `app/page.tsx` runs as Server Component
3. `headers().get("accept-language")` returns the header string
4. Logic: `startsWith("ko")` → `/ko/posts`, else `/en/posts`
5. `redirect()` throws a Next.js internal redirect → browser receives 302 → navigates to `/en/posts`

### Request to `/ko/posts/ai-review-bot-evolution`

1. `app/[lang]/posts/[slug]/page.tsx` matches with `params = { lang: "ko", slug: "ai-review-bot-evolution" }`
2. `[lang]/layout.tsx` validates `lang === "ko"`, initializes i18next with Korean resources, wraps in provider, sets `<html lang="ko">`
3. Page calls `getPostBySlug("ai-review-bot-evolution", "ko")` → reads `app/posts/ai-review-bot-evolution/index.ko.mdx`
4. `generateMetadata` reads available locales, produces:
   - `canonical: "/ko/posts/ai-review-bot-evolution"`
   - `languages: { ko: "...", en: "...", "x-default": "/en/posts/ai-review-bot-evolution" }`
   - OG: `og:locale=ko_KR`, `og:locale:alternate=en_US`, `og:url=.../ko/posts/ai-review-bot-evolution`
5. JSON-LD: `inLanguage: "ko-KR"`, `url: .../ko/posts/ai-review-bot-evolution`

### Language switch on `/ko/posts/foo`

1. User clicks "English" in `LangController`
2. `changeLanguage("en")` → `router.push("/en/posts/foo")`
3. Next.js client-side navigates to new route
4. `/en/posts/foo` loads with English content
5. No cookie set, no `window.location.reload()`

### Request to missing translation (e.g., `/en/posts/future-post-ko-only`)

1. `generateStaticParams` did not emit this combination because `index.en.mdx` does not exist
2. Next.js returns 404
3. The Korean version remains accessible at `/ko/posts/future-post-ko-only`
4. Sitemap contains only the Korean entry for that post
5. hreflang on the Korean page omits `en` alternate (only `ko` self-reference + `x-default`)

## SEO Metadata

### hreflang (per post page)

Generated by `generateMetadata.alternates.languages` in Next.js:

```html
<link rel="canonical" href="https://if-geon.xyz/ko/posts/foo" />
<link rel="alternate" hreflang="ko" href="https://if-geon.xyz/ko/posts/foo" />
<link rel="alternate" hreflang="en" href="https://if-geon.xyz/en/posts/foo" />
<link rel="alternate" hreflang="x-default" href="https://if-geon.xyz/en/posts/foo" />
```

Rules:
- Always include self-referential hreflang for current locale
- Include hreflang only for locales where the translation actually exists
- Include `x-default` pointing to `/en/...` when English exists; otherwise to `/ko/...`
- No cross-canonical pointing (each locale is its own canonical)

### Sitemap (`app/sitemap.ts`)

Structure:
```ts
{
  url: "https://if-geon.xyz/ko/posts/foo",
  lastModified: <post date>,
  changeFrequency: "monthly",
  priority: 0.8,
  alternates: {
    languages: {
      ko: "https://if-geon.xyz/ko/posts/foo",
      en: "https://if-geon.xyz/en/posts/foo",
    },
  },
}
```

Entries generated:
- `/ko/posts` and `/en/posts` (priority 1, weekly)
- `/ko/resume` and `/en/resume` (priority 0.5, monthly)
- For each post: one entry per available locale, with alternates block listing all available locales

After this work: 2 (posts index) + 2 (resume) + 6×2 (posts) = 16 entries.

### Open Graph

Current root layout hardcodes `locale: "ko_KR"`. Moved to `[lang]/layout.tsx`:
- Korean pages: `og:locale=ko_KR`, `og:locale:alternate=en_US`
- English pages: `og:locale=en_US`, `og:locale:alternate=ko_KR`

Twitter Card metadata is locale-agnostic in structure but uses locale-specific title/description (already handled by per-page `generateMetadata`).

### JSON-LD

Each post page's BlogPosting adds `inLanguage`:
- Korean: `"inLanguage": "ko-KR"`
- English: `"inLanguage": "en-US"`

Post URL in JSON-LD uses the locale-prefixed form: `/ko/posts/...` or `/en/posts/...`.

## Error Handling

- **Invalid locale in URL** (`/fr/posts/...`): `[lang]/layout.tsx` validates against `["ko", "en"]`. Unknown locale → `notFound()` → 404.
- **Missing translation** (`/en/posts/slug-with-no-en`): Not emitted by `generateStaticParams` → Next.js 404.
- **Missing Accept-Language header** at `/`: Empty string → `startsWith("ko")` false → redirects to `/en/posts`. Aligned with fallback-to-English policy.
- **Malformed slug**: `getPostBySlug` validates; returns null; static params excluded.
- **Build-time file errors** (e.g., MDX parse failure): handled by existing MDX loader; logged at build; build fails loudly.

## Translation Subtasks (Parallel)

Two independent translation tasks dispatched via parallel subagents during the implementation phase. Each subagent:

- Receives the full Korean MDX as input
- Produces a complete English MDX (frontmatter + body)
- Follows the tone/style of existing translated posts (`journey-zustand`, `future-oriented-frontend-architecture`, `migrating-react-to-nextjs`, `type-safe-and-reliable`)
- Preserves code blocks verbatim, translates comments inside code
- Preserves heading structure and relative links

**Subtask A — `ai-review-bot-evolution`:**
- Source: `app/posts/ai-review-bot-evolution/index.ko.mdx` (renamed from `.kr.mdx`)
- Target: `app/posts/ai-review-bot-evolution/index.en.mdx` (replaces current stub)

**Subtask B — `클랩&루비콘회고`:**
- Source: `app/posts/클랩&루비콘회고/index.ko.mdx` (renamed from `.kr.mdx`)
- Target: `app/posts/클랩&루비콘회고/index.en.mdx` (replaces current mixed-language file)
- Frontmatter title should be translated (e.g., "Retrospective on Clelab & Lubycon")

**Human review gate:** After translations complete, the user reviews both files for tone/nuance corrections before merging to main. This gate exists because translation of personal/narrative content benefits from the author's direct editing.

## Verification

### Local Build

- `yarn build` completes without errors
- Build output shows all `{ lang, slug }` pairs in `generateStaticParams`
- `/sitemap.xml` is included in build output

### Local Dev (`yarn dev`)

- `/` with browser language EN → 307 to `/en/posts`
- `/` with browser language KO (via DevTools) → 307 to `/ko/posts`
- `/` with browser language other (e.g., FR) → 307 to `/en/posts`
- `/ko/posts/ai-review-bot-evolution` renders Korean body
- `/en/posts/ai-review-bot-evolution` renders English body (after translation)
- `/fr/posts/anything` → 404
- `/ko/posts/nonexistent-slug` → 404
- Language switcher on `/ko/posts/foo` clicking "English" navigates to `/en/posts/foo`
- Page source contains:
  - `<html lang="ko">` or `<html lang="en">` matching URL locale
  - `<link rel="canonical">` to self
  - `<link rel="alternate" hreflang="ko|en|x-default">` entries
  - `og:locale` matching page locale
  - JSON-LD `inLanguage` matching page locale
- `/sitemap.xml` shows 16 URLs with `xhtml:link` alternates

### Production (post-deploy)

- `curl -H "Accept-Language: en" https://if-geon.xyz/` → 307 to `/en/posts`
- `curl -H "Accept-Language: ko" https://if-geon.xyz/` → 307 to `/ko/posts`
- `curl -I https://if-geon.xyz/en/posts/ai-review-bot-evolution` → 200
- Google Search Console:
  - Sitemap URL is unchanged (`/sitemap.xml`); its contents now include both locales. No resubmission required unless GSC shows a stale fetch.
  - After a few days, verify indexed URLs include both `/ko/` and `/en/` paths
  - Check for hreflang errors (if any) in the International Targeting report
- Social preview (Twitter/Facebook debugger) shows correct locale-specific OG

## Implementation Ordering Hint (for planning)

This section is a hint for the subsequent `writing-plans` phase; the plan itself will finalize ordering.

1. Rename locale files (`.kr.mdx` → `.ko.mdx`, `public/locales/kr` → `public/locales/ko`)
2. Update `next-i18next.config.js` and `i18n.ts` to new locale codes
3. Create `app/[lang]/layout.tsx`; move locale logic from root layout
4. Move `app/posts/` into `app/[lang]/posts/`; same for `resume`
5. Update post data layer (`getPostBySlug` null return, `getAvailableLocales` helper)
6. Update `generateMetadata` for hreflang/canonical/OG per locale
7. Update `sitemap.ts` for localized entries
8. Create `app/page.tsx` root redirect
9. Delete `middleware.js`; remove cookie code
10. Update `LangController` to URL-based switching
11. Update navigation links in `Header`/`Nav` to include locale prefix
12. (Parallel) Dispatch translation subagents for `ai-review-bot-evolution` and `클랩&루비콘회고`
13. Human review of translations
14. Run verification steps

## Open Questions

None at design approval time. All clarified during brainstorming.

## Rollback

If SEO regression is detected post-deploy:
- Rolling back is a single git revert (no data migrations)
- Since there is no prior Google index to preserve, rollback cost is limited to the period of this deploy being live
- Middleware deletion and config changes are cleanly reversed by the revert
