import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { Link } from "@tanstack/react-router";
import { Logo } from "@/components/brand/Logo";
import { Star } from "lucide-react";

export function AuthShell({ title, subtitle, children, footer }: { title: string; subtitle: string; children: ReactNode; footer: ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="flex flex-col px-6 py-8 sm:px-10">
        <Logo />
        <div className="flex flex-1 items-center justify-center">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="w-full max-w-md"
          >
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
            <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
            <div className="mt-8">{children}</div>
            <div className="mt-6 text-center text-sm text-muted-foreground">{footer}</div>
          </motion.div>
        </div>
        <div className="text-center text-xs text-muted-foreground">
          <Link to="/">← Back to home</Link>
        </div>
      </div>
      <div className="relative hidden overflow-hidden bg-gradient-to-br from-primary via-primary to-accent lg:block">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.25),transparent_60%)]" />
        <div className="absolute inset-0 flex flex-col justify-between p-14 text-white">
          <div className="max-w-md">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur">
              <Star className="h-3.5 w-3.5" /> Trusted by 48k builders
            </div>
            <h2 className="mt-6 text-3xl font-semibold leading-tight">Build once. Learn forever.</h2>
            <p className="mt-3 text-white/85">
              Every hackathon leaves knowledge behind — KnowHack turns that scattered work
              into a compounding archive you actually revisit.
            </p>
          </div>
          <div className="grid gap-3">
            {["12,480 projects", "340+ universities", "1,200 hackathons indexed"].map((line) => (
              <div key={line} className="flex items-center gap-3 rounded-xl border border-white/15 bg-white/10 p-3 backdrop-blur">
                <div className="grid h-8 w-8 place-items-center rounded-full bg-white/20"><Star className="h-4 w-4" /></div>
                <div className="text-sm">{line}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}