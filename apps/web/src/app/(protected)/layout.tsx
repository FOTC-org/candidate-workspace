import { Navigation } from "@/components/core/navigation";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <main className="container mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
