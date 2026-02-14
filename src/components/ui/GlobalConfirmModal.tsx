import React from 'react';
import { useConfirmStore } from '../../store/confirmStore';
import { ConfirmationModal } from './ConfirmationModal';

export function GlobalConfirmModal() {
    const { isOpen, options, close } = useConfirmStore();

    if (!options) return null;

    return (
        <ConfirmationModal
            isOpen={isOpen}
            onClose={close}
            onConfirm={(value) => {
                options.onConfirm(value);
                close();
            }}
            title={options.title}
            message={options.message}
            confirmText={options.confirmText}
            cancelText={options.cancelText}
            type={options.type}
            inputType={options.inputType}
            inputPlaceholder={options.inputPlaceholder}
            defaultValue={options.defaultValue}
        />
    );
}
