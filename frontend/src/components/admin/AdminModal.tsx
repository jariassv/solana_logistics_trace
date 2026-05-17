"use client";

import { useEffect, type ReactNode } from "react";

export type AdminModalProps = {
    open: boolean;
    title: string;
    onClose: () => void;
    children: ReactNode;
    size?: "md" | "lg" | "xl";
};

export function AdminModal({ open, title, onClose, children, size = "md" }: AdminModalProps) {
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

    if (!open) {
        return null;
    }

    return (
        <div className="admin-modal-root">
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
        </div>
    );
}
