import { Link } from "@tanstack/react-router";
import { Github, Twitter, Linkedin } from "lucide-react";
import { Logo } from "@/components/brand/Logo";

export function Footer() {
  return (
    <footer className="mt-24 border-t border-border/60 bg-card/40">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-14 md:grid-cols-4">
        <div className="md:col-span-1">
          <Logo />
          <p className="mt-4 max-w-xs text-sm text-muted-foreground">
            Build Once. Learn Forever. Preserve hackathon knowledge and make it reusable.
          </p>
          <div className="mt-5 flex gap-2">
            {[Github, Twitter, Linkedin].map((Icon, i) => (
              <a key={i} href="#" className="grid h-9 w-9 place-items-center rounded-lg border border-border hover:bg-secondary">
                <Icon className="h-4 w-4" />
              </a>
            ))}
          </div>
        </div>
        {[
          { title: "Product", items: ["Discover", "Upload", "Dashboard", "Pricing"] },
          { title: "Community", items: ["Hackathons", "Universities", "Mentors", "Changelog"] },
          { title: "Company", items: ["About", "Careers", "Press", "Contact"] },
        ].map((c) => (
          <div key={c.title}>
            <div className="text-xs font-semibold uppercase tracking-wider text-foreground">{c.title}</div>
            <ul className="mt-4 space-y-2">
              {c.items.map((i) => (
                <li key={i}>
                  <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">{i}</Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-border/60">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-6 py-5 text-xs text-muted-foreground md:flex-row">
          <span>© 2026 KnowHack. All rights reserved.</span>
          <div className="flex gap-5">
            <a href="#">Privacy</a>
            <a href="#">Terms</a>
            <a href="#">Security</a>
          </div>
        </div>
      </div>
    </footer>
  );
}