/**
 * Componente para gestionar deducciones de la declaración de renta
 */

import { useState } from 'react';
import { useRentaStore } from '@/store/rentaStore';
import { Plus, Edit2, Trash2, AlertCircle } from 'lucide-react';
import { DeduccionRenta } from '@/lib/db';
import { rentaCalculator } from '@/lib/renta';

const TIPOS_DEDUCCION = [
    { value: 'SALUD', label: 'Salud (EPS, Medicina Prepagada)', limite: '192 UVT anuales' },
    { value: 'EDUCACION', label: 'Educación', limite: '15% de ingresos' },
    { value: 'INTERESES_VIVIENDA', label: 'Intereses Vivienda', limite: '1200 UVT anuales' },
    { value: 'DEPENDIENTES', label: 'Dependientes', limite: '384 UVT por dependiente' },
    { value: 'OTROS', label: 'Otra Deducción', limite: 'Variable' }
];

export function DeductionManager() {
    const { deducciones, declaracionActual, agregarDeduccion, actualizarDeduccion, eliminarDeduccion } = useRentaStore();
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState<Partial<DeduccionRenta>>({
        tipo_deduccion: 'SALUD',
        concepto: '',
        monto: 0,
        documento_soporte: ''
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            // Calcular límite y monto deducido
            const limite = rentaCalculator.calcularLimiteDeduccion(
                formData.tipo_deduccion!,
                declaracionActual?.total_ingresos || 0
            );

            const montoDeducido = Math.min(formData.monto || 0, limite);

            const dataConLimite = {
                ...formData,
                monto_deducido: montoDeducido
            };

            if (editingId) {
                await actualizarDeduccion(editingId, dataConLimite);
            } else {
                await agregarDeduccion(dataConLimite);
            }

            resetForm();
        } catch (error) {
            console.error('Error al guardar deducción:', error);
        }
    };

    const handleEdit = (deduccion: DeduccionRenta) => {
        setFormData({
            tipo_deduccion: deduccion.tipo_deduccion,
            concepto: deduccion.concepto,
            monto: deduccion.monto,
            documento_soporte: deduccion.documento_soporte
        });
        setEditingId(deduccion.id);
        setShowForm(true);
    };

    const handleDelete = async (id: string) => {
        if (confirm('¿Está seguro de eliminar esta deducción?')) {
            await eliminarDeduccion(id);
        }
    };

    const resetForm = () => {
        setFormData({
            tipo_deduccion: 'SALUD',
            concepto: '',
            monto: 0,
            documento_soporte: ''
        });
        setEditingId(null);
        setShowForm(false);
    };

    const formatMoney = (value: number) => {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0
        }).format(value);
    };

    const totalSolicitado = deducciones.reduce((sum, ded) => sum + ded.monto, 0);
    const totalDeducido = deducciones.reduce((sum, ded) => sum + (ded.monto_deducido || ded.monto), 0);
    const totalRechazado = totalSolicitado - totalDeducido;

    // Calcular límite actual
    const limiteActual = formData.tipo_deduccion
        ? rentaCalculator.calcularLimiteDeduccion(formData.tipo_deduccion, declaracionActual?.total_ingresos || 0)
        : 0;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-medium text-gray-900">Deducciones</h3>
                    <p className="mt-1 text-sm text-gray-500">
                        Registra las deducciones permitidas por ley
                    </p>
                </div>
                <button
                    onClick={() => setShowForm(true)}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                >
                    <Plus className="h-4 w-4 mr-2" />
                    Agregar Deducción
                </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 rounded-lg p-4">
                    <div className="flex items-center">
                        <div className="ml-3">
                            <p className="text-sm font-medium text-blue-600">Total Solicitado</p>
                            <p className="text-2xl font-bold text-blue-900">{formatMoney(totalSolicitado)}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                    <div className="flex items-center">
                        <div className="ml-3">
                            <p className="text-sm font-medium text-green-600">Total Deducido</p>
                            <p className="text-2xl font-bold text-green-900">{formatMoney(totalDeducido)}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-red-50 rounded-lg p-4">
                    <div className="flex items-center">
                        <div className="ml-3">
                            <p className="text-sm font-medium text-red-600">Rechazado</p>
                            <p className="text-2xl font-bold text-red-900">{formatMoney(totalRechazado)}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Form */}
            {showForm && (
                <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                    <h4 className="text-md font-medium text-gray-900 mb-4">
                        {editingId ? 'Editar Deducción' : 'Nueva Deducción'}
                    </h4>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Tipo de Deducción</label>
                            <select
                                value={formData.tipo_deduccion}
                                onChange={(e) => setFormData({ ...formData, tipo_deduccion: e.target.value as any })}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                required
                            >
                                {TIPOS_DEDUCCION.map((tipo) => (
                                    <option key={tipo.value} value={tipo.value}>
                                        {tipo.label} - Límite: {tipo.limite}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {limiteActual > 0 && (
                            <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                                <div className="flex">
                                    <AlertCircle className="h-5 w-5 text-blue-400 mr-2" />
                                    <div className="text-sm text-blue-700">
                                        <p className="font-medium">Límite legal para esta deducción:</p>
                                        <p className="mt-1">{formatMoney(limiteActual)}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-gray-700">Concepto</label>
                            <input
                                type="text"
                                value={formData.concepto}
                                onChange={(e) => setFormData({ ...formData, concepto: e.target.value })}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                placeholder="Ej: Pago EPS mensual, Matrícula universidad..."
                                required
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Monto Solicitado</label>
                                <input
                                    type="number"
                                    value={formData.monto}
                                    onChange={(e) => setFormData({ ...formData, monto: parseFloat(e.target.value) || 0 })}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                    min="0"
                                    step="0.01"
                                    required
                                />
                                {formData.monto && formData.monto > limiteActual && (
                                    <p className="mt-1 text-sm text-red-600">
                                        Excede el límite legal. Se deducirá máximo {formatMoney(limiteActual)}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">Documento Soporte</label>
                                <input
                                    type="text"
                                    value={formData.documento_soporte}
                                    onChange={(e) => setFormData({ ...formData, documento_soporte: e.target.value })}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                    placeholder="Ej: Factura #12345"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end space-x-3">
                            <button
                                type="button"
                                onClick={resetForm}
                                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                            >
                                {editingId ? 'Actualizar' : 'Agregar'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* List */}
            <div className="bg-white rounded-lg border border-gray-200">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Tipo
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Concepto
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Solicitado
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Deducido
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Soporte
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Acciones
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {deducciones.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-sm text-gray-500">
                                        No hay deducciones registradas. Haz clic en "Agregar Deducción" para comenzar.
                                    </td>
                                </tr>
                            ) : (
                                deducciones.map((deduccion) => {
                                    const rechazado = deduccion.monto - (deduccion.monto_deducido || deduccion.monto);
                                    return (
                                        <tr key={deduccion.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                {TIPOS_DEDUCCION.find(t => t.value === deduccion.tipo_deduccion)?.label}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-500">
                                                {deduccion.concepto}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                                                {formatMoney(deduccion.monto)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                                                <span className={rechazado > 0 ? 'text-orange-600 font-medium' : 'text-green-600 font-medium'}>
                                                    {formatMoney(deduccion.monto_deducido || deduccion.monto)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-500">
                                                {deduccion.documento_soporte || '-'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <button
                                                    onClick={() => handleEdit(deduccion)}
                                                    className="text-blue-600 hover:text-blue-900 mr-3"
                                                >
                                                    <Edit2 className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(deduccion.id)}
                                                    className="text-red-600 hover:text-red-900"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
