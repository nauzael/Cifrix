import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../lib/db';
import { useAccountingStore } from '../../store/accountingStore';
import { FileText, TrendingUp, Landmark, PieChart, Printer, X } from 'lucide-react';
import { formatCurrency } from '../../lib/utils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface FinancialStatementsProps {
  organizationId: string;
}

export function FinancialStatements({ organizationId }: FinancialStatementsProps) {
  const {
    financialStatementType: statementType,
    setFinancialStatementType: setStatementType
  } = useAccountingStore();
  const accounts = useLiveQuery(() => db.accounts.where('organization_id').equals(organizationId).toArray(), [organizationId]);
  const journalEntries = useLiveQuery(() => db.journal_entries.toArray());
  const organization = useLiveQuery(() => db.organizations.get(organizationId), [organizationId]);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  if (!accounts || !journalEntries) return <div className="p-8 text-center text-slate-500">Cargando estados financieros...</div>;

  const calculateBalance = (accountId: string, accountType: string, nature: string) => {
    const entries = journalEntries.filter(e => e.account_id === accountId);
    const totalDebit = entries.reduce((sum, e) => sum + e.debit, 0);
    const totalCredit = entries.reduce((sum, e) => sum + e.credit, 0);

    if (nature === 'DEBITO') return totalDebit - totalCredit;
    return totalCredit - totalDebit;
  };

  // 1. Assets
  const assets = accounts.filter(a => a.type === 'ACTIVO').map(a => ({
    ...a,
    balance: calculateBalance(a.id, a.type, a.nature)
  })).filter(a => Math.abs(a.balance) > 0);
  const totalAssets = assets.reduce((sum, a) => sum + a.balance, 0);

  // 2. Liabilities
  const liabilities = accounts.filter(a => a.type === 'PASIVO').map(a => ({
    ...a,
    balance: calculateBalance(a.id, a.type, a.nature)
  })).filter(a => Math.abs(a.balance) > 0);
  const totalLiabilities = liabilities.reduce((sum, a) => sum + a.balance, 0);

  // 3. Equity
  const equity = accounts.filter(a => a.type === 'PATRIMONIO').map(a => ({
    ...a,
    balance: calculateBalance(a.id, a.type, a.nature)
  })).filter(a => Math.abs(a.balance) > 0);
  const totalEquity = equity.reduce((sum, a) => sum + a.balance, 0);

  // 4. Income
  const income = accounts.filter(a => a.type === 'INGRESO').map(a => ({
    ...a,
    balance: calculateBalance(a.id, a.type, a.nature)
  })).filter(a => Math.abs(a.balance) > 0);
  const totalIncome = income.reduce((sum, a) => sum + a.balance, 0);

  // 5. Expenses
  const expenses = accounts.filter(a => a.type === 'EGRESO').map(a => ({
    ...a,
    balance: calculateBalance(a.id, a.type, a.nature)
  })).filter(a => Math.abs(a.balance) > 0);
  const totalExpenses = expenses.reduce((sum, a) => sum + a.balance, 0);

  const netResult = totalIncome - totalExpenses;
  const accountingDifference = totalAssets - (totalLiabilities + totalEquity + netResult);
  const isBalanced = Math.abs(accountingDifference) < 0.01;
  const today = new Date();
  const generatedAt = `${today.toLocaleDateString()} ${today.toLocaleTimeString()}`;

  const buildPdf = () => {
    const doc = new jsPDF('p', 'pt', 'letter');
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 40;
    let y = margin;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text(organization?.name || 'Organización', margin, y);
    y += 22;

    doc.setFontSize(14);
    doc.text('Balance General', margin, y);
    y += 18;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    if (organization?.tax_id) {
      doc.text(`NIT: ${organization.tax_id}`, margin, y);
      y += 14;
    }
    doc.text(`A corte de: ${today.toLocaleDateString()}`, margin, y);
    y += 14;
    doc.text(`Generado el ${generatedAt}`, margin, y);
    y += 24;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Estado de Situación Financiera', margin, y);
    y += 10;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.text(`Total Activos: $ ${formatCurrency(totalAssets)}`, margin, y);
    y += 16;
    doc.text(`Total Pasivos: $ ${formatCurrency(totalLiabilities)}`, margin, y);
    y += 16;
    doc.text(`Patrimonio Neto: $ ${formatCurrency(totalEquity + netResult)}`, margin, y);
    y += 24;

    const head = [['Código', 'Nombre de la Cuenta', 'Tipo', 'Saldo']];

    const assetsBody = assets.map(a => [
      a.code,
      a.name,
      'Activo',
      `$ ${formatCurrency(a.balance)}`
    ]);

    const liabilitiesBody = liabilities.map(a => [
      a.code,
      a.name,
      'Pasivo',
      `$ ${formatCurrency(a.balance)}`
    ]);

    const equityBody = [
      ...equity.map(a => [
        a.code,
        a.name,
        'Patrimonio',
        `$ ${formatCurrency(a.balance)}`
      ]),
      [
        '',
        'Resultado del Ejercicio (Utilidad/Pérdida)',
        'Patrimonio',
        `$ ${formatCurrency(netResult)}`
      ]
    ];

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('1. Activos', margin, y);
    y += 6;
    autoTable(doc, {
      startY: y,
      head,
      body: assetsBody,
      theme: 'striped',
      headStyles: { fillColor: [228, 233, 244], textColor: 60 },
    });
    y = (doc as any).lastAutoTable.finalY + 20;

    doc.text('2. Pasivos', margin, y);
    y += 6;
    autoTable(doc, {
      startY: y,
      head,
      body: liabilitiesBody,
      theme: 'striped',
      headStyles: { fillColor: [228, 233, 244], textColor: 60 },
    });
    y = (doc as any).lastAutoTable.finalY + 20;

    doc.text('3. Patrimonio', margin, y);
    y += 6;
    autoTable(doc, {
      startY: y,
      head,
      body: equityBody,
      theme: 'striped',
      headStyles: { fillColor: [228, 233, 244], textColor: 60 },
      styles: { fontSize: 10 },
    });
    y = (doc as any).lastAutoTable.finalY + 20;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Ecuación Contable (A = P + PT)', margin, y);
    doc.text(`$ ${formatCurrency(totalAssets)}`, pageWidth - margin, y, { align: 'right' });
    y += 24;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('Este balance ha sido generado automáticamente de acuerdo a los PCGA.', margin, y);

    const totalPages = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(`Página ${i} de ${totalPages} - Cifrix Contable`, pageWidth / 2, doc.internal.pageSize.getHeight() - 20, { align: 'center' });
    }

    return doc;
  };

  const handleViewPdf = () => {
    const doc = buildPdf();
    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    setPdfUrl(url);
  };

  const handleDownloadPdf = () => {
    const doc = buildPdf();
    const fileName = `Balance_General_${today.toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* View Selector */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex gap-2 sm:gap-4 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl w-full sm:w-fit">
          <button
            onClick={() => setStatementType('balance')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 sm:px-6 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-bold transition-all ${statementType === 'balance' ? 'bg-white dark:bg-slate-900 shadow-lg text-blue-600' : 'text-slate-500'}`}
          >
            <Landmark size={16} className="sm:size-[18px]" />
            <span className="hidden xs:inline">Balance General</span>
            <span className="xs:hidden">Balance</span>
          </button>
          <button
            onClick={() => setStatementType('pnl')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 sm:px-6 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-bold transition-all ${statementType === 'pnl' ? 'bg-white dark:bg-slate-900 shadow-lg text-emerald-600' : 'text-slate-500'}`}
          >
            <TrendingUp size={16} className="sm:size-[18px]" />
            <span className="hidden xs:inline">Estado de Resultados</span>
            <span className="xs:hidden">Resultados</span>
          </button>
        </div>
        {statementType === 'balance' && (
          <button
            onClick={() => {
              const doc = buildPdf();
              const blob = doc.output('blob');
              const url = URL.createObjectURL(blob);
              window.open(url, '_blank');
              setTimeout(() => URL.revokeObjectURL(url), 60_000);
            }}
            className="flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg text-xs sm:text-sm font-bold hover:bg-blue-700 transition-colors"
          >
            <Printer size={16} className="sm:size-[18px]" /> Vista previa / PDF
          </button>
        )}
      </div>

      {statementType === 'balance' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
          {/* Assets Column */}
          <div className="space-y-4">
            <h4 className="text-base sm:text-lg font-black text-slate-800 dark:text-white flex items-center gap-2">
              <div className="size-2 bg-blue-600 rounded-full" /> 1. ACTIVOS
            </h4>
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-3 sm:p-4">
              <div className="space-y-1 sm:space-y-2">
                {assets.map(acc => (
                  <div key={acc.id} className="flex justify-between py-2 border-b border-slate-50 dark:border-slate-800 last:border-0">
                    <span className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-medium truncate mr-2">
                      <span className="font-mono text-[10px] sm:text-xs mr-2 opacity-60">{acc.code}</span>
                      {acc.name}
                    </span>
                    <span className="font-mono text-xs sm:text-sm font-bold whitespace-nowrap">$ {formatCurrency(acc.balance)}</span>
                  </div>
                ))}
                {assets.length === 0 && <p className="text-xs sm:text-sm text-slate-400 italic">No hay activos registrados.</p>}
              </div>
              <div className="mt-4 pt-4 border-t-2 border-slate-100 dark:border-slate-800 flex justify-between items-center">
                <span className="text-xs sm:text-sm font-black uppercase">Total Activos</span>
                <span className="font-mono text-base sm:text-lg font-black text-blue-600">$ {formatCurrency(totalAssets)}</span>
              </div>
            </div>
          </div>

          {/* Liabilities & Equity Column */}
          <div className="space-y-6 sm:space-y-8">
            <div className="space-y-4">
              <h4 className="text-base sm:text-lg font-black text-slate-800 dark:text-white flex items-center gap-2">
                <div className="size-2 bg-red-500 rounded-full" /> 2. PASIVOS
              </h4>
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-3 sm:p-4">
                <div className="space-y-1 sm:space-y-2">
                  {liabilities.map(acc => (
                    <div key={acc.id} className="flex justify-between py-2 border-b border-slate-50 dark:border-slate-800 last:border-0">
                      <span className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-medium truncate mr-2">
                        <span className="font-mono text-[10px] sm:text-xs mr-2 opacity-60">{acc.code}</span>
                        {acc.name}
                      </span>
                      <span className="font-mono text-xs sm:text-sm font-bold whitespace-nowrap">$ {formatCurrency(acc.balance)}</span>
                    </div>
                  ))}
                  {liabilities.length === 0 && <p className="text-xs sm:text-sm text-slate-400 italic">No hay pasivos registrados.</p>}
                </div>
                <div className="mt-4 pt-4 border-t-2 border-slate-100 dark:border-slate-800 flex justify-between items-center">
                  <span className="text-xs sm:text-sm font-black uppercase">Total Pasivos</span>
                  <span className="font-mono text-base sm:text-lg font-black text-red-600">$ {formatCurrency(totalLiabilities)}</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-base sm:text-lg font-black text-slate-800 dark:text-white flex items-center gap-2">
                <div className="size-2 bg-amber-500 rounded-full" /> 3. PATRIMONIO
              </h4>
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-3 sm:p-4">
                <div className="space-y-1 sm:space-y-2">
                  {equity.map(acc => (
                    <div key={acc.id} className="flex justify-between py-2 border-b border-slate-50 dark:border-slate-800 last:border-0">
                      <span className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-medium truncate mr-2">
                        <span className="font-mono text-[10px] sm:text-xs mr-2 opacity-60">{acc.code}</span>
                        {acc.name}
                      </span>
                      <span className="font-mono text-xs sm:text-sm font-bold whitespace-nowrap">$ {formatCurrency(acc.balance)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between py-2 border-b border-slate-50 dark:border-slate-800 last:border-0 italic">
                    <span className="text-xs sm:text-sm text-slate-500 font-medium mr-2">Resultado del Ejercicio</span>
                    <span className={`font-mono text-xs sm:text-sm font-bold whitespace-nowrap ${netResult >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      $ {formatCurrency(netResult)}
                    </span>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t-2 border-slate-100 dark:border-slate-800 flex justify-between items-center">
                  <span className="text-xs sm:text-sm font-black uppercase">Total Patrimonio</span>
                  <span className="font-mono text-base sm:text-lg font-black text-amber-600">$ {formatCurrency(totalEquity + netResult)}</span>
                </div>
              </div>
            </div>

            {/* Final Check */}
            <div className={`p-4 sm:p-6 rounded-xl border-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${isBalanced ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-400' : 'bg-red-50 border-red-200 text-red-800'}`}>
              <div className="w-full sm:w-auto">
                <h5 className="font-black uppercase tracking-widest text-[10px] mb-1">Ecuación Contable</h5>
                <p className="text-xs sm:text-sm font-medium">Activo = Pasivo + Patrimonio</p>
                {!isBalanced && (
                  <p className="text-xs sm:text-sm mt-1 font-bold">
                    Diferencia: <span className="font-mono">$ {formatCurrency(accountingDifference)}</span>
                  </p>
                )}
              </div>
              <div className="w-full sm:text-right">
                <p className="text-xl sm:text-2xl font-black">
                  {isBalanced ? 'EQUILIBRADO ✅' : 'DESCUADRADO ❌'}
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="max-w-3xl mx-auto space-y-6 sm:space-y-8">
          {/* P&L View */}
          <div className="space-y-4">
            <h4 className="text-lg sm:text-xl font-black text-slate-800 dark:text-white flex items-center gap-2">
              <PieChart className="text-emerald-600 size-5 sm:size-6" /> INGRESOS OPERACIONALES
            </h4>
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 sm:p-6">
              <div className="space-y-3 sm:space-y-4">
                {income.map(acc => (
                  <div key={acc.id} className="flex justify-between py-1">
                    <span className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 truncate mr-2">
                      <span className="font-mono text-[10px] sm:text-xs mr-3 opacity-50">{acc.code}</span>
                      {acc.name}
                    </span>
                    <span className="font-mono text-xs sm:text-sm font-bold text-emerald-600 whitespace-nowrap">$ {formatCurrency(acc.balance)}</span>
                  </div>
                ))}
              </div>
              <div className="mt-6 pt-4 border-t-2 border-slate-100 dark:border-slate-800 flex justify-between items-center">
                <span className="text-sm sm:text-base font-black uppercase">Total Ingresos</span>
                <span className="font-mono text-xl sm:text-2xl font-black text-emerald-600">$ {formatCurrency(totalIncome)}</span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-lg sm:text-xl font-black text-slate-800 dark:text-white flex items-center gap-2">
              <FileText className="text-red-500 size-5 sm:size-6" /> GASTOS OPERACIONALES
            </h4>
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 sm:p-6">
              <div className="space-y-3 sm:space-y-4">
                {expenses.map(acc => (
                  <div key={acc.id} className="flex justify-between py-1">
                    <span className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 truncate mr-2">
                      <span className="font-mono text-[10px] sm:text-xs mr-3 opacity-50">{acc.code}</span>
                      {acc.name}
                    </span>
                    <span className="font-mono text-xs sm:text-sm font-bold text-red-500 whitespace-nowrap">$ {formatCurrency(acc.balance)}</span>
                  </div>
                ))}
              </div>
              <div className="mt-6 pt-4 border-t-2 border-slate-100 dark:border-slate-800 flex justify-between items-center">
                <span className="text-sm sm:text-base font-black uppercase">Total Gastos</span>
                <span className="font-mono text-xl sm:text-2xl font-black text-red-500">$ {formatCurrency(totalExpenses)}</span>
              </div>
            </div>
          </div>

          {/* Final Net Result */}
          <div className={`p-6 sm:p-8 rounded-2xl border-2 sm:border-4 text-center ${netResult >= 0 ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800' : 'bg-red-50 border-red-200'}`}>
            <p className="text-[10px] sm:text-sm font-bold uppercase tracking-widest mb-2 text-slate-500">Resultado Neto del Ejercicio</p>
            <h3 className={`text-3xl sm:text-5xl font-black ${netResult >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              $ {formatCurrency(netResult)}
            </h3>
            <p className="mt-4 text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400">
              {netResult >= 0 ? 'Excelente! Su organización generó excedentes en este período.' : 'Atención! Se han generado pérdidas en este período.'}
            </p>
          </div>
        </div>
      )}

      {/* Removed overlay preview in favor of new tab preview */}
      {/* Keep printable HTML container for future use if needed */}
      {/* Preview now opens in a new browser tab using Blob URL */}
      <div className="hidden">
        <div className="pdf-container mx-auto bg-white dark:bg-slate-900 shadow-2xl min-h-[29.7cm] p-12 border border-slate-200 dark:border-slate-800">
          <header className="flex justify-between items-start border-b-2 border-slate-100 pb-8 mb-8">
            <div className="flex items-center gap-4">
              <div className="size-14 bg-blue-600 rounded-xl flex items-center justify-center text-white">
                <Landmark className="size-8" />
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white uppercase">
                  {organization?.name || 'Organización'}
                </h1>
                {organization?.tax_id && (
                  <p className="text-slate-500 text-sm font-medium">NIT: {organization.tax_id}</p>
                )}
              </div>
            </div>
            <div className="text-right">
              <div className="bg-blue-600/10 text-blue-600 px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase mb-2 inline-block">Reporte Oficial</div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Balance General</h2>
              <p className="text-slate-500 text-sm">A corte de: {today.toLocaleDateString()}</p>
              <p className="text-slate-400 text-xs mt-1 italic">Generado el {generatedAt}</p>
            </div>
          </header>
          <div className="mb-10">
            <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Estado de Situación Financiera</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
                <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Total Activos</p>
                <p className="text-lg font-black text-slate-900 dark:text-white">$ {formatCurrency(totalAssets)}</p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
                <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Total Pasivos</p>
                <p className="text-lg font-black text-slate-900 dark:text-white">$ {formatCurrency(totalLiabilities)}</p>
              </div>
              <div className="bg-blue-600/5 p-4 rounded-xl border border-blue-600/20">
                <p className="text-[10px] font-bold text-blue-600 uppercase mb-1">Patrimonio Neto</p>
                <p className="text-lg font-black text-blue-600">$ {formatCurrency(totalEquity + netResult)}</p>
              </div>
            </div>
          </div>
          <div className="mb-12">
            <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Detalle de Cuentas</h3>
            <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                    <th className="px-4 py-3 text-[11px] font-black text-slate-500 uppercase">Código</th>
                    <th className="px-4 py-3 text-[11px] font-black text-slate-500 uppercase">Nombre de la Cuenta</th>
                    <th className="px-4 py-3 text-[11px] font-black text-slate-500 uppercase">Tipo</th>
                    <th className="px-4 py-3 text-[11px] font-black text-slate-500 uppercase text-right">Saldo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  <tr className="bg-slate-50/50">
                    <td className="px-4 py-2 text-[10px] font-black text-blue-600 uppercase tracking-wider" colSpan={4}>1. Activos</td>
                  </tr>
                  {assets.map((acc, i) => (
                    <tr key={acc.id} className={i % 2 === 1 ? 'text-sm bg-slate-50/30' : 'text-sm'}>
                      <td className="px-4 py-3 text-slate-500">{acc.code}</td>
                      <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200">{acc.name}</td>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-1.5">
                          <span className="size-1.5 rounded-full bg-green-500"></span>
                          Activo
                        </span>
                      </td>
                      <td className="px-4 py-3 font-bold text-right">$ {formatCurrency(acc.balance)}</td>
                    </tr>
                  ))}
                  <tr className="bg-slate-50/50">
                    <td className="px-4 py-2 text-[10px] font-black text-blue-600 uppercase tracking-wider" colSpan={4}>2. Pasivos</td>
                  </tr>
                  {liabilities.map((acc, i) => (
                    <tr key={acc.id} className={i % 2 === 1 ? 'text-sm bg-slate-50/30' : 'text-sm'}>
                      <td className="px-4 py-3 text-slate-500">{acc.code}</td>
                      <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200">{acc.name}</td>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-1.5">
                          <span className="size-1.5 rounded-full bg-red-500"></span>
                          Pasivo
                        </span>
                      </td>
                      <td className="px-4 py-3 font-bold text-right">$ {formatCurrency(acc.balance)}</td>
                    </tr>
                  ))}
                  <tr className="bg-slate-50/50">
                    <td className="px-4 py-2 text-[10px] font-black text-blue-600 uppercase tracking-wider" colSpan={4}>3. Patrimonio</td>
                  </tr>
                  {equity.map((acc, i) => (
                    <tr key={acc.id} className={i % 2 === 1 ? 'text-sm bg-slate-50/30' : 'text-sm'}>
                      <td className="px-4 py-3 text-slate-500">{acc.code}</td>
                      <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200">{acc.name}</td>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-1.5">
                          <span className="size-1.5 rounded-full bg-amber-500"></span>
                          Patrimonio
                        </span>
                      </td>
                      <td className="px-4 py-3 font-bold text-right">$ {formatCurrency(acc.balance)}</td>
                    </tr>
                  ))}
                  <tr className="text-sm">
                    <td className="px-4 py-3 text-slate-500">Resultado del Ejercicio</td>
                    <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200">Utilidad/Pérdida</td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1.5">
                        <span className={`size-1.5 rounded-full ${netResult >= 0 ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                        Patrimonio
                      </span>
                    </td>
                    <td className={`px-4 py-3 font-bold text-right ${netResult >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>$ {formatCurrency(netResult)}</td>
                  </tr>
                </tbody>
                <tfoot className="bg-slate-50 dark:bg-slate-800/50">
                  <tr>
                    <td className="px-4 py-4 text-sm font-black text-slate-700 dark:text-slate-300 text-right uppercase tracking-wider" colSpan={3}>Ecuación Contable (A = P + PT)</td>
                    <td className="px-4 py-4 text-lg font-black text-blue-600 text-right">$ {formatCurrency(totalAssets)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <p className="mt-4 text-[10px] text-slate-400 italic">Este balance ha sido generado automáticamente de acuerdo a los principios de contabilidad generalmente aceptados.</p>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 mb-16">
            <h4 className="text-xs font-black text-slate-600 dark:text-slate-400 uppercase mb-2 flex items-center gap-2">
              Declaración de Veracidad
            </h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Certifico que la información financiera aquí presentada ha sido preparada y verificada bajo los estándares de auditoría interna de la organización. Los saldos reflejan fielmente la situación económica de la congregación a la fecha de corte.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-20 pt-10">
            <div className="text-center">
              <div className="border-t border-slate-400 pt-4 px-8">
                <p className="text-sm font-black text-slate-900 dark:text-white uppercase">Tesorero General</p>
                <p className="text-xs text-slate-500 mt-1">Nombre: ________________________</p>
                <p className="text-xs text-slate-500">C.C. ___________________________</p>
              </div>
            </div>
            <div className="text-center">
              <div className="border-t border-slate-400 pt-4 px-8">
                <p className="text-sm font-black text-slate-900 dark:text-white uppercase">Contador Público</p>
                <p className="text-xs text-slate-500 mt-1">Nombre: ________________________</p>
                <p className="text-xs text-slate-500">T.P. ___________________________</p>
              </div>
            </div>
          </div>
          <footer className="mt-20 pt-8 border-t border-slate-100 flex justify-between items-center text-[10px] text-slate-400 uppercase font-bold tracking-widest">
            <div>Página 1 de 1</div>
            <div>Código Interno: BG-{today.getFullYear()}</div>
            <div>Cifrix Contable</div>
          </footer>
        </div>
      </div>
    </div>
  );
}
