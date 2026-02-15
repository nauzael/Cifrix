/**
 * Resumen visual de la declaración con validaciones
 */

import { useRentaStore } from '@/store/rentaStore';
import { CheckCircle, AlertTriangle, XCircle, Info } from 'lucide-react';

export function DeclarationSummary() {
    const { declaracionActual, resultadoCalculo, resultadoValidacion, ingresos, deducciones } = useRentaStore();

    if (!declaracionActual) {
        return (
            <div className="text-center py-12">
                <Info className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No hay declaración seleccionada</h3>
            </div>
        );
    }

    const formatMoney = (value: number) => {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0
        }).format(value);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h3 className="text-lg font-medium text-gray-900">Resumen de la Declaración</h3>
                <p className="mt-1 text-sm text-gray-500">
                    Vista general de la declaración de renta
                </p>
            </div>

            {/* Validación */}
            {resultadoValidacion && (
                <div className={`rounded-lg border p-4 ${resultadoValidacion.valida
                        ? 'bg-green-50 border-green-200'
                        : 'bg-red-50 border-red-200'
                    }`}>
                    <div className="flex items-start">
                        {resultadoValidacion.valida ? (
                            <CheckCircle className="h-5 w-5 text-green-400 mt-0.5" />
                        ) : (
                            <XCircle className="h-5 w-5 text-red-400 mt-0.5" />
                        )}
                        <div className="ml-3 flex-1">
                            <h4 className={`text-sm font-medium ${resultadoValidacion.valida ? 'text-green-800' : 'text-red-800'
                                }`}>
                                {resultadoValidacion.valida ? 'Declaración Válida' : 'Errores de Validación'}
                            </h4>

                            {resultadoValidacion.errores.length > 0 && (
                                <ul className="mt-2 text-sm text-red-700 list-disc list-inside space-y-1">
                                    {resultadoValidacion.errores.map((error, index) => (
                                        <li key={index}>{error}</li>
                                    ))}
                                </ul>
                            )}

                            {resultadoValidacion.advertencias.length > 0 && (
                                <div className="mt-3">
                                    <p className="text-sm font-medium text-yellow-800 flex items-center">
                                        <AlertTriangle className="h-4 w-4 mr-1" />
                                        Advertencias
                                    </p>
                                    <ul className="mt-1 text-sm text-yellow-700 list-disc list-inside space-y-1">
                                        {resultadoValidacion.advertencias.map((advertencia, index) => (
                                            <li key={index}>{advertencia}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {resultadoValidacion.informacion.length > 0 && (
                                <div className="mt-3">
                                    <p className="text-sm font-medium text-blue-800 flex items-center">
                                        <Info className="h-4 w-4 mr-1" />
                                        Información
                                    </p>
                                    <ul className="mt-1 text-sm text-blue-700 list-disc list-inside space-y-1">
                                        {resultadoValidacion.informacion.map((info, index) => (
                                            <li key={index}>{info}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Datos del Contribuyente */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                    <h4 className="text-md font-medium text-gray-900">Datos del Contribuyente</h4>
                </div>
                <div className="p-6">
                    <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <dt className="text-sm font-medium text-gray-500">NIT/Cédula</dt>
                            <dd className="mt-1 text-sm text-gray-900">{declaracionActual.contribuyente_id}</dd>
                        </div>
                        <div>
                            <dt className="text-sm font-medium text-gray-500">Nombre/Razón Social</dt>
                            <dd className="mt-1 text-sm text-gray-900">{declaracionActual.contribuyente_nombre}</dd>
                        </div>
                        <div>
                            <dt className="text-sm font-medium text-gray-500">Período Fiscal</dt>
                            <dd className="mt-1 text-sm text-gray-900">{declaracionActual.periodo_fiscal}</dd>
                        </div>
                        <div>
                            <dt className="text-sm font-medium text-gray-500">Estado</dt>
                            <dd className="mt-1">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${declaracionActual.estado === 'PRESENTADA' ? 'bg-green-100 text-green-800' :
                                        declaracionActual.estado === 'BORRADOR' ? 'bg-yellow-100 text-yellow-800' :
                                            declaracionActual.estado === 'CORREGIDA' ? 'bg-blue-100 text-blue-800' :
                                                'bg-red-100 text-red-800'
                                    }`}>
                                    {declaracionActual.estado}
                                </span>
                            </dd>
                        </div>
                    </dl>
                </div>
            </div>

            {/* Estadísticas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                    <h5 className="text-sm font-medium text-gray-500 mb-3">Ingresos</h5>
                    <p className="text-2xl font-bold text-gray-900">{ingresos.length}</p>
                    <p className="text-sm text-gray-500 mt-1">registros</p>
                </div>
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                    <h5 className="text-sm font-medium text-gray-500 mb-3">Deducciones</h5>
                    <p className="text-2xl font-bold text-gray-900">{deducciones.length}</p>
                    <p className="text-sm text-gray-500 mt-1">registros</p>
                </div>
            </div>

            {/* Resumen Financiero */}
            {resultadoCalculo && (
                <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg border border-blue-200 p-6">
                    <h4 className="text-md font-medium text-gray-900 mb-4">Resumen Financiero</h4>
                    <dl className="space-y-3">
                        <div className="flex justify-between">
                            <dt className="text-sm font-medium text-gray-700">Total Ingresos</dt>
                            <dd className="text-sm font-bold text-gray-900">{formatMoney(declaracionActual.total_ingresos)}</dd>
                        </div>
                        <div className="flex justify-between">
                            <dt className="text-sm font-medium text-gray-700">Total Deducciones</dt>
                            <dd className="text-sm text-gray-900">{formatMoney(declaracionActual.total_deducciones)}</dd>
                        </div>
                        <div className="flex justify-between">
                            <dt className="text-sm font-medium text-gray-700">Base Gravable</dt>
                            <dd className="text-sm font-bold text-blue-900">{formatMoney(declaracionActual.base_gravable)}</dd>
                        </div>
                        <div className="flex justify-between pt-3 border-t-2 border-blue-300">
                            <dt className="text-lg font-bold text-gray-900">Impuesto Neto a Pagar</dt>
                            <dd className="text-2xl font-bold text-green-600">{formatMoney(declaracionActual.impuesto_neto)}</dd>
                        </div>
                        <div className="flex justify-between text-sm">
                            <dt className="text-gray-600">Tarifa Efectiva</dt>
                            <dd className="font-medium text-gray-900">{resultadoCalculo.detalleCalculo.tarifaEfectiva.toFixed(2)}%</dd>
                        </div>
                    </dl>
                </div>
            )}
        </div>
    );
}
