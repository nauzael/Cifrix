/**
 * Lista de declaraciones de renta
 */

import { DeclaracionRenta } from '@/lib/db';
import { FileText, Clock, CheckCircle, XCircle, Trash2 } from 'lucide-react';

interface DeclarationListProps {
    declaraciones: DeclaracionRenta[];
    declaracionActual: DeclaracionRenta | null;
    onSelect: (id: string) => void;
    onDelete?: (id: string) => void;
    loading: boolean;
}

export function DeclarationList({ declaraciones, declaracionActual, onSelect, onDelete, loading }: DeclarationListProps) {
    const getEstadoIcon = (estado: string) => {
        switch (estado) {
            case 'BORRADOR':
                return <Clock className="h-5 w-5 text-yellow-500" />;
            case 'PRESENTADA':
                return <CheckCircle className="h-5 w-5 text-green-500" />;
            case 'CORREGIDA':
                return <FileText className="h-5 w-5 text-blue-500" />;
            case 'ANULADA':
                return <XCircle className="h-5 w-5 text-red-500" />;
            default:
                return <FileText className="h-5 w-5 text-gray-500" />;
        }
    };

    const getEstadoColor = (estado: string) => {
        switch (estado) {
            case 'BORRADOR':
                return 'bg-yellow-50 text-yellow-700 border-yellow-200';
            case 'PRESENTADA':
                return 'bg-green-50 text-green-700 border-green-200';
            case 'CORREGIDA':
                return 'bg-blue-50 text-blue-700 border-blue-200';
            case 'ANULADA':
                return 'bg-red-50 text-red-700 border-red-200';
            default:
                return 'bg-gray-50 text-gray-700 border-gray-200';
        }
    };

    if (loading) {
        return (
            <div className="p-4 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-sm text-gray-500">Cargando...</p>
            </div>
        );
    }

    if (declaraciones.length === 0) {
        return (
            <div className="p-4 text-center">
                <FileText className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-sm text-gray-500">No hay declaraciones</p>
            </div>
        );
    }

    return (
        <div className="divide-y divide-gray-200">
            {declaraciones.map((declaracion) => (
                <div
                    key={declaracion.id}
                    onClick={() => onSelect(declaracion.id)}
                    className={`
            w-full text-left p-4 hover:bg-gray-50 transition-colors cursor-pointer relative group
            ${declaracionActual?.id === declaracion.id ? 'bg-blue-50 border-l-4 border-blue-500' : 'border-l-4 border-transparent'}
          `}
                >
                    <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2">
                                {getEstadoIcon(declaracion.estado)}
                                <p className="text-sm font-medium text-gray-900 truncate">
                                    {declaracion.contribuyente_nombre}
                                </p>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                                NIT: {declaracion.contribuyente_id}
                            </p>
                            <p className="text-xs text-gray-500">
                                Período: {declaracion.periodo_fiscal}
                            </p>
                        </div>
                    </div>
                    <div className="mt-2 flex justify-between items-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${getEstadoColor(declaracion.estado)}`}>
                            {declaracion.estado}
                        </span>
                        {onDelete && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (confirm('¿Estás seguro de eliminar esta declaración? Esta acción no se puede deshacer.')) {
                                        onDelete(declaracion.id);
                                    }
                                }}
                                className="p-1 text-gray-400 hover:text-red-600 transition-colors rounded-full hover:bg-red-50 opacity-0 group-hover:opacity-100 focus:opacity-100"
                                title="Eliminar declaración"
                            >
                                <Trash2 className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}
