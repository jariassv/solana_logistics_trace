/** Presentación compartida de envíos (badges, etiquetas de rol). */

export function statusBadgeClass(status: string): string {
    switch (status) {
        case "Delivered":
            return "badge badge--success";
        case "Cancelled":
        case "Lost":
            return "badge badge--danger";
        case "OutForDelivery":
            return "badge badge--info";
        case "InTransit":
            return "badge badge--info";
        case "AtHub":
            return "badge badge--neutral";
        case "Created":
            return "badge badge--muted";
        default:
            return "badge badge--neutral";
    }
}

export function statusLabel(status: string): string {
    const map: Record<string, string> = {
        Created: "Creado",
        InTransit: "En tránsito",
        AtHub: "En hub",
        OutForDelivery: "En reparto",
        Delivered: "Entregado",
        Returned: "Devuelto",
        Cancelled: "Cancelado",
        Lost: "Pérdida",
    };
    return map[status] ?? status;
}

export function roleDisplayName(role: string | null): string {
    if (!role) {
        return "Sin rol";
    }
    const map: Record<string, string> = {
        Sender: "Remitente",
        Carrier: "Transportista",
        Hub: "Hub logístico",
        Recipient: "Destinatario",
        Inspector: "Inspector",
    };
    return map[role] ?? role;
}
