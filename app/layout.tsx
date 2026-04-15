import "~styles/globals.css";

import { Metadata } from "next";
import Header from "~components/header";
import ThemeProvider from "~styles/themeProvider";
import i18nConfig from "../next-i18next.config";
import TranslationProvider from "~core/translation/translationProvider";
import initTranslations from "../i18n";
import { cookies } from "next/headers";

export const metadata: Metadata = {
  title: "Geon log",
  description: "A blog about web development and other stuff",
};

export function generateStaticParams() {
  return i18nConfig.locales.map((locale) => ({ locale }));
}

const RootLayout = async ({ children }: { children: React.ReactNode }) => {
  const { resources, i18n } = await initTranslations();
  const detectedLanguage =
    cookies().get("lang")?.value || i18n.language || i18nConfig.defaultLocale;

  return (
    <html suppressHydrationWarning lang={detectedLanguage}>
      <body>
        <TranslationProvider resources={resources}>
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

export default RootLayout;
