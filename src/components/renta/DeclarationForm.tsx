/**
 * Formulario de datos generales de la declaración
 */

import { useState, useEffect } from 'react';
import { useRentaStore } from '@/store/rentaStore';
import { useAuthStore } from '@/store/authStore';

interface DeclarationFormProps {
    isNew?: boolean;
    onSubmit?: (data: any) => void;
    onCancel?: () => void;
}

export function DeclarationForm({ isNew = false, onSubmit, onCancel }: DeclarationFormProps) {
    const { declaracionActual, actualizarDeclaracion } = useRentaStore();
    const { currentOrganization } = useAuthStore();

    const [formData, setFormData] = useState({
        periodo_fiscal: declaracionActual?.periodo_fiscal || new Date().getFullYear() - 1,
        contribuyente_id: declaracionActual?.contribuyente_id || currentOrganization?.tax_id || '',
        contribuyente_nombre: declaracionActual?.contribuyente_nombre || currentOrganization?.name || '',
        total_costos: declaracionActual?.total_costos || 0,
        total_gastos: declaracionActual?.total_gastos || 0,
        creditos_tributarios: declaracionActual?.creditos_tributarios || 0,
        estado: declaracionActual?.estado || 'BORRADOR'
    });

    useEffect(() => {
        if (declaracionActual && !isNew) {
            setFormData({
                periodo_fiscal: declaracionActual.periodo_fiscal,
                contribuyente_id: declaracionActual.contribuyente_id,
                contribuyente_nombre: declaracionActual.contribuyente_nombre,
                total_costos: declaracionActual.total_costos,
                total_gastos: declaracionActual.total_gastos,
                creditos_tributarios: declaracionActual.creditos_tributarios,
                estado: declaracionActual.estado
            });
        }
    }, [declaracionActual, isNew]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (isNew && onSubmit) {
            onSubmit(formData);
        } else if (declaracionActual) {
            await actualizarDeclaracion(declaracionActual.id, formData);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Período Fiscal</label>
                    <select
                        value={formData.periodo_fiscal}
                        onChange={(e) => setFormData({ ...formData, periodo_fiscal: parseInt(e.target.value) })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        required
                    >
                        {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map((year) => (
                            <option key={year} value={year}>{year}</option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">Estado</label>
                    <select
                        value={formData.estado}
                        onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        required
                    >
                        <option value="BORRADOR">Borrador</option>
                        <option value="PRESENTADA">Presentada</option>
                        <option value="CORREGIDA">Corregida</option>
                        <option value="ANULADA">Anulada</option>
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700">NIT/Cédula</label>
                    <input
                        type="text"
                        value={formData.contribuyente_id}
                        onChange={(e) => setFormData({ ...formData, contribuyente_id: e.target.value })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        placeholder="123456789"
                        required
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">Nombre/Razón Social</label>
                    <input
                        type="text"
                        value={formData.contribuyente_nombre}
                        onChange={(e) => setFormData({ ...formData, contribuyente_nombre: e.target.value })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        placeholder="Nombre completo o razón social"
                        required
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Total Costos</label>
                    <input
                        type="number"
                        value={formData.total_costos}
                        onChange={(e) => setFormData({ ...formData, total_costos: parseFloat(e.target.value) || 0 })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        min="0"
                        step="0.01"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">Total Gastos</label>
                    <input
                        type="number"
                        value={formData.total_gastos}
                        onChange={(e) => setFormData({ ...formData, total_gastos: parseFloat(e.target.value) || 0 })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        min="0"
                        step="0.01"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">Créditos Tributarios</label>
                    <input
                        type="number"
                        value={formData.creditos_tributarios}
                        onChange={(e) => setFormData({ ...formData, creditos_tributarios: parseFloat(e.target.value) || 0 })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        min="0"
                        step="0.01"
                    />
                </div>
            </div>

            {!isNew && (
                <div className="flex justify-end">
                    <button
                        type="submit"
                        className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                    >
                        Guardar Cambios
                    </button>
                </div>
            )}

            {isNew && (
                <div className="flex justify-end space-x-3">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                    >
                        Crear Declaración
                    </button>
                </div>
            )}
        </form>
    );
}
