/**
 * Componente de calculadora de impuestos
 * Muestra el cálculo detallado del impuesto de renta
 */

import { useRentaStore } from '@/store/rentaStore';
import { Calculator, TrendingUp, DollarSign } from 'lucide-react';

export function TaxCalculator() {
    const { declaracionActual, resultadoCalculo } = useRentaStore();

    if (!declaracionActual || !resultadoCalculo) {
        return (
            <div className="text-center py-12">
                <Calculator className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No hay cálculo disponible</h3>
                <p className="mt-1 text-sm text-gray-500">
                    Agrega ingresos y deducciones para ver el cálculo del impuesto.
                </p>
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

    const { detalleCalculo } = resultadoCalculo;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h3 className="text-lg font-medium text-gray-900">Cálculo del Impuesto</h3>
                <p className="mt-1 text-sm text-gray-500">
                    {resultadoCalculo.tipoContribuyente === 'PERSONA_NATURAL'
                        ? 'Detalle completo del cálculo según tarifas marginales 2024'
                        : 'Cálculo de impuesto sobre la renta (Tarifa General 35%)'}
                </p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 rounded-lg p-4">
                    <div className="flex items-center">
                        <DollarSign className="h-8 w-8 text-blue-600" />
                        <div className="ml-3">
                            <p className="text-sm font-medium text-blue-600">Base Gravable</p>
                            <p className="text-2xl font-bold text-blue-900">{formatMoney(resultadoCalculo.baseGravable)}</p>
                            <p className="text-xs text-blue-600 mt-1">{resultadoCalculo.baseGravableUVT.toFixed(2)} UVT</p>
                        </div>
                    </div>
                </div>
                <div className="bg-orange-50 rounded-lg p-4">
                    <div className="flex items-center">
                        <TrendingUp className="h-8 w-8 text-orange-600" />
                        <div className="ml-3">
                            <p className="text-sm font-medium text-orange-600">Tarifa Efectiva</p>
                            <p className="text-2xl font-bold text-orange-900">{detalleCalculo.tarifaEfectiva.toFixed(2)}%</p>
                        </div>
                    </div>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                    <div className="flex items-center">
                        <Calculator className="h-8 w-8 text-green-600" />
                        <div className="ml-3">
                            <p className="text-sm font-medium text-green-600">Impuesto Neto</p>
                            <p className="text-2xl font-bold text-green-900">{formatMoney(resultadoCalculo.impuestoNeto)}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Detalle del Cálculo */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                    <h4 className="text-md font-medium text-gray-900">Detalle del Cálculo</h4>
                </div>
                <div className="p-6">
                    <dl className="space-y-3">
                        <div className="flex justify-between">
                            <dt className="text-sm font-medium text-gray-500">Total Ingresos</dt>
                            <dd className="text-sm font-bold text-gray-900">{formatMoney(detalleCalculo.totalIngresos)}</dd>
                        </div>
                        <div className="flex justify-between">
                            <dt className="text-sm font-medium text-gray-500">(-) Total Costos</dt>
                            <dd className="text-sm text-gray-900">{formatMoney(detalleCalculo.totalCostos)}</dd>
                        </div>
                        <div className="flex justify-between">
                            <dt className="text-sm font-medium text-gray-500">(-) Total Gastos</dt>
                            <dd className="text-sm text-gray-900">{formatMoney(detalleCalculo.totalGastos)}</dd>
                        </div>
                        <div className="flex justify-between">
                            <dt className="text-sm font-medium text-gray-500">(-) Total Deducciones</dt>
                            <dd className="text-sm text-gray-900">{formatMoney(detalleCalculo.totalDeducciones)}</dd>
                        </div>
                        <div className="flex justify-between pt-3 border-t border-gray-200">
                            <dt className="text-sm font-bold text-gray-900">(=) Renta Líquida</dt>
                            <dd className="text-sm font-bold text-gray-900">{formatMoney(detalleCalculo.rentaLiquida)}</dd>
                        </div>
                        <div className="flex justify-between">
                            <dt className="text-sm font-medium text-gray-500">(-) Mínimo No Gravable (95 UVT)</dt>
                            <dd className="text-sm text-gray-900">{formatMoney(detalleCalculo.minimoNoGravable)}</dd>
                        </div>
                        <div className="flex justify-between pt-3 border-t border-gray-200">
                            <dt className="text-sm font-bold text-blue-900">(=) Base Gravable</dt>
                            <dd className="text-sm font-bold text-blue-900">{formatMoney(resultadoCalculo.baseGravable)}</dd>
                        </div>
                    </dl>
                </div>
            </div>

            {/* Cálculo por Tramos (Solo Persona Natural) */}
            {
                resultadoCalculo.tipoContribuyente === 'PERSONA_NATURAL' && (
                    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                            <h4 className="text-md font-medium text-gray-900">Cálculo por Tramos Marginales</h4>
                            <p className="text-sm text-gray-500 mt-1">Tramo aplicado: {detalleCalculo.tramoAplicado}</p>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Tramo (UVT)
                                        </th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Base en Tramo
                                        </th>
                                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Tarifa
                                        </th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Impuesto
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {detalleCalculo.calculoPorTramos.map((tramo, index) => (
                                        <tr key={index} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                {tramo.tramo}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                                                {formatMoney(tramo.baseTramo)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                    {tramo.tarifa.toFixed(0)}%
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                                                {formatMoney(tramo.impuestoTramo)}
                                            </td>
                                        </tr>
                                    ))}
                                    <tr className="bg-gray-50">
                                        <td colSpan={3} className="px-6 py-4 text-sm font-bold text-gray-900">
                                            Total Impuesto Calculado
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-gray-900">
                                            {formatMoney(resultadoCalculo.impuestoBruto)}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                )
            }

            {/* Cálculo Tarifa Fija (Solo Persona Jurídica) */}
            {
                resultadoCalculo.tipoContribuyente === 'PERSONA_JURIDICA' && (
                    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                            <h4 className="text-md font-medium text-gray-900">Cálculo Tarifa General</h4>
                        </div>
                        <div className="p-6">
                            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-100">
                                <div>
                                    <p className="text-sm font-medium text-blue-900">Tarifa Aplicada</p>
                                    <p className="text-2xl font-bold text-blue-700">35%</p>
                                    <p className="text-xs text-blue-600 mt-1">Tarifa General Personas Jurídicas</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-medium text-blue-900">Impuesto Calculado</p>
                                    <p className="text-2xl font-bold text-blue-700">{formatMoney(resultadoCalculo.impuestoBruto)}</p>
                                    <p className="text-xs text-blue-600 mt-1">Base Gravable * 35%</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Liquidación Final */}
            <div className="bg-gradient-to-r from-blue-50 to-green-50 rounded-lg border border-blue-200 p-6">
                <h4 className="text-md font-medium text-gray-900 mb-4">Liquidación Final</h4>
                <dl className="space-y-3">
                    <div className="flex justify-between">
                        <dt className="text-sm font-medium text-gray-700">Impuesto Calculado</dt>
                        <dd className="text-sm font-bold text-gray-900">{formatMoney(resultadoCalculo.impuestoBruto)}</dd>
                    </div>
                    <div className="flex justify-between">
                        <dt className="text-sm font-medium text-gray-700">(-) Créditos Tributarios</dt>
                        <dd className="text-sm text-gray-900">{formatMoney(resultadoCalculo.creditosTributarios)}</dd>
                    </div>
                    <div className="flex justify-between pt-3 border-t-2 border-blue-300">
                        <dt className="text-lg font-bold text-gray-900">(=) Impuesto Neto a Pagar</dt>
                        <dd className="text-2xl font-bold text-green-600">{formatMoney(resultadoCalculo.impuestoNeto)}</dd>
                    </div>
                </dl>
            </div>
        </div >
    );
}
