import type { Metadata } from "next";
// import { Inter } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import "./globals.css";
import localFont from "next/font/local";

// const inter = Inter({
//   subsets: ["latin"],
//   variable: "--font-sans",
// });

const inter = localFont({
  src: "../public/fonts/InterVariable.woff2",
  variable: "--font-sans",
  display: "swap",
});
export const metadata: Metadata = {
  title: {
    default: "ClientFlow",
    template: "%s ClientFlow",
  },
  description: "Clients and services management system for small business.",
  manifest: "/site.webmanifest",
  icons: {
    icon: [
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "ClientFlow",
    description: "Clients and services management system for small business.",
    type: "website",
    locale: "es_CU",
    alternateLocale: "en_US",
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} className="h-full antialiased" suppressHydrationWarning>
      <body className={`${inter.variable} min-h-full flex flex-col`}>
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
