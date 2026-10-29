import type { Metadata } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-sans" });

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
});

export const metadata: Metadata = {
  title: { default: "Aksara", template: "%s · Aksara" },
  description: "Belajar dan ulangan kelas VI.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="id"
      className={cn("h-full", "antialiased", jetbrainsMono.variable, "font-sans", jakarta.variable)}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
