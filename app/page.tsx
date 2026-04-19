import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default function RootPage() {
  const acceptLang = headers().get("accept-language") || "";
  const lang = acceptLang.toLowerCase().startsWith("ko") ? "ko" : "en";
  redirect(`/${lang}/posts`);
}
