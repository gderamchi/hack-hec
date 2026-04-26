import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { Toaster } from "sonner";
import { AuthProvider } from "@/hooks/useAuth";
import { CloudSync } from "@/components/complee/CloudSync";
import { AIAssistant } from "@/components/complee/AIAssistant";
import { useActiveStep } from "@/store/activeStep";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Complee — AI Compliance Consultant for FinTech" },
      {
        name: "description",
        content:
          "From licence in one country to readiness assessment in another — in five minutes, not five months.",
      },
      { property: "og:title", content: "Complee — AI Compliance Consultant for FinTech" },
      {
        property: "og:description",
        content: "AI-powered cross-border compliance readiness for European fintechs.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "Complee — AI Compliance Consultant for FinTech" },
      { name: "description", content: "Complee is an AI Compliance Consultant for European FinTechs expanding internationally." },
      { property: "og:description", content: "Complee is an AI Compliance Consultant for European FinTechs expanding internationally." },
      { name: "twitter:description", content: "Complee is an AI Compliance Consultant for European FinTechs expanding internationally." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/32ec927f-121a-4f89-b8fa-340021cb7a84/id-preview-57cd42b6--939a9799-8fae-4d53-b259-5a98025a914e.lovable.app-1777160208490.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/32ec927f-121a-4f89-b8fa-340021cb7a84/id-preview-57cd42b6--939a9799-8fae-4d53-b259-5a98025a914e.lovable.app-1777160208490.png" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const stepCtx = useActiveStep((s) => s.context);
  return (
    <AuthProvider>
      <CloudSync />
      <Outlet />
      <AIAssistant stepContext={stepCtx ?? undefined} />
      <Toaster position="bottom-right" richColors closeButton visibleToasts={3} />
    </AuthProvider>
  );
}
