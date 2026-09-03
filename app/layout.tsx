import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Sidebar from "@/components/Sidebar";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MaMoneeeyy | AI Finance Tracker",
  description: "Track your finances with AI",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${inter.variable} h-full antialiased dark`}
    >
      <body className="min-h-full font-sans bg-zinc-950 text-zinc-100 selection:bg-emerald-500/30 overflow-hidden">
        <div className="flex h-screen relative">
          {/* Background Gradient Orbs for Glassmorphism effect */}
          <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-purple-600/20 rounded-full mix-blend-screen filter blur-[100px] animate-pulse pointer-events-none"></div>
          <div className="absolute top-[20%] right-[-10%] w-96 h-96 bg-emerald-600/20 rounded-full mix-blend-screen filter blur-[100px] animate-pulse pointer-events-none" style={{ animationDelay: '2s' }}></div>
          <div className="absolute bottom-[-20%] left-[20%] w-96 h-96 bg-blue-600/20 rounded-full mix-blend-screen filter blur-[100px] animate-pulse pointer-events-none" style={{ animationDelay: '4s' }}></div>
          
          <Sidebar />
          {children}
        </div>
      </body>
    </html>
  );
}
