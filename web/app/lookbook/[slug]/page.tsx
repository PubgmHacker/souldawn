import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LOOKS, getLook } from "@/lib/lookbook";
import LookDetail from "@/components/LookDetail";

export function generateStaticParams() {
  return LOOKS.map((l) => ({ slug: l.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const look = getLook(params.slug);
  if (!look) return { title: "Lookbook — SOULDAWN" };
  return {
    title: `${look.title} — SOULDAWN`,
    description: look.story,
  };
}

export default function LookPage({ params }: { params: { slug: string } }) {
  const look = getLook(params.slug);
  if (!look) notFound();
  return <LookDetail look={look} />;
}
