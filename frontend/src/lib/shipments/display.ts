/** Presentación compartida de envíos (badges, etiquetas de rol). */

export function statusBadgeClass(status: string): string {
    switch (status) {
        case "Delivered":
            return "badge badge--success";
        case "Cancelled":
            return "badge badge--danger";
        case "OutForDelivery":
            return "badge badge--info";
        default:
            return "badge badge--neutral";
    }
}

export function roleDisplayName(role: string | null): string {
    if (!role) {
        return "Sin rol en backend";
    }
    return role;
}
