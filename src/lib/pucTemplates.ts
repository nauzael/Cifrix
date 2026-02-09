export interface PUCTemplateAccount {
  code: string;
  name: string;
  type: 'ACTIVO' | 'PASIVO' | 'PATRIMONIO' | 'INGRESO' | 'EGRESO';
  nature: 'DEBITO' | 'CREDITO';
  accepts_movement: boolean;
  parent_code?: string;
}

export const UNIVERSAL_PUC: PUCTemplateAccount[] = [
  { code: '1', name: 'ACTIVO', type: 'ACTIVO', nature: 'DEBITO', accepts_movement: false },
  { code: '2', name: 'PASIVO', type: 'PASIVO', nature: 'CREDITO', accepts_movement: false },
  { code: '3', name: 'PATRIMONIO', type: 'PATRIMONIO', nature: 'CREDITO', accepts_movement: false },
  { code: '4', name: 'INGRESOS', type: 'INGRESO', nature: 'CREDITO', accepts_movement: false },
  { code: '5', name: 'GASTOS', type: 'EGRESO', nature: 'DEBITO', accepts_movement: false },
  { code: '6', name: 'COSTOS DE VENTAS', type: 'EGRESO', nature: 'DEBITO', accepts_movement: false },
  { code: '7', name: 'COSTOS DE PRODUCCIÓN U OPERACIÓN', type: 'EGRESO', nature: 'DEBITO', accepts_movement: false },
  { code: '8', name: 'CUENTAS DE ORDEN DEUDORAS', type: 'ACTIVO', nature: 'DEBITO', accepts_movement: false },
  { code: '9', name: 'CUENTAS DE ORDEN ACREEDORAS', type: 'PASIVO', nature: 'CREDITO', accepts_movement: false },
];
