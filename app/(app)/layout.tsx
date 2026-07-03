import { Header } from "@/components/shell/Header";
import { PrimaryNav } from "@/components/shell/PrimaryNav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-deep-indigo focus:px-4 focus:py-2 focus:text-white"
      >
        Skip to main content
      </a>
      <Header />
      <div className="flex flex-1">
        <PrimaryNav />
        <main id="main-content" tabIndex={-1} className="flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}
