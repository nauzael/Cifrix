/**
 * Página principal del módulo de Declaración de Renta
 * Permite gestionar declaraciones de renta de forma completa
 */

import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useRentaStore } from '@/store/rentaStore';
import { Plus, FileText, Calculator, CheckCircle, AlertTriangle, Download, FileSpreadsheet, Landmark } from 'lucide-react';
import { DeclarationList } from '@/components/renta/DeclarationList';
import { DeclarationForm } from '@/components/renta/DeclarationForm';
import { IncomeManager } from '@/components/renta/IncomeManager';
import { DeductionManager } from '@/components/renta/DeductionManager';
import { AssetLiabilityManager } from '@/components/renta/AssetLiabilityManager';
import { TaxCalculator } from '@/components/renta/TaxCalculator';
import { DeclarationSummary } from '@/components/renta/DeclarationSummary';
import { ObligacionChecker } from '@/components/renta/ObligacionChecker';
import { ExogenaImporter } from '@/components/renta/ExogenaImporter';
import { rentaPDFGenerator, dianXMLGenerator } from '@/lib/renta';

type TabType = 'general' | 'ingresos' | 'deducciones' | 'patrimonio' | 'calculo' | 'resumen' | 'exogena';

export default function Renta() {
    const navigate = useNavigate();
    const { id } = useParams<{ id?: string }>();
    const [activeTab, setActiveTab] = useState<TabType>('general');
    const [showNewDeclaration, setShowNewDeclaration] = useState(false);
    const [showObligacionChecker, setShowObligacionChecker] = useState(false);

    const {
        declaraciones,
        declaracionActual,
        resultadoValidacion,
        loading,
        error,
        cargarDeclaraciones,
        cargarDeclaracion,
        crearDeclaracion,
        validarDeclaracion,
        limpiarEstado,
        eliminarDeclaracion
    } = useRentaStore();

    // Cargar declaraciones al montar
    useEffect(() => {
        cargarDeclaraciones();
    }, [cargarDeclaraciones]);

    // Cargar declaración específica si hay ID en la URL
    useEffect(() => {
        if (id) {
            cargarDeclaracion(id);
        } else {
            limpiarEstado();
        }
    }, [id, cargarDeclaracion, limpiarEstado]);

    // Manejar creación de nueva declaración
    const handleNuevaDeclaracion = async (data: any) => {
        try {
            const nuevaId = await crearDeclaracion(data);
            setShowNewDeclaration(false);
            navigate(`/renta/${nuevaId}`);
        } catch (error) {
            console.error('Error al crear declaración:', error);
        }
    };

    // Generar PDF
    const handleGenerarPDF = async () => {
        if (!declaracionActual) return;

        try {
            const blob = await rentaPDFGenerator.generarReporte(declaracionActual.id, {
                incluirDetalle: true,
                incluirCalculos: true,
                incluirGraficos: false
            });

            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `declaracion_renta_${declaracionActual.periodo_fiscal}_${declaracionActual.contribuyente_id}.pdf`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error al generar PDF:', error);
        }
    };

    // Generar XML DIAN
    const handleGenerarXML = async () => {
        if (!declaracionActual) return;

        try {
            const xml = await dianXMLGenerator.generarXML(declaracionActual.id);
            const blob = new Blob([xml], { type: 'application/xml' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `declaracion_renta_${declaracionActual.periodo_fiscal}_${declaracionActual.contribuyente_id}.xml`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error al generar XML:', error);
        }
    };

    const tabs = [
        { id: 'general' as TabType, label: 'Datos Generales', icon: FileText },
        { id: 'patrimonio' as TabType, label: 'Patrimonio', icon: Landmark },
        { id: 'ingresos' as TabType, label: 'Ingresos', icon: Plus },
        { id: 'deducciones' as TabType, label: 'Deducciones', icon: AlertTriangle },
        { id: 'exogena' as TabType, label: 'Exógena', icon: FileSpreadsheet },
        { id: 'calculo' as TabType, label: 'Cálculo', icon: Calculator },
        { id: 'resumen' as TabType, label: 'Resumen', icon: CheckCircle }
    ];

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">Declaración de Renta</h1>
                            <p className="mt-1 text-sm text-gray-500">
                                Gestiona las declaraciones de impuesto de renta
                            </p>
                        </div>
                        <div className="flex space-x-3">
                            <button
                                onClick={() => setShowObligacionChecker(true)}
                                className="inline-flex items-center px-4 py-2 border border-blue-600 rounded-md shadow-sm text-sm font-medium text-blue-600 bg-white hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                                <AlertTriangle className="h-5 w-5 mr-2" />
                                Verificar Obligación
                            </button>
                            <button
                                onClick={() => setShowNewDeclaration(true)}
                                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                                <Plus className="h-5 w-5 mr-2" />
                                Nueva Declaración
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* Sidebar - Lista de declaraciones */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-lg shadow">
                            <div className="p-4 border-b border-gray-200">
                                <h2 className="text-lg font-medium text-gray-900">Declaraciones</h2>
                            </div>
                            <DeclarationList
                                declaraciones={declaraciones}
                                declaracionActual={declaracionActual}
                                onSelect={(id) => navigate(`/renta/${id}`)}
                                onDelete={eliminarDeclaracion}
                                loading={loading}
                            />
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="lg:col-span-3">
                        {declaracionActual ? (
                            <>
                                {/* Tabs */}
                                <div className="bg-white rounded-lg shadow mb-6">
                                    <div className="border-b border-gray-200">
                                        <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
                                            {tabs.map((tab) => {
                                                const Icon = tab.icon;
                                                return (
                                                    <button
                                                        key={tab.id}
                                                        onClick={() => setActiveTab(tab.id)}
                                                        className={`
                              ${activeTab === tab.id
                                                                ? 'border-blue-500 text-blue-600'
                                                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                                            }
                              group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm
                            `}
                                                    >
                                                        <Icon className={`
                              ${activeTab === tab.id ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'}
                              -ml-0.5 mr-2 h-5 w-5
                            `} />
                                                        {tab.label}
                                                    </button>
                                                );
                                            })}
                                        </nav>
                                    </div>

                                    {/* Tab Content */}
                                    <div className="p-6">
                                        {activeTab === 'general' && <DeclarationForm />}
                                        {activeTab === 'patrimonio' && <AssetLiabilityManager />}
                                        {activeTab === 'ingresos' && <IncomeManager />}
                                        {activeTab === 'deducciones' && <DeductionManager />}
                                        {activeTab === 'exogena' && <ExogenaImporter />}
                                        {activeTab === 'calculo' && <TaxCalculator />}
                                        {activeTab === 'resumen' && <DeclarationSummary />}
                                    </div>
                                </div>

                                {/* Actions Bar */}
                                <div className="bg-white rounded-lg shadow p-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-4">
                                            {resultadoValidacion && (
                                                <div className={`flex items-center ${resultadoValidacion.valida ? 'text-green-600' : 'text-red-600'}`}>
                                                    {resultadoValidacion.valida ? (
                                                        <CheckCircle className="h-5 w-5 mr-2" />
                                                    ) : (
                                                        <AlertTriangle className="h-5 w-5 mr-2" />
                                                    )}
                                                    <span className="text-sm font-medium">
                                                        {resultadoValidacion.valida ? 'Declaración válida' : `${resultadoValidacion.errores.length} errores`}
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex items-center space-x-3">
                                            <button
                                                onClick={validarDeclaracion}
                                                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                                            >
                                                <CheckCircle className="h-4 w-4 mr-2" />
                                                Validar
                                            </button>
                                            <button
                                                onClick={handleGenerarPDF}
                                                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                                            >
                                                <Download className="h-4 w-4 mr-2" />
                                                PDF
                                            </button>
                                            <button
                                                onClick={handleGenerarXML}
                                                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                                            >
                                                <Download className="h-4 w-4 mr-2" />
                                                XML DIAN
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="bg-white rounded-lg shadow p-12 text-center">
                                <FileText className="mx-auto h-12 w-12 text-gray-400" />
                                <h3 className="mt-2 text-sm font-medium text-gray-900">No hay declaración seleccionada</h3>
                                <p className="mt-1 text-sm text-gray-500">
                                    Selecciona una declaración de la lista o crea una nueva.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Modal Nueva Declaración */}
            {showNewDeclaration && (
                <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-medium text-gray-900">Nueva Declaración de Renta</h3>
                            <button onClick={() => setShowNewDeclaration(false)} className="text-gray-400 hover:text-gray-500">
                                <span className="sr-only">Cerrar</span>
                                <Plus className="h-6 w-6 transform rotate-45" />
                            </button>
                        </div>
                        <DeclarationForm
                            isNew
                            onSubmit={handleNuevaDeclaracion}
                            onCancel={() => setShowNewDeclaration(false)}
                        />
                    </div>
                </div>
            )}

            {/* Modal Obligación Checker */}
            {showObligacionChecker && (
                <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 relative">
                        <button
                            onClick={() => setShowObligacionChecker(false)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-500"
                        >
                            <span className="sr-only">Cerrar</span>
                            <Plus className="h-6 w-6 transform rotate-45" />
                        </button>
                        <ObligacionChecker />
                    </div>
                </div>
            )}

            {/* Error Toast */}
            {error && (
                <div className="fixed bottom-4 right-4 bg-red-50 border border-red-200 rounded-lg p-4 shadow-lg">
                    <div className="flex items-center">
                        <AlertTriangle className="h-5 w-5 text-red-400 mr-2" />
                        <p className="text-sm text-red-800">{error}</p>
                    </div>
                </div>
            )}
        </div>
    );
}
