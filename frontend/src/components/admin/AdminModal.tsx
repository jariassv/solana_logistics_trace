"use client";

import { useEffect, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";

export type AdminModalProps = {
    open: boolean;
    title: string;
    onClose: () => void;
    children: ReactNode;
    size?: "md" | "lg" | "xl";
};

function subscribeNoop() {
    return () => {};
}

export function AdminModal({ open, title, onClose, children, size = "md" }: AdminModalProps) {
    const mounted = useSyncExternalStore(subscribeNoop, () => true, () => false);

    useEffect(() => {
        if (!open) {
            return undefined;
        }
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                onClose();
            }
        };
        document.addEventListener("keydown", onKey);
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.removeEventListener("keydown", onKey);
            document.body.style.overflow = prev;
        };
    }, [open, onClose]);

    if (!open || !mounted) {
        return null;
    }

    const modal = (
        <>
            <div className="admin-modal__backdrop" role="presentation" onClick={onClose} />
            <div className="admin-modal__wrap">
                <div
                    className={`admin-modal admin-modal--${size}`}
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="admin-modal-title"
                >
                    <header className="admin-modal__hd">
                        <h2 id="admin-modal-title" className="admin-modal__title">
                            {title}
                        </h2>
                        <button
                            type="button"
                            className="admin-modal__close btn btn--ghost btn--sm"
                            aria-label="Cerrar"
                            onClick={onClose}
                        >
                            ×
                        </button>
                    </header>
                    <div className="admin-modal__bd">{children}</div>
                </div>
            </div>
        </>
    );

    return createPortal(
        <div className="admin-modal-root">{modal}</div>,
        document.body,
    );
}
