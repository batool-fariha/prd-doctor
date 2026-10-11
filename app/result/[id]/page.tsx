import type { Metadata } from "next";
import { decodePayload, decodePrev } from "@/lib/analyzer";
import { ResultView } from "@/components/result-view";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { id } = await params;
  const s = (await searchParams).s;
  const payload = decodePayload(typeof s === "string" ? s : null);
  if (!payload) return { title: "PRD Doctor result" };
  const pv = (await searchParams).p;
  const img = `/api/og?s=${s}&id=${encodeURIComponent(id)}${typeof pv === "string" ? `&p=${pv}` : ""}`;
  const prev = decodePrev(typeof pv === "string" ? pv : null);
  const title = prev ? `My PRD went from ${prev.o} to ${payload.o} on PRD Doctor` : `My PRD scored ${payload.o}/100 on PRD Doctor`;
  return {
    title,
    openGraph: { title, images: [img] },
    twitter: { card: "summary_large_image", title, images: [img] },
  };
}

export default async function ResultPage({ params, searchParams }: Props) {
  const { id } = await params;
  const s = (await searchParams).s;
  return <ResultView id={id} shared={typeof s === "string" ? s : null} />;
}
