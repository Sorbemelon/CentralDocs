import { Link } from "react-router-dom";
import { Compass, Home } from "lucide-react";
import { Logo } from "@/components/common/Logo";
import { buttonVariants } from "@/components/ui/button";

function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4 text-center text-foreground">
      <Logo size="lg" />
      <div className="flex items-center gap-2 text-muted-foreground">
        <Compass className="size-4" />
        <span className="text-sm">404 — page not found</span>
      </div>
      <h1 className="text-2xl font-semibold tracking-tight">This page doesn’t exist</h1>
      <p className="max-w-[44ch] text-sm text-muted-foreground">
        The page you’re looking for isn’t here. Head back to the landing page or open the workspace.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Link to="/" className={buttonVariants({ size: "lg" })}>
          <Home className="size-4" /> Go home
        </Link>
        <Link to="/workspace" className={buttonVariants({ variant: "outline", size: "lg" })}>
          Open workspace
        </Link>
      </div>
    </div>
  );
}

export default NotFoundPage;
