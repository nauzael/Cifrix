/**
 * Definición de mapeos entre Formatos de la DIAN y prefijos de cuentas PUC
 */

export interface DianFormatMapping {
    id: string;
    nombre: string;
    descripcion: string;
    prefijosPuc: string[];
}

export const DIAN_FORMATS: Record<string, DianFormatMapping> = {
    '1001': {
        id: '1001',
        nombre: 'Pagos y Abonos en Cuenta',
        descripcion: 'Pagos, abonos en cuenta y retenciones practicadas',
        prefijosPuc: ['5', '15', '16', '17', '2365', '2367', '2368']
    },
    '1007': {
        id: '1007',
        nombre: 'Ingresos Recibidos',
        descripcion: 'Ingresos propios recibidos en el año',
        prefijosPuc: ['4']
    },
    '1003': {
        id: '1003',
        nombre: 'Retenciones a Favor',
        descripcion: 'Retenciones en la fuente que le practicaron',
        prefijosPuc: ['13']
    },
    '1008': {
        id: '1008',
        nombre: 'Saldos de Cuentas por Cobrar',
        descripcion: 'Acreedores y cuentas por cobrar a 31 de dic',
        prefijosPuc: ['13']
    },
    '1009': {
        id: '1009',
        nombre: 'Saldos de Cuentas por Pagar',
        descripcion: 'Proveedores y cuentas por pagar a 31 de dic',
        prefijosPuc: ['21', '22', '23', '24']
    },
    '2275': {
        id: '2275',
        nombre: 'Ingresos No Constitutivos',
        descripcion: 'Ingresos no constitutivos de renta ni ganancia ocasional',
        prefijosPuc: ['8001', '8002', '1304']
    }
};

export const getFormatById = (id: string): DianFormatMapping | undefined => {
    return DIAN_FORMATS[id];
};

export const getAllFormats = (): DianFormatMapping[] => {
    return Object.values(DIAN_FORMATS);
};
