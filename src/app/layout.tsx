import "./globals.css";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Prototype Builder — AgentForge",
  description: "AI-powered chatbot screen builder with surgical edits",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-slate-50 text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}
