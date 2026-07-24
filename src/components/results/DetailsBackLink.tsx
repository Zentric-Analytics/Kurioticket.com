import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { LinkButton } from "@/components/ui/Button";

type DetailsBackLinkProps = {
  href: string;
  children: ReactNode;
};

export function DetailsBackLink({
  href,
  children,
}: DetailsBackLinkProps) {
  return (
    <LinkButton
      href={href}
      variant="ghost"
      size="sm"
      className="-ms-2 w-fit px-2 text-slate-700 hover:text-navy"
    >
      <ArrowLeft
        className="h-4 w-4 shrink-0"
        aria-hidden="true"
      />
      <span>{children}</span>
    </LinkButton>
  );
}
