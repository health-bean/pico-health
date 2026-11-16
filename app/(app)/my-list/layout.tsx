import type { Metadata } from "next";

export const metadata: Metadata = { title: "My food list" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
