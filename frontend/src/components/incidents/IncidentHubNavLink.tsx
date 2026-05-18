import Link from "next/link";

export type IncidentHubNavLinkProps = {
    className?: string;
};

/** Enlace al centro de incidencias (`/panel/incidentes`). */
export function IncidentHubNavLink({
    className = "btn btn--ghost btn--sm",
}: IncidentHubNavLinkProps) {
    return (
        <Link prefetch={false} className={className} href="/panel/incidentes">
            Centro de incidencias
        </Link>
    );
}
