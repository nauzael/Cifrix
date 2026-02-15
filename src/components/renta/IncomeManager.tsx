/**
 * Componente para gestionar ingresos de la declaración de renta
 */

import { useState } from 'react';
import { useRentaStore } from '@/store/rentaStore';
import { Plus, Edit2, Trash2, DollarSign } from 'lucide-react';
import { IngresoRenta } from '@/lib/db';

export function IncomeManager() {
    const { ingresos, declaracionActual, agregarIngreso, actualizarIngreso, eliminarIngreso } = useRentaStore();

    const ALL_TIPOS_INGRESO = [
        // Persona Natural
        { value: 'LABORAL', label: 'Ingresos Laborales' },
        { value: 'HONORARIOS', label: 'Honorarios' },
        { value: 'RENTAS', label: 'Arrendamientos' },
        { value: 'CAPITAL', label: 'Rendimientos Financieros' },
        { value: 'DIVIDENDOS', label: 'Dividendos' },
        // Persona Jurídica
        { value: 'OPERACIONAL', label: 'Ingresos Operacionales' },
        { value: 'NO_OPERACIONAL', label: 'Ingresos No Operacionales' },
        { value: 'FINANCIERO', label: 'Ingresos Financieros' },
        { value: 'EXTRAORDINARIO', label: 'Ingresos Extraordinarios' },
        // Común
        { value: 'OTROS', label: 'Otros Ingresos' }
    ];

    // Tipos dinámicos para el select según el tipo de contribuyente
    const TIPOS_INGRESO = declaracionActual?.tipo_contribuyente === 'PERSONA_NATURAL'
        ? ALL_TIPOS_INGRESO.filter(t => ['LABORAL', 'HONORARIOS', 'RENTAS', 'CAPITAL', 'DIVIDENDOS', 'OTROS'].includes(t.value))
        : ALL_TIPOS_INGRESO.filter(t => ['OPERACIONAL', 'NO_OPERACIONAL', 'FINANCIERO', 'EXTRAORDINARIO', 'OTROS'].includes(t.value));

    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState<Partial<IngresoRenta>>({
        tipo_ingreso: 'LABORAL',
        concepto: '',
        monto: 0,
        retencion_aplicada: 0
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            if (editingId) {
                await actualizarIngreso(editingId, formData);
            } else {
                await agregarIngreso(formData);
            }

            resetForm();
        } catch (error) {
            console.error('Error al guardar ingreso:', error);
        }
    };

    const handleEdit = (ingreso: IngresoRenta) => {
        setFormData({
            tipo_ingreso: ingreso.tipo_ingreso,
            concepto: ingreso.concepto,
            monto: ingreso.monto,
            retencion_aplicada: ingreso.retencion_aplicada,
            mes: ingreso.mes
        });
        setEditingId(ingreso.id);
        setShowForm(true);
    };

    const handleDelete = async (id: string) => {
        if (confirm('¿Está seguro de eliminar este ingreso?')) {
            await eliminarIngreso(id);
        }
    };

    const resetForm = () => {
        setFormData({
            tipo_ingreso: 'LABORAL',
            concepto: '',
            monto: 0,
            retencion_aplicada: 0
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

    const totalIngresos = ingresos.reduce((sum, ing) => sum + ing.monto, 0);
    const totalRetenciones = ingresos.reduce((sum, ing) => sum + ing.retencion_aplicada, 0);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-medium text-gray-900">Ingresos</h3>
                    <p className="mt-1 text-sm text-gray-500">
                        Registra todos los ingresos recibidos durante el período fiscal
                    </p>
                </div>
                <button
                    onClick={() => setShowForm(true)}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                >
                    <Plus className="h-4 w-4 mr-2" />
                    Agregar Ingreso
                </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 rounded-lg p-4">
                    <div className="flex items-center">
                        <DollarSign className="h-8 w-8 text-blue-600" />
                        <div className="ml-3">
                            <p className="text-sm font-medium text-blue-600">Total Ingresos</p>
                            <p className="text-2xl font-bold text-blue-900">{formatMoney(totalIngresos)}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                    <div className="flex items-center">
                        <DollarSign className="h-8 w-8 text-green-600" />
                        <div className="ml-3">
                            <p className="text-sm font-medium text-green-600">Retenciones</p>
                            <p className="text-2xl font-bold text-green-900">{formatMoney(totalRetenciones)}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-purple-50 rounded-lg p-4">
                    <div className="flex items-center">
                        <DollarSign className="h-8 w-8 text-purple-600" />
                        <div className="ml-3">
                            <p className="text-sm font-medium text-purple-600">Cantidad</p>
                            <p className="text-2xl font-bold text-purple-900">{ingresos.length}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Form */}
            {showForm && (
                <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                    <h4 className="text-md font-medium text-gray-900 mb-4">
                        {editingId ? 'Editar Ingreso' : 'Nuevo Ingreso'}
                    </h4>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Tipo de Ingreso</label>
                                <select
                                    value={formData.tipo_ingreso}
                                    onChange={(e) => setFormData({ ...formData, tipo_ingreso: e.target.value as any })}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                    required
                                >
                                    {TIPOS_INGRESO.map((tipo) => (
                                        <option key={tipo.value} value={tipo.value}>{tipo.label}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">Mes (opcional)</label>
                                <select
                                    value={formData.mes || ''}
                                    onChange={(e) => setFormData({ ...formData, mes: e.target.value ? parseInt(e.target.value) : undefined })}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                >
                                    <option value="">Anual</option>
                                    {Array.from({ length: 12 }, (_, i) => i + 1).map((mes) => (
                                        <option key={mes} value={mes}>
                                            {new Date(2024, mes - 1).toLocaleString('es-CO', { month: 'long' })}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">Concepto</label>
                            <input
                                type="text"
                                value={formData.concepto}
                                onChange={(e) => setFormData({ ...formData, concepto: e.target.value })}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                placeholder="Ej: Salario mensual, Honorarios por consultoría..."
                                required
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Monto</label>
                                <input
                                    type="number"
                                    value={formData.monto}
                                    onChange={(e) => setFormData({ ...formData, monto: parseFloat(e.target.value) || 0 })}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                    min="0"
                                    step="0.01"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">Retención Aplicada</label>
                                <input
                                    type="number"
                                    value={formData.retencion_aplicada}
                                    onChange={(e) => setFormData({ ...formData, retencion_aplicada: parseFloat(e.target.value) || 0 })}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                    min="0"
                                    step="0.01"
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
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Período
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Monto
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Retención
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Acciones
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {ingresos.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-sm text-gray-500">
                                        No hay ingresos registrados. Haz clic en "Agregar Ingreso" para comenzar.
                                    </td>
                                </tr>
                            ) : (
                                ingresos.map((ingreso) => (
                                    <tr key={ingreso.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                            {ALL_TIPOS_INGRESO.find(t => t.value === ingreso.tipo_ingreso)?.label || ingreso.tipo_ingreso}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500">
                                            {ingreso.concepto}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {ingreso.mes ? `Mes ${ingreso.mes}` : 'Anual'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                                            {formatMoney(ingreso.monto)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500">
                                            {formatMoney(ingreso.retencion_aplicada)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <button
                                                onClick={() => handleEdit(ingreso)}
                                                className="text-blue-600 hover:text-blue-900 mr-3"
                                            >
                                                <Edit2 className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(ingreso.id)}
                                                className="text-red-600 hover:text-red-900"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
