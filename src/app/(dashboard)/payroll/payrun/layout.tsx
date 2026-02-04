"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

export default function PayrunLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const queryClient = new QueryClient();
  return (
    <section>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </section>
  );
}
