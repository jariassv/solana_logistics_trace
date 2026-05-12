import Link from "next/link";

/** Alta de actor on-chain + sync (Etapa 1); flujo dedicado sin mezclar con consulta pública. */
export default function RegistroActorPage() {
    return (
        <main className="page-main">
            <div className="shell" style={{ maxWidth: "40rem" }}>
                <h1 className="page-title">Registro de actor</h1>
                <p className="page-sub">
                    Registre su organización como actor en el programa (remitente, transportista, hub,
                    receptor o inspector). La firma ocurre en Phantom; el backend indexa la cuenta vía
                    sync.
                </p>
                <div className="card mt-2">
                    <div className="card__hd">Flujo técnico</div>
                    <div className="card__bd space-y-3 text-sm">
                        <ol className="pl-4 mb-0 space-y-2">
                            <li>Conecte la wallet con el botón del encabezado.</li>
                            <li>Abra la demo Etapa 1 y complete el registro on-chain.</li>
                            <li>Espere la sincronización o use el endpoint de sync del backend.</li>
                        </ol>
                        <Link prefetch={false} className="btn btn--primary" href="/demo">
                            Ir a demo de registro
                        </Link>
                        <p className="text-muted mb-0">
                            Tras registrarse, use{" "}
                            <Link prefetch={false} href="/admin">
                                Admin
                            </Link>{" "}
                            para ver las acciones permitidas según su rol.
                        </p>
                    </div>
                </div>
            </div>
        </main>
    );
}
