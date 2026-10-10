"use client";
import Link from "next/link";
import { LogoMark } from "@/components/logo";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto w-full max-w-5xl px-6">
      <header className="flex items-center border-b py-5"><Link href="/" className="serif flex items-center gap-2.5 text-xl"><LogoMark />PRD Doctor</Link></header>
      <section className="max-w-xl py-24">
        <p className="eyebrow mb-4">Something broke</p>
        <h1 className="serif text-5xl leading-[1.06]">That didn&apos;t work.</h1>
        <p className="mt-5 text-[15px] text-[#3B3650]">An unexpected error stopped this page. Your PRD was not uploaded anywhere. Try again, or head back to the start.</p>
        <div className="mt-8 flex gap-3">
          <button onClick={reset} className="btn-solid inline-flex h-10 items-center px-5 text-sm font-medium">Try again</button>
          <Link href="/" className="btn-line inline-flex h-10 items-center px-5 text-sm">Back to start</Link>
        </div>
      </section>
    </main>
  );
}
