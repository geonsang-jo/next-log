import Link from "next/link";
import useIsRouteActive from "~hooks/useIsActive";
import { cn } from "~lib/utils";
import NavSheet from "../navSheet";

function PageNav() {
  const isArticleActive = useIsRouteActive("/article");
  const isResumeActive = useIsRouteActive("/resume");

  return (
    <div className="md:flex">
      <Link
        href="/posts"
        className="hidden md:flex mr-6 items-center space-x-2"
      >
        <span className="font-bold sm:inline-block">Geon-log</span>
      </Link>
      <nav className="hidden md:flex gap-6 items-center font-medium text-sm">
        <Link
          href="/posts"
          className={cn(
            "transition-colors hover:text-foreground/80 text-foreground/60",
            isArticleActive && "text-foreground"
          )}
        >
          Posts
        </Link>
        <Link
          href="/resume"
          className={cn(
            "transition-colors hover:text-foreground/80 text-foreground/60",
            isResumeActive && "text-foreground"
          )}
        >
          Resume
        </Link>
      </nav>
      <NavSheet />
    </div>
  );
}

export default PageNav;
