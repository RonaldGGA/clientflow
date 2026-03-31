"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { Loader2 } from "lucide-react";

const DEMO_EMAIL = "admin@clientflow.demo";
const DEMO_PASSWORD = "admin1234";

export default function LoginPage() {
  const t = useTranslations("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);

  async function signIn(credentials: { email: string; password: string }) {
    const { error: authError } = await authClient.signIn.email(credentials);
    if (authError) {
      setError(authError.message ?? t("invalidCredentials"));
      return false;
    }
    await fetch("/api/auth/session-init", {
      method: "POST",
      credentials: "include",
    });
    window.location.href = "/";
    return true;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    await signIn({ email, password });
    setLoading(false);
  }

  async function handleDemo() {
    setError(null);
    setDemoLoading(true);
    await signIn({ email: DEMO_EMAIL, password: DEMO_PASSWORD });
    setDemoLoading(false);
  }

  const anyLoading = loading || demoLoading;

  return (
    // cf-fade-up is defined in globals.css — pure CSS @keyframes, no plugin needed
    <div className="relative min-h-screen flex items-center justify-center px-4 cf-fade-up">
      <div className="absolute top-4 right-4">
        <LocaleSwitcher />
      </div>

      <Card className="w-full max-w-sm bg-zinc-900 border-zinc-800">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-white">
            {t("title")}
          </CardTitle>
          <p className="text-sm text-zinc-400">{t("subtitle")}</p>
        </CardHeader>

        <CardContent className="space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-zinc-300">
                {t("email")}
              </Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={anyLoading}
                className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-zinc-300">
                {t("password")}
              </Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={anyLoading}
                className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
              />
            </div>

            {error && (
              <p className="text-sm text-red-400 bg-red-950/30 border border-red-900 rounded-md px-3 py-2">
                {error}
              </p>
            )}

            <Button
              type="submit"
              disabled={anyLoading}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition-colors"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                t("submit")
              )}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-zinc-700" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-zinc-900 px-2 text-zinc-500">or</span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            disabled={anyLoading}
            onClick={handleDemo}
            className="w-full border-zinc-700 bg-transparent text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors"
          >
            {demoLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              "Try demo"
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
