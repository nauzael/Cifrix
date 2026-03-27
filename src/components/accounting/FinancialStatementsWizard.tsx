import { useState, useEffect } from 'react';
import { db, FinancialNote } from '../../lib/db';
import { closingProcessService } from '../../lib/accounting/closing-process';
import { financialReportsService } from '../../lib/accounting/reports';
import { financialNotesService } from '../../lib/accounting/notes';
import { financialExportService } from '../../lib/accounting/export';
import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowRight, Check, AlertTriangle, FileText, Lock, Calendar, Plus, Trash2, Edit } from 'lucide-react';
import { toast } from '../../store/toastStore';
import { useAuthStore } from '../../store/authStore';

// Pasos del Wizard
const STEPS = [
    { id: 'setup', title: 'Período', icon: Calendar },
    { id: 'closing', title: 'Cierre Contable', icon: Lock },
    { id: 'reports', title: 'Ver Reportes', icon: FileText },
    { id: 'notes', title: 'Notas', icon: FileText },
    { id: 'export', title: 'Exportar', icon: ArrowRight }
];

export function FinancialStatementsWizard() {
    const { user, profile } = useAuthStore();

    const currentOrganization = useLiveQuery(async () => {
        if (profile?.organizationId) {
            return await db.organizations.get(profile.organizationId);
        }
        return undefined;
    }, [profile?.organizationId]);

    const [currentStep, setCurrentStep] = useState('setup');
    const [year, setYear] = useState(new Date().getFullYear());
    const [normativo, setNormativo] = useState<'NIIF_COMPLETAS' | 'NIIF_PYMES' | 'CONTABILIDAD_SIMPLIFICADA'>('NIIF_PYMES');
    const [cutOffDate, setCutOffDate] = useState(`${new Date().getFullYear()}-12-31`);
    const [isClosingProcess, setIsClosingProcess] = useState(false);

    // Estado para reportes
    const [selectedReport, setSelectedReport] = useState('Balance General');
    const [reportData, setReportData] = useState<any>(null);
    const [isLoadingReport, setIsLoadingReport] = useState(false);
    const [isExporting, setIsExporting] = useState(false);

    // Estado para notas
    const [notes, setNotes] = useState<FinancialNote[]>([]);
    const [editingNote, setEditingNote] = useState<Partial<FinancialNote> | null>(null);


    const fiscalYearStatus = useLiveQuery(
        () => db.fiscal_years.where({ organization_id: currentOrganization?.id || '', year }).first(),
        [currentOrganization, year]
    );

    // Efecto para actualizar fecha de corte al cambiar año
    useEffect(() => {
        setCutOffDate(`${year}-12-31`);
    }, [year]);

    // Efecto para sincronizar configuración inicial de FiscalYear
    useEffect(() => {
        if (fiscalYearStatus) {
            if (fiscalYearStatus.normativo) setNormativo(fiscalYearStatus.normativo);
            if (fiscalYearStatus.cut_off_date) setCutOffDate(fiscalYearStatus.cut_off_date);
        }
    }, [fiscalYearStatus]);

    const handleSaveSetup = async () => {
        if (!currentOrganization) return;
        try {
            const existing = await db.fiscal_years.where({ organization_id: currentOrganization.id, year }).first();
            if (existing) {
                await db.fiscal_years.update(existing.id, { normativo, cut_off_date: cutOffDate });
            } else {
                await db.fiscal_years.add({
                    id: crypto.randomUUID(),
                    organization_id: currentOrganization.id,
                    year,
                    status: 'ABIERTO',
                    normativo,
                    cut_off_date: cutOffDate,
                    created_at: new Date().toISOString()
                });
            }
            toast.success('Configuración guardada');
            setCurrentStep('closing');
        } catch (error) {
            console.error(error);
            toast.error('Error al guardar configuración');
        }
    };

    // Mapeo de flujo de efectivo
    const accountsForMapping = useLiveQuery(
        () => currentOrganization ? db.accounts.where('organization_id').equals(currentOrganization.id).toArray() : [],
        [currentOrganization]
    );

    const handleUpdateMapping = async (accountId: string, category: any) => {
        try {
            await db.accounts.update(accountId, { cash_flow_category: category });
            toast.success('Mapeo actualizado');
        } catch (error) {
            console.error(error);
            toast.error('Error al actualizar mapeo');
        }
    };

    // Efecto para cargar datos del reporte al cambiar de tab
    useEffect(() => {
        if (currentStep === 'reports' && currentOrganization) {
            loadReportData();
        }
    }, [selectedReport, currentStep, currentOrganization, year]);

    // Efecto para cargar notas
    useEffect(() => {
        if (currentStep === 'notes' && currentOrganization) {
            loadNotes();
        }
    }, [currentStep, currentOrganization, year]);

    const loadReportData = async () => {
        if (!currentOrganization) return;
        setIsLoadingReport(true);
        try {
            const cutOffDate = `${year}-12-31`;
            const startDate = `${year}-01-01`;
            let data;

            switch (selectedReport) {
                case 'Balance General':
                    data = await financialReportsService.getBalanceSheet(currentOrganization.id, cutOffDate);
                    break;
                case 'Estado de Resultados':
                    data = await financialReportsService.getIncomeStatement(currentOrganization.id, startDate, cutOffDate);
                    break;
                case 'Flujo de Efectivo':
                    data = await financialReportsService.getCashFlowStatement(currentOrganization.id, startDate, cutOffDate);
                    break;
                case 'Cambios en Patrimonio':
                    data = await financialReportsService.getEquityChangesStatement(currentOrganization.id, startDate, cutOffDate);
                    break;
                default:
                    data = null;
            }
            setReportData(data);
        } catch (error) {
            console.error(error);
            toast.error('Error al cargar reporte');
        } finally {
            setIsLoadingReport(false);
        }
    };

    const loadNotes = async () => {
        if (!currentOrganization) return;
        try {
            // TODO: Map selected report type to FinancialNote type
            const reportTypeMap: Record<string, FinancialNote['report_type']> = {
                'Balance General': 'BALANCE',
                'Estado de Resultados': 'RESULTADOS',
                'Flujo de Efectivo': 'FLUJO',
                'Cambios en Patrimonio': 'PATRIMONIO'
            };

            const loadedNotes = await financialNotesService.getNotes(
                currentOrganization.id,
                year.toString(),
                reportTypeMap[selectedReport] || 'BALANCE'
            );
            setNotes(loadedNotes);
        } catch (error) {
            console.error('Error loading notes:', error);
        }
    };

    const handleSaveNote = async () => {
        if (!currentOrganization || !editingNote) return;

        try {
            // Basic dynamic mapping
            const reportTypeMap: Record<string, FinancialNote['report_type']> = {
                'Balance General': 'BALANCE',
                'Estado de Resultados': 'RESULTADOS',
                'Flujo de Efectivo': 'FLUJO',
                'Cambios en Patrimonio': 'PATRIMONIO'
            };

            await financialNotesService.saveNote({
                ...editingNote,
                organization_id: currentOrganization.id,
                period_id: year.toString(),
                report_type: reportTypeMap[selectedReport] || 'BALANCE',
            });
            toast.success('Nota guardada');
            setEditingNote(null);
            loadNotes();
        } catch (error) {
            console.error(error);
            toast.error('Error al guardar nota');
        }
    };

    const handleDeleteNote = async (id: string) => {
        if (!confirm('¿Eliminar nota?')) return;
        try {
            await financialNotesService.deleteNote(id);
            toast.success('Nota eliminada');
            loadNotes();
        } catch (error) {
            console.error(error);
            toast.error('Error al eliminar nota');
        }
    };

    const handleDownloadPDF = async () => {
        if (!currentOrganization) return;
        setIsExporting(true);
        const tId = 'pdf-gen';
        toast.info('Generando PDF...');
        try {
            const startDate = `${year}-01-01`;
            const endDate = cutOffDate;

            // 1. Cargar todos los reportes
            const balanceData = await financialReportsService.getBalanceSheet(currentOrganization.id, endDate);
            const incomeData = await financialReportsService.getIncomeStatement(currentOrganization.id, startDate, endDate);
            const cashFlowData = await financialReportsService.getCashFlowStatement(currentOrganization.id, startDate, endDate);
            const equityData = await financialReportsService.getEquityChangesStatement(currentOrganization.id, startDate, endDate);

            // 2. Cargar todas las notas del periodo
            const allNotes = await db.financial_notes
                .where({ organization_id: currentOrganization.id, period_id: year.toString() })
                .toArray();

            // 3. Generar PDF
            await financialExportService.generatePDF(
                [balanceData, incomeData, cashFlowData, equityData],
                allNotes,
                {
                    title: `ESTADOS FINANCIEROS - AÑO ${year}`,
                    organizationName: currentOrganization.name,
                    period: `DEL 01 DE ENERO AL 31 DE DICIEMBRE DE ${year}`,
                    normativo: normativo,
                    signatures: [
                      {
                        name: currentOrganization.settings?.rep_legal_name || '',
                        role: 'Representante Legal',
                        id_number: currentOrganization.settings?.rep_legal_document,
                        signature_base64: currentOrganization.settings?.rep_legal_signature
                      },
                      {
                        name: currentOrganization.settings?.contador_name || '',
                        role: 'Contador Público',
                        tp_number: currentOrganization.settings?.contador_tp,
                        signature_base64: currentOrganization.settings?.contador_signature
                      }
                    ]
                }
            );

            toast.success('PDF generado con éxito');
        } catch (error) {
            console.error(error);
            toast.error('Error al generar PDF');
        } finally {
            setIsExporting(false);
        }
    };

    const handleClosing = async () => {
        if (!currentOrganization) return;

        if (!confirm(`¿Está seguro de cerrar el año fiscal ${year}? Esta acción generará asientos automáticos y bloqueará la edición.`)) {
            return;
        }

        setIsClosingProcess(true);
        try {
            const equityAccount = await db.accounts
                .where('organization_id').equals(currentOrganization.id)
                .and(a => a.code.startsWith('36'))
                .first();

            if (!equityAccount) {
                toast.error('No se encontró una cuenta de patrimonio para resultados (36xx). Por favor, créela en el PUC.');
                setIsClosingProcess(false);
                return;
            }

            const result = await closingProcessService.performAnnualClosing(
                currentOrganization.id,
                year,
                user?.id || 'SYSTEM',
                equityAccount.id
            );

            if (result.success) {
                toast.success('Cierre contable completado con éxito.');
                setCurrentStep('reports');
            } else {
                toast.error(result.message);
            }
        } catch (error) {
            console.error(error);
            toast.error('Error durante el cierre contable.');
        } finally {
            setIsClosingProcess(false);
        }
    };

    const renderReportContent = () => {
        if (isLoadingReport) return <div className="p-10 text-center">Cargando reporte...</div>;
        if (!reportData) return <div className="p-10 text-center text-gray-400">Seleccione un reporte</div>;

        return (
            <div className="p-8 space-y-6">
                <div className="text-center border-b pb-4">
                    <h3 className="text-xl font-bold uppercase">{reportData.organizationName}</h3>
                    <h4 className="font-medium text-gray-600 uppercase">{selectedReport}</h4>
                    <p className="text-sm text-gray-500">{reportData.period}</p>
                    <p className="text-xs text-gray-400 mt-1">(Cifras en {reportData.currency})</p>
                </div>

                <div className="space-y-6">
                    {reportData.sections.map((section: any, idx: number) => (
                        <div key={idx}>
                            <h5 className="font-bold text-lg text-blue-800 border-b-2 border-blue-100 mb-3">{section.title}</h5>
                            {section.groups.map((group: any, gIdx: number) => (
                                <div key={gIdx} className="mb-4 pl-4">
                                    <h6 className="font-semibold text-gray-700 mb-2">{group.name}</h6>
                                    <div className="space-y-1">
                                        {group.accounts.map((acc: any, aIdx: number) => (
                                            <div key={aIdx} className="flex justify-between text-sm py-1 border-b border-dashed border-gray-100">
                                                <span className="text-gray-600">{acc.code} - {acc.name}</span>
                                                    <span className="font-mono">{(acc.balance || 0).toLocaleString('es-CO', { minimumFractionDigits: 2 })}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex justify-between font-bold text-sm mt-2 pt-2 border-t">
                                        <span>Total {group.name}</span>
                                        <span>{(group.total || 0).toLocaleString('es-CO', { minimumFractionDigits: 2 })}</span>
                                    </div>
                                </div>
                            ))}
                            <div className="flex justify-between font-bold text-base bg-gray-50 p-2 rounded">
                                <span>TOTAL {section.title}</span>
                                <span>{(section.total || 0).toLocaleString('es-CO', { minimumFractionDigits: 2 })}</span>
                            </div>
                        </div>
                    ))}
                </div>

                {reportData.summary && (
                    <div className="mt-8 pt-4 border-t-2 border-gray-200">
                        {reportData.summary.isBalanced !== undefined && (
                            <div className={`p-3 rounded text-center font-bold ${reportData.summary.isBalanced ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                {reportData.summary.isBalanced ? 'BALANCE CUADRADO' : `DESCUADRE: ${(reportData.summary.difference || 0).toLocaleString('es-CO', { minimumFractionDigits: 2 })}`}
                            </div>
                        )}
                        {reportData.summary.netResult !== undefined && (
                            <div className="flex justify-between font-bold text-lg p-3 bg-blue-50 rounded">
                                <span>RESULTADO NETO DEL EJERCICIO</span>
                                <span className={reportData.summary.netResult >= 0 ? 'text-green-600' : 'text-red-600'}>
                                    {(reportData.summary.netResult || 0).toLocaleString('es-CO', { minimumFractionDigits: 2 })}
                                </span>
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    };

    const renderNotesContent = () => {
        return (
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold">Notas: {selectedReport}</h2>
                    <button
                        onClick={() => setEditingNote({ title: '', content: '', order: notes.length + 1 })}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center gap-2"
                    >
                        <Plus size={18} /> Nueva Nota
                    </button>
                </div>

                {editingNote && (
                    <div className="bg-white p-6 rounded-xl border border-blue-200 shadow-sm space-y-4">
                        <input
                            type="text"
                            placeholder="Título de la nota (ej. Nota 3. Efectivo)"
                            className="w-full p-2 border rounded font-bold"
                            value={editingNote.title}
                            onChange={e => setEditingNote({ ...editingNote, title: e.target.value })}
                        />
                        <textarea
                            placeholder="Contenido de la nota..."
                            className="w-full p-2 border rounded h-32"
                            value={editingNote.content}
                            onChange={e => setEditingNote({ ...editingNote, content: e.target.value })}
                        />
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => setEditingNote(null)}
                                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSaveNote}
                                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                            >
                                Guardar Nota
                            </button>
                        </div>
                    </div>
                )}

                <div className="space-y-4">
                    {notes.map(note => (
                        <div key={note.id} className="bg-white p-4 rounded-lg border hover:border-blue-300 transition group relative">
                            <div className="absolute top-4 right-4 flex gap-2 transition">
                                <button onClick={() => setEditingNote(note)} className="p-1 text-blue-600 hover:bg-blue-50 rounded"><Edit size={16} /></button>
                                <button onClick={() => handleDeleteNote(note.id)} className="p-1 text-red-600 hover:bg-red-50 rounded"><Trash2 size={16} /></button>
                            </div>
                            <h3 className="font-bold text-lg mb-2">{note.title}</h3>
                            <p className="text-gray-600 whitespace-pre-wrap">{note.content}</p>
                        </div>
                    ))}
                    {notes.length === 0 && !editingNote && (
                        <div className="text-center py-10 text-gray-400 border-2 border-dashed rounded-xl">
                            No hay notas registradas para este reporte.
                        </div>
                    )}
                </div>

                <div className="flex justify-between pt-6 border-t">
                    <button
                        onClick={() => setCurrentStep('reports')}
                        className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg"
                    >
                        Atrás
                    </button>
                    <button
                        onClick={() => setCurrentStep('export')}
                        className="px-6 py-2 bg-green-600 text-white rounded-lg flex items-center gap-2"
                    >
                        Finalizar y Exportar <ArrowRight size={18} />
                    </button>
                </div>
            </div>
        );
    };

    const renderStepContent = () => {
        switch (currentStep) {
            case 'setup':
                return (
                    <div className="space-y-6 max-w-lg mx-auto py-10">
                        <h2 className="text-2xl font-bold text-center">Configuración del Período</h2>
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-2 text-gray-700">Año Fiscal</label>
                                <select
                                    value={year}
                                    onChange={(e) => setYear(Number(e.target.value))}
                                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                >
                                    {[...Array(5)].map((_, i) => {
                                        const y = new Date().getFullYear() - i;
                                        return <option key={y} value={y}>{y}</option>;
                                    })}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2 text-gray-700">Marco Normativo</label>
                                <select
                                    value={normativo}
                                    onChange={(e) => setNormativo(e.target.value as any)}
                                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="NIIF_PYMES">NIIF para Pymes (Estándar)</option>
                                    <option value="NIIF_COMPLETAS">NIIF Completas (Grupo 1)</option>
                                    <option value="CONTABILIDAD_SIMPLIFICADA">Contabilidad Simplificada (Micro)</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2 text-gray-700">Fecha de Corte</label>
                                <input
                                    type="date"
                                    value={cutOffDate}
                                    onChange={(e) => setCutOffDate(e.target.value)}
                                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>

                        <div className="bg-blue-50 p-4 rounded-lg flex gap-3 text-blue-800">
                            <AlertTriangle className="shrink-0" />
                            <p className="text-sm">
                                El marco normativo determina la estructura de los reportes y las revelaciones (Notas) requeridas.
                            </p>
                        </div>

                        <button
                            onClick={handleSaveSetup}
                            className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition shadow-lg"
                        >
                            Verificar y Continuar
                        </button>
                    </div>
                );

            case 'closing':
                return (
                    <div className="space-y-6 max-w-2xl mx-auto py-10">
                        <h2 className="text-2xl font-bold text-center">Proceso de Cierre Contable {year}</h2>

                        <div className="grid gap-4">
                            <div className={`p-4 rounded-lg border ${fiscalYearStatus?.status === 'CERRADO' ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
                                <div className="flex justify-between items-center">
                                    <div>
                                        <h3 className="font-bold">Estado del Año Fiscal</h3>
                                        <p className="text-sm opacity-80">
                                            {fiscalYearStatus?.status === 'CERRADO'
                                                ? `Cerrado el ${new Date(fiscalYearStatus.closed_at!).toLocaleDateString()}`
                                                : 'Abierto - Pendiente de cierre'}
                                        </p>
                                    </div>
                                    {fiscalYearStatus?.status === 'CERRADO' ? <Check className="text-green-600" /> : <AlertTriangle className="text-yellow-600" />}
                                </div>
                            </div>

                            {fiscalYearStatus?.status !== 'CERRADO' && (
                                <div className="bg-white p-6 rounded-xl border space-y-4">
                                    <h3 className="font-bold border-b pb-2">Acciones de Cierre Automático</h3>
                                    <ul className="space-y-2 text-sm text-gray-600">
                                        <li className="flex gap-2"><Check size={16} /> Cancelación de cuentas de Ingresos</li>
                                        <li className="flex gap-2"><Check size={16} /> Cancelación de cuentas de Gastos</li>
                                        <li className="flex gap-2"><Check size={16} /> Cálculo de Utilidad/Pérdida</li>
                                        <li className="flex gap-2"><Check size={16} /> Bloqueo de periodo</li>
                                    </ul>

                                    <button
                                        onClick={handleClosing}
                                        disabled={isClosingProcess}
                                        className="w-full bg-red-600 text-white py-3 rounded-lg font-bold hover:bg-red-700 transition flex justify-center items-center gap-2"
                                    >
                                        {isClosingProcess ? 'Procesando...' : <><Lock size={18} /> Ejecutar Cierre Definitivo</>}
                                    </button>
                                </div>
                            )}

                            {fiscalYearStatus?.status === 'CERRADO' && (
                                <button
                                    onClick={() => setCurrentStep('reports')}
                                    className="w-full bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-700 transition flex justify-center items-center gap-2"
                                >
                                    Continuar a Reportes <ArrowRight size={18} />
                                </button>
                            )}
                        </div>
                    </div>
                );

            case 'reports':
                return (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center">
                            <h2 className="text-2xl font-bold">Visualización de Reportes {year}</h2>
                            <button
                                onClick={() => setCurrentStep('notes')}
                                className="px-6 py-2 bg-blue-600 text-white rounded-lg flex items-center gap-2"
                            >
                                Siguiente: Redactar Notas <ArrowRight size={18} />
                            </button>
                        </div>

                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            <div className="flex border-b bg-gray-50 overflow-x-auto">
                                {['Balance General', 'Estado de Resultados', 'Flujo de Efectivo', 'Cambios en Patrimonio'].map((tab) => (
                                    <button
                                        key={tab}
                                        onClick={() => setSelectedReport(tab)}
                                        className={`px-6 py-3 font-medium text-sm border-r last:border-r-0 transition-colors whitespace-nowrap
                      ${selectedReport === tab ? 'bg-white text-blue-600 border-b-2 border-b-blue-600' : 'text-gray-600 hover:text-blue-600 hover:bg-gray-100'}`}
                                    >
                                        {tab}
                                    </button>
                                ))}
                            </div>
                            <div className="min-h-[400px]">
                                {renderReportContent()}
                            </div>
                        </div>
                    </div>
                );

            case 'notes':
                return renderNotesContent();

            case 'export':
                return (
                    <div className="text-center py-20">
                        <h2 className="text-2xl font-bold mb-4">Exportación Final</h2>
                        <FileText size={64} className="mx-auto text-blue-600 mb-6" />
                        <p className="text-gray-600 mb-8 max-w-md mx-auto">
                            El sistema generará un paquete completo en PDF incluyendo:
                            <br />- Portada y Certificación
                            <br />- Los 4 Estados Financieros Básicos
                            <br />- Notas y Revelaciones
                        </p>
                        <div className="flex justify-center gap-4">
                            <button
                                onClick={() => setCurrentStep('notes')}
                                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                            >
                                Volver a Notas
                            </button>
                            <button
                                onClick={handleDownloadPDF}
                                disabled={isExporting}
                                className="px-8 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition shadow-lg shadow-blue-600/30 disabled:opacity-50"
                            >
                                {isExporting ? 'Generando...' : 'Descargar Estados Financieros'}
                            </button>
                        </div>
                    </div>
                );

            default:
                return <div>Paso no implementado</div>;
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            {/* Wizard Header */}
            <div className="max-w-4xl mx-auto mb-8">
                <div className="flex justify-between items-center relative">
                    <div className="absolute left-0 top-1/2 w-full h-1 bg-gray-200 -z-10" />
                    {STEPS.map((step, index) => {
                        const isActive = step.id === currentStep;
                        const isCompleted = STEPS.findIndex(s => s.id === currentStep) > index;

                        return (
                            <div key={step.id} className="flex flex-col items-center bg-gray-50 px-2 cursor-pointer" onClick={() => isCompleted && setCurrentStep(step.id)}>
                                <div
                                    className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors 
                    ${isActive ? 'border-blue-600 bg-blue-600 text-white' :
                                            isCompleted ? 'border-green-600 bg-green-600 text-white' : 'border-gray-300 bg-white text-gray-400'}`}
                                >
                                    <step.icon size={18} />
                                </div>
                                <span className={`text-xs mt-2 font-medium ${isActive ? 'text-blue-600' : 'text-gray-500'}`}>
                                    {step.title}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Step Content */}
            <div className="max-w-4xl mx-auto bg-white min-h-[500px] rounded-2xl shadow-sm p-6">
                {renderStepContent()}
            </div>
        </div>
    );
}
