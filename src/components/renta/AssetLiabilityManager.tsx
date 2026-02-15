
import { useState } from 'react';
import { useRentaStore } from '@/store/rentaStore';
import { Plus, Edit2, Trash2, DollarSign, TrendingUp, TrendingDown } from 'lucide-react';
import { ActivoPasivoRenta } from '@/lib/db';

export function AssetLiabilityManager() {
    const { activosPasivos, agregarActivoPasivo, actualizarActivoPasivo, eliminarActivoPasivo } = useRentaStore();
    const [activeTab, setActiveTab] = useState<'ACTIVO' | 'PASIVO'>('ACTIVO');

    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState<Partial<ActivoPasivoRenta>>({
        tipo: 'ACTIVO',
        categoria: 'OTROS',
        descripcion: '',
        valor: 0
    });

    const CATEGORIAS_ACTIVO = [
        { value: 'PATRIMONIO_BRUTO', label: 'Patrimonio Bruto (General)' },
        { value: 'EFECTIVO', label: 'Efectivo y Equivalentes' },
        { value: 'INVERSIONES', label: 'Inversiones' },
        { value: 'CUENTAS_POR_COBRAR', label: 'Cuentas por Cobrar' },
        { value: 'ACTIVOS_FIJOS', label: 'Activos Fijos / Propiedades' },
        { value: 'OTROS', label: 'Otros Activos' }
    ];

    const CATEGORIAS_PASIVO = [
        { value: 'DEUDAS', label: 'Deudas (General)' },
        { value: 'FINANCIERAS', label: 'Obligaciones Financieras' },
        { value: 'PROVEEDORES', label: 'Proveedores' },
        { value: 'IMPUESTOS', label: 'Impuestos por Pagar' },
        { value: 'LABORALES', label: 'Obligaciones Laborales' },
        { value: 'OTROS', label: 'Otros Pasivos' }
    ];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const dataToSave = { ...formData, tipo: activeTab };
            if (editingId) {
                await actualizarActivoPasivo(editingId, dataToSave);
            } else {
                await agregarActivoPasivo(dataToSave);
            }
            resetForm();
        } catch (error) {
            console.error('Error saving asset/liability:', error);
        }
    };

    const handleEdit = (item: ActivoPasivoRenta) => {
        setFormData({
            tipo: item.tipo,
            categoria: item.categoria,
            descripcion: item.descripcion,
            valor: item.valor
        });
        setEditingId(item.id);
        setActiveTab(item.tipo); // Ensure we are on the correct tab
        setShowForm(true);
    };

    const handleDelete = async (id: string) => {
        if (confirm('¿Está seguro de eliminar este registro?')) {
            await eliminarActivoPasivo(id);
        }
    };

    const resetForm = () => {
        setFormData({
            tipo: activeTab,
            categoria: 'OTROS',
            descripcion: '',
            valor: 0
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

    const filteredItems = activosPasivos.filter(item => item.tipo === activeTab);
    const totalValor = filteredItems.reduce((sum, item) => sum + item.valor, 0);

    // Calculate Patrimony (Net Worth)
    const totalActivos = activosPasivos.filter(i => i.tipo === 'ACTIVO').reduce((s, i) => s + i.valor, 0);
    const totalPasivos = activosPasivos.filter(i => i.tipo === 'PASIVO').reduce((s, i) => s + i.valor, 0);
    const patrimonioLiquido = totalActivos - totalPasivos;

    return (
        <div className="space-y-6">
            {/* Header & Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                    <div className="flex items-center">
                        <TrendingUp className="h-8 w-8 text-blue-600" />
                        <div className="ml-3">
                            <p className="text-sm font-medium text-blue-600">Total Activos</p>
                            <p className="text-2xl font-bold text-blue-900">{formatMoney(totalActivos)}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-red-50 rounded-lg p-4 border border-red-100">
                    <div className="flex items-center">
                        <TrendingDown className="h-8 w-8 text-red-600" />
                        <div className="ml-3">
                            <p className="text-sm font-medium text-red-600">Total Pasivos</p>
                            <p className="text-2xl font-bold text-red-900">{formatMoney(totalPasivos)}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-green-50 rounded-lg p-4 border border-green-100">
                    <div className="flex items-center">
                        <DollarSign className="h-8 w-8 text-green-600" />
                        <div className="ml-3">
                            <p className="text-sm font-medium text-green-600">Patrimonio Líquido</p>
                            <p className="text-2xl font-bold text-green-900">{formatMoney(patrimonioLiquido)}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                    <button
                        onClick={() => { setActiveTab('ACTIVO'); setShowForm(false); }}
                        className={`${activeTab === 'ACTIVO' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
                    >
                        <TrendingUp className="w-4 h-4 mr-2" />
                        Activos (Bienes y Derechos)
                    </button>
                    <button
                        onClick={() => { setActiveTab('PASIVO'); setShowForm(false); }}
                        className={`${activeTab === 'PASIVO' ? 'border-red-500 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
                    >
                        <TrendingDown className="w-4 h-4 mr-2" />
                        Pasivos (Deudas y Obligaciones)
                    </button>
                </nav>
            </div>

            {/* Sub-Header Actions */}
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">
                    Gestión de {activeTab === 'ACTIVO' ? 'Activos' : 'Pasivos'}
                </h3>
                <button
                    onClick={() => { resetForm(); setShowForm(true); }}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                >
                    <Plus className="h-4 w-4 mr-2" />
                    Agregar {activeTab === 'ACTIVO' ? 'Activo' : 'Pasivo'}
                </button>
            </div>

            {/* Form */}
            {showForm && (
                <div className="bg-gray-50 rounded-lg p-6 border border-gray-200 animate-fade-in-up">
                    <h4 className="text-md font-medium text-gray-900 mb-4">
                        {editingId ? 'Editar Detalle' : `Nuevo ${activeTab === 'ACTIVO' ? 'Activo' : 'Pasivo'}`}
                    </h4>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Categoría</label>
                                <select
                                    value={formData.categoria}
                                    onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                    required
                                >
                                    {(activeTab === 'ACTIVO' ? CATEGORIAS_ACTIVO : CATEGORIAS_PASIVO).map((cat) => (
                                        <option key={cat.value} value={cat.value}>{cat.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Valor</label>
                                <input
                                    type="number"
                                    value={formData.valor}
                                    onChange={(e) => setFormData({ ...formData, valor: parseFloat(e.target.value) || 0 })}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                    min="0"
                                    required
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Descripción / Detalle</label>
                            <input
                                type="text"
                                value={formData.descripcion}
                                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                placeholder={`Descripción del ${activeTab.toLowerCase()}`}
                                required
                            />
                        </div>
                        <div className="flex justify-end space-x-3 pt-2">
                            <button
                                type="button"
                                onClick={() => setShowForm(false)}
                                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                            >
                                {editingId ? 'Actualizar' : 'Guardar'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* List */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Categoría</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descripción</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Valor</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {filteredItems.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="px-6 py-12 text-center text-sm text-gray-500">
                                    No hay {activeTab === 'ACTIVO' ? 'activos' : 'pasivos'} registrados.
                                </td>
                            </tr>
                        ) : (
                            filteredItems.map((item) => (
                                <tr key={item.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {(activeTab === 'ACTIVO' ? CATEGORIAS_ACTIVO : CATEGORIAS_PASIVO).find(c => c.value === item.categoria)?.label || item.categoria}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-900">
                                        {item.descripcion}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
                                        {formatMoney(item.valor)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button
                                            onClick={() => handleEdit(item)}
                                            className="text-blue-600 hover:text-blue-900 mr-3"
                                        >
                                            <Edit2 className="h-4 w-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(item.id)}
                                            className="text-red-600 hover:text-red-900"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                    <tfoot className="bg-gray-50">
                        <tr>
                            <td colSpan={2} className="px-6 py-4 text-sm font-bold text-gray-900 text-right">Total {activeTab === 'ACTIVO' ? 'Activos' : 'Pasivos'}:</td>
                            <td className="px-6 py-4 text-sm font-bold text-gray-900 text-right">{formatMoney(totalValor)}</td>
                            <td></td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );
}
