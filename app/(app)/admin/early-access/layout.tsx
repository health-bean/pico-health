import type { Metadata } from "next";

export const metadata: Metadata = { title: "Admin: Early access" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
