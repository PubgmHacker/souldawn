import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Профиль — SOULDAWN",
  description: "Управляйте своим аккаунтом SOULDAWN",
};

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
