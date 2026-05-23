import type { ShipmentDetailsFormState, ShipmentPriority } from "@/lib/shipment/shipmentDetailsForm";
import { buildShipmentSyncDetails } from "@/lib/shipment/shipmentDetailsForm";
import { ShipmentPriorityCode, type CreateShipmentExtras } from "@/lib/solana/ix";

export type ShipmentChainDetails = CreateShipmentExtras;

const MAX_NOTES_CHAIN = 256;

export { ShipmentPriorityCode };

function priorityToCode(p: ShipmentPriority): ShipmentPriorityCode {
    switch (p) {
        case "urgent":
            return ShipmentPriorityCode.Urgent;
        case "express":
            return ShipmentPriorityCode.Express;
        default:
            return ShipmentPriorityCode.Normal;
    }
}

/**
 * Convierte el formulario de detalles a argumentos `create_shipment` on-chain.
 */
export function shipmentDetailsToChainArgs(
    form: ShipmentDetailsFormState,
): { chain: ShipmentChainDetails; error?: string } {
    const built = buildShipmentSyncDetails(form);
    if (built.error) {
        return { chain: emptyChainDetails(), error: built.error };
    }

    const notes = form.notes.trim();
    if (notes.length > MAX_NOTES_CHAIN) {
        return {
            chain: emptyChainDetails(),
            error: `Notas: máximo ${MAX_NOTES_CHAIN} caracteres on-chain.`,
        };
    }

    const d = built.details;
    const weightGrams =
        d?.weight_kg != null ? Math.round(d.weight_kg * 1000) : 0;
    const quantity = d?.quantity ?? 0;
    const quantityUnit = d?.quantity_unit?.trim() ?? "";
    let estimatedDeliveryAt = BigInt(0);
    if (d?.estimated_delivery_at) {
        const ms = Date.parse(d.estimated_delivery_at);
        if (Number.isNaN(ms)) {
            return { chain: emptyChainDetails(), error: "Fecha de entrega estimada no válida." };
        }
        estimatedDeliveryAt = BigInt(Math.floor(ms / 1000));
    }

    return {
        chain: {
            weightGrams,
            quantity,
            quantityUnit,
            estimatedDeliveryAt,
            referenceCode: d?.reference_code?.trim() ?? "",
            priority: priorityToCode(form.priority),
            notes,
        },
    };
}

export function emptyChainDetails(): ShipmentChainDetails {
    return {
        weightGrams: 0,
        quantity: 0,
        quantityUnit: "",
        estimatedDeliveryAt: BigInt(0),
        referenceCode: "",
        priority: ShipmentPriorityCode.Normal,
        notes: "",
    };
}
