import { PanelEtapa2Rail } from "@/components/panel/PanelEtapa2Rail";

/**
 * Shell del panel operativo (resumen y envíos): rail lateral + contenido.
 */
export default function PanelOperativoLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <div className="panel-etapa2-shell">
            <PanelEtapa2Rail />
            <div className="panel-etapa2-main">{children}</div>
        </div>
    );
}
