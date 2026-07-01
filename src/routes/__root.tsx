import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import "@fontsource/fraunces/400.css";
import "@fontsource/fraunces/500.css";
import "@fontsource/fraunces/600.css";
import "@fontsource/fraunces/700.css";
// @ts-expect-error - side-effect font import has no types
import "@fontsource-variable/inter";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { Toaster } from "sonner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <div className="text-7xl">🦵</div>
        <h1 className="font-serif text-4xl mt-4 text-foreground">Page not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This page has taken a rest day. Let's get you back moving.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-surface px-5 py-2.5 text-sm font-medium text-surface-foreground hover:opacity-90 transition"
          >
            Back to articles
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-serif text-2xl text-foreground">Something's off</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <div className="mt-6 flex justify-center gap-2">
          <button
            onClick={() => { router.invalidate(); reset(); }}
            className="rounded-md bg-surface px-4 py-2 text-sm text-surface-foreground hover:opacity-90"
          >
            Try again
          </button>
          <a href="/" className="rounded-md border border-border px-4 py-2 text-sm hover:bg-muted">Home</a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Sthairya's Physio Journal" },
      { name: "description", content: "Evidence-based physiotherapy articles on conditions, treatments, and recent advances — from Sthairya Physiocare." },
      { property: "og:title", content: "Sthairya's Physio Journal" },
      { property: "og:description", content: "Evidence-based physiotherapy articles on conditions, treatments, and recent advances — from Sthairya Physiocare." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "Sthairya's Physio Journal" },
      { name: "twitter:description", content: "Evidence-based physiotherapy articles on conditions, treatments, and recent advances — from Sthairya Physiocare." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/fb90579d-212c-4a87-a9f0-3dbcb0b4978e/id-preview-7b08fd87--4b7fce2e-4729-417e-bafe-cbbbca58a870.lovable.app-1782880378872.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/fb90579d-212c-4a87-a9f0-3dbcb0b4978e/id-preview-7b08fd87--4b7fce2e-4729-417e-bafe-cbbbca58a870.lovable.app-1782880378872.png" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head><HeadContent /></head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
      <Toaster position="top-center" richColors />
    </QueryClientProvider>
  );
}
