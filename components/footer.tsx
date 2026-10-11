import { Github, Linkedin } from "./icons";
import { LogoMark } from "./logo";
import { SITE } from "@/lib/site";

const link = "btn-line inline-flex h-9 items-center gap-2 px-3.5 text-[13px]";

export function Footer() {
  return (
    <footer className="no-print mt-auto border-t bg-white/40 backdrop-blur-sm">
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-6 px-6 py-8">
        <div>
          <span className="serif flex items-center gap-2.5 text-lg"><LogoMark size={20} />{SITE.name}</span>
          <p className="mt-2 text-sm text-[#3B3650]">
            Designed and built by <a href={SITE.linkedin} target="_blank" rel="noopener noreferrer" className="underline decoration-[#C9B8FF] underline-offset-4 hover:decoration-[#6D4AFF]">{SITE.author}</a>.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Free, no account. Your PRD never leaves your browser.</p>
        </div>
        <nav aria-label="Author links" className="flex flex-wrap items-center gap-2">
          <a href={SITE.github} target="_blank" rel="noopener noreferrer" className={link}><Github />GitHub</a>
          <a href={SITE.linkedin} target="_blank" rel="noopener noreferrer" className={link}><Linkedin />LinkedIn</a>
          <a href={SITE.repo} target="_blank" rel="noopener noreferrer" className={link}>Source</a>
        </nav>
      </div>
    </footer>
  );
}
