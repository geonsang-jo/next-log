import { Metadata } from "next";
import localFont from "next/font/local";
import { notFound } from "next/navigation";
import Header from "~components/header";
import GoogleAnalytics from "~components/GoogleAnalytics";
import ThemeProvider from "~styles/themeProvider";
import TranslationProvider from "~core/translation/translationProvider";
import initTranslations from "../../i18n";

const pretendard = localFont({
  src: "../fonts/PretendardVariable.woff2",
  display: "swap",
  weight: "45 920",
  variable: "--font-pretendard",
});

const SUPPORTED_LOCALES = ["ko", "en"] as const;
type Locale = (typeof SUPPORTED_LOCALES)[number];

export async function generateStaticParams() {
  return SUPPORTED_LOCALES.map((lang) => ({ lang }));
}

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
    <html suppressHydrationWarning lang={lang} className={pretendard.variable}>
      <body suppressHydrationWarning className={pretendard.className}>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-background focus:text-foreground focus:rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
        >
          Skip to content
        </a>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: "Geon log",
              description:
                lang === "ko"
                  ? "웹 개발과 기타 주제에 관한 블로그"
                  : "A blog about web development and other stuff",
              url: "https://if-geon.xyz",
            }),
          }}
        />
        {process.env.NEXT_PUBLIC_GA_ID && (
          <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID} />
        )}
        <TranslationProvider lang={lang} resources={resources}>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <Header />
            <div className="flex w-full justify-center">
              <main id="main-content" className="container relative lg:px-8">{children}</main>
            </div>
          </ThemeProvider>
        </TranslationProvider>
      </body>
    </html>
  );
};

export default LangLayout;
