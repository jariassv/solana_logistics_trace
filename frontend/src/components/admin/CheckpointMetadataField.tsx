"use client";

import { useMemo } from "react";

import {
    buildCheckpointMetadataJson,
    checkpointMetadataGroupLabel,
    CHECKPOINT_METADATA_TAGS,
    tagsByGroup,
    toggleMetadataTag,
    type CheckpointMetadataFormState,
} from "@/lib/checkpoint/checkpointMetadata";

export type CheckpointMetadataFieldProps = {
    idPrefix?: string;
    value: CheckpointMetadataFormState;
    onChange: (value: CheckpointMetadataFormState) => void;
    disabled?: boolean;
    /** Coordenadas opcionales incluidas en la vista previa / envío. */
    previewCoords?: { lat: number; lng: number } | null;
};

export function CheckpointMetadataField({
    idPrefix = "admin-cp-meta",
    value,
    onChange,
    disabled,
    previewCoords,
}: CheckpointMetadataFieldProps) {
    const groups = useMemo(() => tagsByGroup(), []);
    const { json: previewJson, error: previewError } = useMemo(
        () => buildCheckpointMetadataJson(value, previewCoords ?? null),
        [value, previewCoords],
    );

    const onTagChange = (tagId: string, checked: boolean) => {
        onChange({
            ...value,
            selectedTagIds: toggleMetadataTag(value.selectedTagIds, tagId, checked),
        });
    };

    return (
        <fieldset className="checkpoint-metadata-field" disabled={disabled}>
            <legend className="checkpoint-metadata-field__legend">
                Detalles del evento (opcional)
            </legend>
            <p className="text-sm text-muted checkpoint-metadata-field__hint mb-2">
                Marque las opciones que apliquen y añada un comentario si lo necesita. El sistema
                generará la metadata automáticamente.
            </p>

            {groups.map(({ group, tags }) => (
                <div className="checkpoint-metadata-field__group" key={group}>
                    <p className="checkpoint-metadata-field__group-title">
                        {checkpointMetadataGroupLabel(group)}
                    </p>
                    <ul className="checkpoint-metadata-field__options">
                        {tags.map((tag) => {
                            const inputId = `${idPrefix}-${tag.id}`;
                            const checked = value.selectedTagIds.includes(tag.id);
                            return (
                                <li key={tag.id}>
                                    <label className="checkpoint-metadata-field__option" htmlFor={inputId}>
                                        <input
                                            id={inputId}
                                            type="checkbox"
                                            checked={checked}
                                            onChange={(e) => onTagChange(tag.id, e.target.checked)}
                                        />
                                        <span>{tag.label}</span>
                                    </label>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            ))}

            <div className="form-group mb-0 mt-2">
                <label htmlFor={`${idPrefix}-comment`}>Comentario</label>
                <textarea
                    id={`${idPrefix}-comment`}
                    className="input checkpoint-metadata-field__comment"
                    rows={3}
                    placeholder="Ej. Entrega en recepción, firmado por Juan P."
                    value={value.comment}
                    onChange={(e) => onChange({ ...value, comment: e.target.value })}
                />
            </div>

            <details className="checkpoint-metadata-field__preview mt-2">
                <summary className="text-sm text-muted">Vista previa de metadata (JSON)</summary>
                <pre className="checkpoint-metadata-field__preview-code text-xs mono" aria-live="polite">
                    {previewJson || "{}"}
                </pre>
                {previewError ? (
                    <p className="text-sm admin-form__err mb-0" role="alert">
                        {previewError}
                    </p>
                ) : null}
            </details>
        </fieldset>
    );
}

/** Etiquetas legibles para ids guardados en metadata (detalle / tablas). */
export function labelForMetadataTag(tagId: string): string {
    return CHECKPOINT_METADATA_TAGS.find((t) => t.id === tagId)?.label ?? tagId;
}
