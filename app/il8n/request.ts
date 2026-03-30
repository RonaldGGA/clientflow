import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";

const SUPPORTED_LOCALES = ["en", "es"];
const DEFAULT_LOCALE = process.env.NEXT_PUBLIC_DEFAULT_LOCALE ?? "en";

export default getRequestConfig(async () => {
  const store = await cookies();
  const raw = store.get("cf-locale")?.value;
  const locale = SUPPORTED_LOCALES.includes(raw ?? "") ? raw! : DEFAULT_LOCALE;

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
