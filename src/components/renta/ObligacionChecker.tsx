import { useState } from 'react';
import { useRentaStore } from '@/store/rentaStore';
import { AlertCircle, CheckCircle, HelpCircle } from 'lucide-react';
import { rentaCalculator } from '@/lib/renta/calculator';

export function ObligacionChecker() {
    const [params, setParams] = useState({
        patrimonioBruto: 0,
        ingresosBrutos: 0,
        consumosTarjeta: 0,
        compras: 0,
        consignaciones: 0
    });

    const [resultado, setResultado] = useState<{ obligado: boolean; razones: string[] } | null>(null);

    const uvt = rentaCalculator.getUVT();
    const topePatrimonio = 4500 * uvt;
    const topeIngresos = 1400 * uvt;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setParams(prev => ({
            ...prev,
            [name]: Number(value) || 0
        }));
    };

    const verificar = () => {
        const res = rentaCalculator.estaObligadoDeclarar(params);
        setResultado(res);
    };

    const formatMoney = (val: number) => {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            maximumFractionDigits: 0
        }).format(val);
    };

    return (
        <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
                <HelpCircle className="w-6 h-6 mr-2 text-blue-500" />
                ¿Estoy obligado a declarar renta?
            </h2>

            <p className="text-sm text-gray-600 mb-6">
                Ingrese los valores aproximados para el año gravable actual (UVT: {formatMoney(uvt)}).
                Si cumple al menos una de las condiciones, debe presentar declaración.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Patrimonio Bruto a 31 de Dic.
                        <span className="text-xs text-gray-500 block">Tope: {formatMoney(topePatrimonio)}</span>
                    </label>
                    <input
                        type="number"
                        name="patrimonioBruto"
                        value={params.patrimonioBruto || ''}
                        onChange={handleChange}
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        placeholder="0"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Ingresos Brutos Anuales
                        <span className="text-xs text-gray-500 block">Tope: {formatMoney(topeIngresos)}</span>
                    </label>
                    <input
                        type="number"
                        name="ingresosBrutos"
                        value={params.ingresosBrutos || ''}
                        onChange={handleChange}
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        placeholder="0"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Consumos con Tarjeta de Crédito
                        <span className="text-xs text-gray-500 block">Tope: {formatMoney(topeIngresos)}</span>
                    </label>
                    <input
                        type="number"
                        name="consumosTarjeta"
                        value={params.consumosTarjeta || ''}
                        onChange={handleChange}
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        placeholder="0"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Compras y Consumos Totales
                        <span className="text-xs text-gray-500 block">Tope: {formatMoney(topeIngresos)}</span>
                    </label>
                    <input
                        type="number"
                        name="compras"
                        value={params.compras || ''}
                        onChange={handleChange}
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        placeholder="0"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Consignaciones Bancarias
                        <span className="text-xs text-gray-500 block">Tope: {formatMoney(topeIngresos)}</span>
                    </label>
                    <input
                        type="number"
                        name="consignaciones"
                        value={params.consignaciones || ''}
                        onChange={handleChange}
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        placeholder="0"
                    />
                </div>
            </div>

            <div className="flex justify-end mb-6">
                <button
                    onClick={verificar}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
                >
                    Verificar Obligación
                </button>
            </div>

            {resultado && (
                <div className={`p-4 rounded-md ${resultado.obligado ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`}>
                    <div className="flex items-start">
                        {resultado.obligado ? (
                            <AlertCircle className="w-6 h-6 text-red-600 mr-2 mt-0.5" />
                        ) : (
                            <CheckCircle className="w-6 h-6 text-green-600 mr-2 mt-0.5" />
                        )}
                        <div>
                            <h3 className={`font-semibold ${resultado.obligado ? 'text-red-800' : 'text-green-800'}`}>
                                {resultado.obligado ? 'ESTÁ OBLIGADO A DECLARAR' : 'NO ESTÁ OBLIGADO A DECLARAR'}
                            </h3>
                            <ul className="mt-2 list-disc list-inside text-sm text-gray-700 space-y-1">
                                {resultado.razones.map((razon, idx) => (
                                    <li key={idx}>{razon}</li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
