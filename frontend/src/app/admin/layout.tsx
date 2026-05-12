/**
 * Shell del panel administrativo por rol (MVP: navegación y tarjetas por rol).
 */
export default function AdminLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return <div className="admin-layout">{children}</div>;
}
