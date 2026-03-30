"use client";

import { useState, useEffect } from "react";
import { useLocale, useTranslations } from "next-intl";

const LOCALES = [
  { code: "en", label: "EN", flag: "🇺🇸" },
  { code: "es", label: "ES", flag: "🇨🇺" },
];

export function LocaleSwitcher() {
  const t = useTranslations("localeSwitcher");
  const current = useLocale();
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    if (!selected || selected === current) return;
    document.cookie = `cf-locale=${selected}; Max-Age=${60 * 60 * 24 * 365}; path=/`;
    window.location.reload();
  }, [selected, current]);

  return (
    <div className="flex items-center gap-1" aria-label={t("label")}>
      {LOCALES.map((locale) => (
        <button
          key={locale.code}
          onClick={() => setSelected(locale.code)}
          className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
            current === locale.code
              ? "bg-emerald-500/20 text-emerald-400"
              : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
          }`}
        >
          <span>{locale.flag}</span>
          <span>{locale.label}</span>
        </button>
      ))}
    </div>
  );
}
