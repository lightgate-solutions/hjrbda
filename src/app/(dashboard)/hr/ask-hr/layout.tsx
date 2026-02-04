"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

export default function AskHrLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Create a client for React Query
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30 * 1000, // 30 seconds
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <section>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </section>
  );
}
