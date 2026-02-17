import { useState, useEffect } from 'react';
import { toast } from '../store/toastStore';
import { createPortal } from 'react-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, Organization } from '../lib/db';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  Download,
  ArrowUp,
  ArrowDown,
  Info,
  History,
  FileText,
  BarChart3,
  Banknote,
  Heart,
  ClipboardCheck,
  Table,
  Loader2
} from 'lucide-react';
import { formatCurrency, formatDate } from '../lib/utils';
import { useAuthStore } from '../store/authStore';

export function Reports() {
  const [org, setOrg] = useState<Organization | null>(null);
  const [orgId, setOrgId] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<string | null>(null);
  const [stats, setStats] = useState({
    incomeYTD: 0,
    expenseYTD: 0,
    netMargin: 0,
    efficiency: 0
  });
  const [selectedAuxAccId, setSelectedAuxAccId] = useState<string>('');

  useEffect(() => {
    const { profile } = useAuthStore.getState();
    const load = async () => {
      if (profile?.organizationId) {
        const current = await db.organizations.get(profile.organizationId);
        if (current) {
          setOrg(current);
          setOrgId(current.id);
          return;
        }
      }
      const orgs = await db.organizations.toArray();
      if (orgs.length > 0) {
        setOrg(orgs[0]);
        setOrgId(orgs[0].id);
      }
    };
    load();
  }, []);

  const journalEntries = useLiveQuery(
    () => orgId ? db.journal_entries.toArray() : [],
    [orgId]
  );

  const accounts = useLiveQuery(
    () => orgId ? db.accounts.toArray() : [],
    [orgId]
  );

  const transactions = useLiveQuery(
    () => orgId ? db.transactions.toArray() : [],
    [orgId]
  );

  const contributions = useLiveQuery(
    () => orgId ? db.contributions.toArray() : [],
    [orgId]
  );

  const members = useLiveQuery(
    () => orgId ? db.members.toArray() : [],
    [orgId]
  );

  useEffect(() => {
    if (!orgId || !journalEntries || !accounts) return;

    const calculateYTD = () => {
      let income = 0;
      let expense = 0;

      // Get only DETAIL accounts (those that accept movement)
      const detailAccounts = accounts.filter(a => a.accepts_movement);

      journalEntries.forEach(entry => {
        const account = detailAccounts.find(a => a.id === entry.account_id);
        if (account) {
          if (account.type === 'INGRESO') income += entry.credit;
          if (account.type === 'EGRESO') income -= entry.debit; // Correcting: Income is Credit - Debit
          if (account.type === 'EGRESO') expense += (entry.debit - entry.credit);
        }
      });

      // Recalculate properly based on account types
      const totalIncome = journalEntries
        .filter(e => accounts.find(a => a.id === e.account_id)?.type === 'INGRESO')
        .reduce((sum, e) => sum + (e.credit - e.debit), 0);

      const totalExpense = journalEntries
        .filter(e => accounts.find(a => a.id === e.account_id)?.type === 'EGRESO')
        .reduce((sum, e) => sum + (e.debit - e.credit), 0);

      setStats({
        incomeYTD: totalIncome,
        expenseYTD: totalExpense,
        netMargin: totalIncome - totalExpense,
        efficiency: totalIncome > 0 ? Math.round(((totalIncome - totalExpense) / totalIncome) * 100) : 0
      });
    };

    calculateYTD();
  }, [orgId, journalEntries, accounts]);

  const generateReport = async (name: string) => {
    if (!org) return;
    previewReport(name, true);
  };

  const buildHtml = (title: string) => {
    const orgName = org?.name || 'Organización';
    const taxId = org?.tax_id || '';
    const address = org?.settings?.address || '';
    const phone = org?.settings?.phone || '';
    const email = org?.settings?.email || '';
    const nowDate = new Date().toLocaleDateString();
    const nowTime = new Date().toLocaleTimeString();
    const printStyles = `
<style>
@page { 
  size: Letter; 
  margin: 0.5in;
}
html, body { 
  -webkit-print-color-adjust: exact !important; 
  print-color-adjust: exact !important;
  color-adjust: exact !important;
}
body { 
  background: #ffffff; 
  margin: 0;
  padding: 0;
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
}
.pdf-container { 
  width: 100%;
  max-width: 8in;
  margin: 0 auto; 
  background: #ffffff;
  position: relative;
}
@media print {
  .no-print { display: none !important; }
  body { 
    background: white !important; 
  }
  .pdf-container { 
    box-shadow: none !important; 
    border: none !important; 
    padding: 0 !important;
    width: 100% !important;
  }
  table { 
    width: 100% !important;
    border-collapse: collapse !important;
    page-break-inside: auto; 
  }
  thead { display: table-header-group !important; }
  tfoot { display: table-footer-group !important; }
  tr { page-break-inside: avoid !important; page-break-after: auto !important; }
  
  /* Repeating header for tables */
  .table-header {
    background-color: #f8fafc !important;
    -webkit-print-color-adjust: exact;
  }
}

/* Custom Table Styling for Reports */
.report-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
}
.report-table th {
  background-color: #f1f5f9;
  color: #475569;
  font-weight: 800;
  text-transform: uppercase;
  font-size: 10px;
  letter-spacing: 0.05em;
  padding: 12px 16px;
  border-bottom: 2px solid #e2e8f0;
}
.report-table td {
  padding: 10px 16px;
  border-bottom: 1px solid #f1f5f9;
  font-size: 12px;
  color: #334155;
}
.report-table tr:nth-child(even) {
  background-color: #f8fafc;
}
</style>
`;
    const calcBalance = (accId: string, nature: 'DEBITO' | 'CREDITO') => {
      const entries = journalEntries?.filter(e => e.account_id === accId) || [];
      const totalDebit = entries.reduce((s, e) => s + e.debit, 0);
      const totalCredit = entries.reduce((s, e) => s + e.credit, 0);
      return nature === 'DEBITO' ? (totalDebit - totalCredit) : (totalCredit - totalDebit);
    };
    if (title === 'Balance General') {
      const assetAccs = (accounts || []).filter(a => a.type === 'ACTIVO').map(a => ({ ...a, balance: calcBalance(a.id, a.nature) })).filter(a => Math.abs(a.balance) > 0);
      const liabilityAccs = (accounts || []).filter(a => a.type === 'PASIVO').map(a => ({ ...a, balance: calcBalance(a.id, a.nature) })).filter(a => Math.abs(a.balance) > 0);
      const equityAccs = (accounts || []).filter(a => a.type === 'PATRIMONIO').map(a => ({ ...a, balance: calcBalance(a.id, a.nature) })).filter(a => Math.abs(a.balance) > 0);
      const incomeAccs = (accounts || []).filter(a => a.type === 'INGRESO').map(a => ({ ...a, balance: calcBalance(a.id, a.nature) }));
      const expenseAccs = (accounts || []).filter(a => a.type === 'EGRESO').map(a => ({ ...a, balance: calcBalance(a.id, a.nature) }));
      const totalAssets = assetAccs.reduce((s, a) => s + a.balance, 0);
      const totalLiabilities = liabilityAccs.reduce((s, a) => s + a.balance, 0);
      const totalIncome = incomeAccs.reduce((s, a) => s + a.balance, 0);
      const totalExpenses = expenseAccs.reduce((s, a) => s + a.balance, 0);
      const netResult = totalIncome - totalExpenses;
      const patrimonioNeto = totalLiabilities + (equityAccs.reduce((s, a) => s + a.balance, 0) + netResult);
      const assetsRows = assetAccs.map((a, i) => `
        <tr class="text-sm ${i % 2 === 1 ? 'bg-slate-50/30' : ''}">
          <td class="px-4 py-3 text-slate-500">${a.code}</td>
          <td class="px-4 py-3 font-semibold text-slate-800">${a.name}</td>
          <td class="px-4 py-3"><span class="flex items-center gap-1.5"><span class="size-1.5 rounded-full bg-green-500"></span>Activo</span></td>
          <td class="px-4 py-3 font-bold text-right">$ ${formatCurrency(a.balance)}</td>
        </tr>
      `).join('');
      const liabilitiesRows = liabilityAccs.map((a, i) => `
        <tr class="text-sm ${i % 2 === 1 ? 'bg-slate-50/30' : ''}">
          <td class="px-4 py-3 text-slate-500">${a.code}</td>
          <td class="px-4 py-3 font-semibold text-slate-800">${a.name}</td>
          <td class="px-4 py-3"><span class="flex items-center gap-1.5"><span class="size-1.5 rounded-full bg-red-500"></span>Pasivo</span></td>
          <td class="px-4 py-3 font-bold text-right">$ ${formatCurrency(a.balance)}</td>
        </tr>
      `).join('');
      const equityRows = equityAccs.map((a, i) => `
        <tr class="text-sm ${i % 2 === 1 ? 'bg-slate-50/30' : ''}">
          <td class="px-4 py-3 text-slate-500">${a.code}</td>
          <td class="px-4 py-3 font-semibold text-slate-800">${a.name}</td>
          <td class="px-4 py-3"><span class="flex items-center gap-1.5"><span class="size-1.5 rounded-full bg-amber-500"></span>Patrimonio</span></td>
          <td class="px-4 py-3 font-bold text-right">$ ${formatCurrency(a.balance)}</td>
        </tr>
      `).join('');
      return `
<!DOCTYPE html><html class="light" lang="es"><head><meta charset="utf-8"/><meta content="width=device-width, initial-scale=1.0" name="viewport"/><title>Balance General</title><script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script><link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet"/><style type="text/tailwindcss">body{font-family:'Inter',sans-serif}</style>${printStyles}</head><body class="bg-slate-100 font-display min-h-screen py-10">
<div class="max-w-4xl mx-auto mb-6 px-4 no-print flex justify-between items-center">
<button class="flex items-center gap-2 text-slate-600 font-semibold" onclick="window.close()">Cerrar</button>
<button class="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg shadow-lg font-bold" onclick="window.print()">Imprimir / PDF</button>
</div>
<div class="pdf-container max-w-4xl mx-auto bg-white shadow-2xl min-h-[29.7cm] p-12 border border-slate-200">
<header class="flex justify-between items-start border-b-2 border-slate-100 pb-8 mb-8">
<div class="flex items-center gap-4">
  ${org?.settings?.logo_url ? `<img src="${org.settings.logo_url}" class="size-20 object-contain" />` : `<div class="size-14 bg-blue-600 rounded-xl flex items-center justify-center text-white"><span class="material-symbols-outlined text-4xl">church</span></div>`}
  <div><h1 class="text-2xl font-black tracking-tight text-slate-900 uppercase">${orgName}</h1><p class="text-slate-500 text-sm font-medium">NIT: ${taxId}</p><p class="text-slate-400 text-xs">${address}${phone ? ' • ' + phone : ''}${email ? ' • ' + email : ''}</p></div>
</div>
<div class="text-right"><div class="bg-blue-600/10 text-blue-600 px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase mb-2 inline-block">Reporte Oficial</div><h2 class="text-xl font-bold text-slate-900">Balance General</h2><p class="text-slate-500 text-sm">A corte de: ${nowDate}</p><p class="text-slate-400 text-xs mt-1 italic">Generado el ${nowDate} ${nowTime}</p></div>
</header>
<div class="mb-10">
<h3 class="text-sm font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Estado de Situación Financiera</h3>
<div class="grid grid-cols-3 gap-4">
<div class="bg-slate-50 p-4 rounded-xl border border-slate-100"><p class="text-[10px] font-bold text-slate-500 uppercase mb-1">Total Activos</p><p class="text-lg font-black text-slate-900">$ ${formatCurrency(totalAssets)}</p></div>
<div class="bg-slate-50 p-4 rounded-xl border border-slate-100"><p class="text-[10px] font-bold text-slate-500 uppercase mb-1">Total Pasivos</p><p class="text-lg font-black text-slate-900">$ ${formatCurrency(totalLiabilities)}</p></div>
<div class="bg-blue-600/5 p-4 rounded-xl border border-blue-600/20"><p class="text-[10px] font-bold text-blue-600 uppercase mb-1">Patrimonio Neto</p><p class="text-lg font-black text-blue-600">$ ${formatCurrency(patrimonioNeto)}</p></div>
</div>
</div>
<div class="mb-12">
<h3 class="text-sm font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Detalle de Cuentas</h3>
<div class="border border-slate-200 rounded-xl overflow-hidden">
<table class="w-full text-left border-collapse"><thead><tr class="bg-slate-50 border-b border-slate-200"><th class="px-4 py-3 text-[11px] font-black text-slate-500 uppercase">Código</th><th class="px-4 py-3 text-[11px] font-black text-slate-500 uppercase">Nombre de la Cuenta</th><th class="px-4 py-3 text-[11px] font-black text-slate-500 uppercase">Tipo</th><th class="px-4 py-3 text-[11px] font-black text-slate-500 uppercase text-right">Saldo</th></tr></thead>
<tbody class="divide-y divide-slate-100">
<tr class="bg-slate-50/50"><td class="px-4 py-2 text-[10px] font-black text-blue-600 uppercase tracking-wider" colspan="4">1. Activos</td></tr>
${assetsRows}
<tr class="bg-slate-50/50"><td class="px-4 py-2 text-[10px] font-black text-blue-600 uppercase tracking-wider" colspan="4">2. Pasivos</td></tr>
${liabilitiesRows}
<tr class="bg-slate-50/50"><td class="px-4 py-2 text-[10px] font-black text-blue-600 uppercase tracking-wider" colspan="4">3. Patrimonio</td></tr>
${equityRows}
<tr class="text-sm"><td class="px-4 py-3 text-slate-500">Resultado del Ejercicio</td><td class="px-4 py-3 font-semibold text-slate-800">Utilidad/Pérdida</td><td class="px-4 py-3"><span class="flex items-center gap-1.5"><span class="size-1.5 rounded-full ${netResult >= 0 ? 'bg-emerald-500' : 'bg-red-500'}"></span>Patrimonio</span></td><td class="px-4 py-3 font-bold text-right ${netResult >= 0 ? 'text-emerald-600' : 'text-red-600'}">$ ${formatCurrency(netResult)}</td></tr>
</tbody>
<tfoot class="bg-slate-50"><tr><td class="px-4 py-4 text-sm font-black text-slate-700 text-right uppercase tracking-wider" colspan="3">Ecuación Contable (A = P + PT)</td><td class="px-4 py-4 text-lg font-black text-blue-600 text-right">$ ${formatCurrency(totalAssets)}</td></tr></tfoot>
</table>
</div>
<p class="mt-4 text-[10px] text-slate-400 italic">* Este balance ha sido generado automáticamente de acuerdo a los principios de contabilidad generalmente aceptados.</p>
</div>

<div class="grid grid-cols-2 gap-20 pt-10"><div class="text-center"><div class="border-t border-slate-400 pt-4 px-8"><p class="text-sm font-black text-slate-900 uppercase">Tesorero General</p><p class="text-xs text-slate-500 mt-1">Nombre: ________________________</p><p class="text-xs text-slate-500">C.C. ___________________________</p></div></div><div class="text-center"><div class="border-t border-slate-400 pt-4 px-8"><p class="text-sm font-black text-slate-900 uppercase">Contador Público</p><p class="text-xs text-slate-500 mt-1">Nombre: ________________________</p><p class="text-xs text-slate-500">T.P. ___________________________</p></div></div></div>
<footer class="mt-20 pt-8 border-t border-slate-100 flex justify-between items-center text-[10px] text-slate-400 uppercase font-bold tracking-widest"><div>Página 1 de 1</div><div>Código Interno: BG-${new Date().getFullYear()}</div><div>Cifrix Contable</div></footer>
</div></body></html>`;
    }
    if (title === 'Estado de Resultados') {
      const incAccs = (accounts || []).filter(a => a.type === 'INGRESO').map(a => ({ ...a, balance: calcBalance(a.id, a.nature) })).filter(a => Math.abs(a.balance) > 0);
      const expAccs = (accounts || []).filter(a => a.type === 'EGRESO').map(a => ({ ...a, balance: calcBalance(a.id, a.nature) })).filter(a => Math.abs(a.balance) > 0);
      const totalInc = incAccs.reduce((s, a) => s + a.balance, 0);
      const totalExp = expAccs.reduce((s, a) => s + a.balance, 0);
      const net = totalInc - totalExp;
      const incRows = incAccs.map(a => `<tr class="text-sm"><td class="px-4 py-2 pl-8 text-slate-600">${a.code}. ${a.name}</td><td class="px-4 py-2 text-right text-slate-500">$ ${formatCurrency(a.balance)}</td><td class="px-4 py-2 text-right"></td></tr>`).join('');
      const expRows = expAccs.map(a => `<tr class="text-sm"><td class="px-4 py-2 pl-8 text-slate-600">${a.code}. ${a.name}</td><td class="px-4 py-2 text-right text-slate-500">$ ${formatCurrency(a.balance)}</td><td class="px-4 py-2 text-right"></td></tr>`).join('');
      return `
<!DOCTYPE html><html class="light" lang="es"><head><meta charset="utf-8"/><meta content="width=device-width, initial-scale=1.0" name="viewport"/><title>Estado de Resultados</title><script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script><link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet"/>${printStyles}</head><body class="bg-slate-100 font-display min-h-screen py-10">
<div class="max-w-4xl mx-auto mb-6 px-4 no-print flex justify-between items-center"><button class="flex items-center gap-2 text-slate-600 font-semibold" onclick="window.close()">Cerrar</button><button class="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg shadow-lg font-bold" onclick="window.print()">Imprimir / PDF</button></div>
<div class="pdf-container max-w-4xl mx-auto bg-white shadow-2xl min-h-[29.7cm] p-12 border border-slate-200">
<header class="flex justify-between items-start border-b-2 border-slate-100 pb-8 mb-8">
  <div class="flex items-center gap-4">
    ${org?.settings?.logo_url ? `<img src="${org.settings.logo_url}" class="size-20 object-contain" />` : `<div class="size-14 bg-blue-600 rounded-xl flex items-center justify-center text-white"><span class="material-symbols-outlined text-4xl">church</span></div>`}
    <div><h1 class="text-2xl font-black tracking-tight text-slate-900 uppercase">${orgName}</h1><p class="text-slate-500 text-sm font-medium">NIT: ${taxId}</p><p class="text-slate-400 text-xs">${address}${phone ? ' • ' + phone : ''}${email ? ' • ' + email : ''}</p></div>
  </div>
  <div class="text-right"><div class="bg-blue-600/10 text-blue-600 px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase mb-2 inline-block">Reporte Financiero</div><h2 class="text-xl font-bold text-slate-900 uppercase">Estado de Resultados</h2><p class="text-slate-500 text-sm">Periodo: ${nowDate}</p><p class="text-slate-400 text-xs mt-1 italic">Generado el ${nowDate} ${nowTime}</p></div>
</header>
<div class="mb-10"><h3 class="text-sm font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Resumen del Periodo</h3><div class="grid grid-cols-3 gap-4"><div class="bg-slate-50 p-4 rounded-xl border border-slate-100"><p class="text-[10px] font-bold text-slate-500 uppercase mb-1">Total Ingresos</p><p class="text-lg font-black text-emerald-600">$ ${formatCurrency(totalInc)}</p></div><div class="bg-slate-50 p-4 rounded-xl border border-slate-100"><p class="text-[10px] font-bold text-slate-500 uppercase mb-1">Total Gastos</p><p class="text-lg font-black text-red-600">$ ${formatCurrency(totalExp)}</p></div><div class="bg-blue-600/5 p-4 rounded-xl border border-blue-600/20"><p class="text-[10px] font-bold text-blue-600 uppercase mb-1">Resultado del Ejercicio</p><p class="text-lg font-black text-blue-600">$ ${formatCurrency(net)}</p></div></div></div>
<div class="mb-12"><h3 class="text-sm font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Detalle de Cuentas</h3><div class="border border-slate-200 rounded-xl overflow-hidden"><table class="w-full text-left border-collapse"><thead><tr class="bg-slate-50 border-b border-slate-200"><th class="px-4 py-3 text-[11px] font-black text-slate-500 uppercase w-1/2">Descripción de la Cuenta</th><th class="px-4 py-3 text-[11px] font-black text-slate-500 uppercase text-right">Parcial</th><th class="px-4 py-3 text-[11px] font-black text-slate-500 uppercase text-right">Total</th></tr></thead><tbody class="divide-y divide-slate-100"><tr class="bg-slate-50/50"><td class="px-4 py-2 font-black text-xs text-blue-600 uppercase" colspan="3">INGRESOS</td></tr>${incRows}<tr class="text-sm font-bold border-t border-slate-100"><td class="px-4 py-3 text-slate-900">TOTAL INGRESOS OPERACIONALES</td><td class="px-4 py-3 text-right"></td><td class="px-4 py-3 text-right text-emerald-600">$ ${formatCurrency(totalInc)}</td></tr><tr class="bg-slate-50/50"><td class="px-4 py-2 font-black text-xs text-red-500 uppercase" colspan="3">GASTOS</td></tr>${expRows}<tr class="text-sm font-bold border-t border-slate-100"><td class="px-4 py-3 text-slate-900">TOTAL GASTOS OPERACIONALES</td><td class="px-4 py-3 text-right"></td><td class="px-4 py-3 text-right text-red-600">$ ${formatCurrency(totalExp)}</td></tr></tbody><tfoot class="bg-blue-50"><tr><td class="px-4 py-4 text-sm font-black text-slate-700 uppercase tracking-wider">Resultado del Ejercicio (Excedente/Déficit)</td><td class="px-4 py-4 text-right"></td><td class="px-4 py-4 text-xl font-black text-blue-600 text-right">$ ${formatCurrency(net)}</td></tr></tfoot></table></div><p class="mt-4 text-[10px] text-slate-400 italic">* Reporte consolidado basado en los registros del libro mayor auxiliar.</p></div></div></body></html>`;
    }
    if (title === 'Flujo de Caja') {
      const cashAccs = (accounts || []).filter(a => a.accepts_movement && (a.name.toLowerCase().includes('caja') || a.name.toLowerCase().includes('banco') || a.code.startsWith('11')));
      const cashEntries = (journalEntries || []).filter(e => cashAccs.some(a => a.id === e.account_id));
      const monthly = new Map<string, { in: number; out: number }>();
      cashEntries.forEach(e => {
        const tx = transactions?.find(t => t.id === e.transaction_id);
        if (!tx) return;
        const monthKey = tx.date.substring(0, 7);
        if (!monthly.has(monthKey)) monthly.set(monthKey, { in: 0, out: 0 });
        const m = monthly.get(monthKey)!;
        m.in += e.debit;
        m.out += e.credit;
      });
      const sorted = Array.from(monthly.entries()).sort(([a], [b]) => a.localeCompare(b));
      const rows = sorted.map(([m, v]) => `<tr class="text-sm"><td class="px-6 py-3 text-slate-700">${m}</td><td class="px-6 py-3 text-right">$ ${formatCurrency(v.in)}</td><td class="px-6 py-3 text-right">$ ${formatCurrency(v.out)}</td><td class="px-6 py-3 font-semibold text-right ${v.in - v.out >= 0 ? 'text-emerald-600' : 'text-red-600'}">$ ${formatCurrency(v.in - v.out)}</td></tr>`).join('');
      const totalIn = sorted.reduce((s, [, v]) => s + v.in, 0);
      const totalOut = sorted.reduce((s, [, v]) => s + v.out, 0);
      const net = totalIn - totalOut;
      return `
<!DOCTYPE html><html class="light" lang="es"><head><meta charset="utf-8"/><meta content="width=device-width, initial-scale=1.0" name="viewport"/><title>Flujo de Caja</title><script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script><link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet"/></head><body class="bg-slate-100 font-display min-h-screen py-10"><div class="max-w-4xl mx-auto mb-6 px-4 no-print flex justify-between items-center"><button class="flex items-center gap-2 text-slate-600 font-semibold" onclick="window.close()">Cerrar</button><button class="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg shadow-lg font-bold" onclick="window.print()">Imprimir / PDF</button></div><div class="pdf-container max-w-4xl mx-auto bg-white shadow-2xl min-h-[29.7cm] p-12 border border-slate-200"><header class="flex justify-between items-start border-b-2 border-slate-100 pb-8 mb-8">
  <div class="flex items-center gap-4">
    ${org?.settings?.logo_url ? `<img src="${org.settings.logo_url}" class="size-16 object-contain" />` : ''}
    <div><h1 class="text-2xl font-black tracking-tight text-slate-900 uppercase">${orgName}</h1><p class="text-slate-500 text-sm font-medium">NIT: ${taxId}</p></div>
  </div>
  <div class="text-right"><div class="bg-blue-600/10 text-blue-600 px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase mb-2 inline-block">Estado Financiero</div><h2 class="text-xl font-bold text-slate-900">Flujo de Caja</h2><p class="text-slate-500 text-sm">Periodo: ${nowDate}</p><p class="text-slate-400 text-[10px] mt-1 italic uppercase">Generado el ${nowDate} ${nowTime}</p></div>
</header><div class="mb-10"><h3 class="text-sm font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Resumen de Liquidez</h3><div class="grid grid-cols-3 gap-4"><div class="bg-slate-50 p-5 rounded-xl border border-slate-100"><p class="text-[10px] font-bold text-slate-500 uppercase mb-1">Entradas</p><p class="text-xl font-black text-emerald-600">$ ${formatCurrency(totalIn)}</p></div><div class="bg-slate-50 p-5 rounded-xl border border-slate-100"><p class="text-[10px] font-bold text-slate-500 uppercase mb-1">Salidas</p><p class="text-xl font-black text-red-600">$ ${formatCurrency(totalOut)}</p></div><div class="bg-blue-600/5 p-5 rounded-xl border border-blue-600/20"><p class="text-[10px] font-bold text-blue-600 uppercase mb-1">Saldo Neto</p><p class="text-xl font-black text-blue-600">$ ${formatCurrency(net)}</p></div></div></div><div class="mb-12"><h3 class="text-sm font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Detalle de Actividades</h3><div class="border border-slate-200 rounded-xl overflow-hidden"><table class="w-full text-left border-collapse"><thead><tr class="bg-slate-50 border-b border-slate-200"><th class="px-6 py-3 text-[11px] font-black text-slate-500 uppercase">Periodo</th><th class="px-6 py-3 text-[11px] font-black text-slate-500 uppercase text-right">Ingresos</th><th class="px-6 py-3 text-[11px] font-black text-slate-500 uppercase text-right">Egresos</th><th class="px-6 py-3 text-[11px] font-black text-slate-500 uppercase text-right">Saldo Neto</th></tr></thead><tbody class="divide-y divide-slate-100">${rows}</tbody><tfoot class="bg-slate-900 text-white"><tr><td class="px-6 py-4 text-sm font-black uppercase tracking-wider">Totales</td><td class="px-6 py-4 text-right">$ ${formatCurrency(totalIn)}</td><td class="px-6 py-4 text-right">$ ${formatCurrency(totalOut)}</td><td class="px-6 py-4 text-lg font-black text-right bg-white text-blue-600">$ ${formatCurrency(net)}</td></tr></tfoot></table></div></div></div></body></html>`;
    }
    if (title === 'Diezmos y Ofrendas') {
      const diezmos = (contributions || []).filter(c => c.category === 'DIEZMO').reduce((s, c) => s + c.amount, 0);
      const ofrendas = (contributions || []).filter(c => c.category === 'OFRENDA').reduce((s, c) => s + c.amount, 0);
      const especiales = (contributions || []).filter(c => c.category === 'ESPECIAL').reduce((s, c) => s + c.amount, 0);
      const total = diezmos + ofrendas + especiales;
      const rows = (contributions || []).map(c => {
        const m = members?.find(x => x.id === c.member_id);
        return `<tr class="text-sm"><td class="px-4 py-2">${formatDate(c.date)}</td><td class="px-4 py-2">${m?.full_name || 'Anónimo'}</td><td class="px-4 py-2">${c.category === 'DIEZMO' ? 'Diezmo' : c.category === 'OFRENDA' ? 'Ofrenda' : 'Especial'}</td><td class="px-4 py-2">${c.method}</td><td class="px-4 py-2 text-right font-bold">$ ${formatCurrency(c.amount)}</td></tr>`;
      }).join('');
      return `
<!DOCTYPE html><html class="light" lang="es"><head><meta charset="utf-8"/><meta content="width=device-width, initial-scale=1.0" name="viewport"/><title>Diezmos y Ofrendas</title><script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script><link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet"/><style type="text/tailwindcss">body{font-family:'Inter',sans-serif}</style>${printStyles}</head><body class="bg-slate-100 font-display min-h-screen py-10"><div class="max-w-4xl mx-auto mb-6 px-4 no-print flex justify-between items-center"><button class="flex items-center gap-2 text-slate-600 font-semibold" onclick="window.close()">Cerrar</button><button class="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg shadow-lg font-bold" onclick="window.print()">Imprimir / PDF</button></div><div class="pdf-container max-w-4xl mx-auto bg-white shadow-2xl min-h-[29.7cm] p-12 border border-slate-200"><header class="flex justify-between items-start border-b-2 border-slate-100 pb-8 mb-8">
  <div class="flex items-center gap-4">
    ${org?.settings?.logo_url ? `<img src="${org.settings.logo_url}" class="size-20 object-contain" />` : ''}
    <div><h1 class="text-2xl font-black tracking-tight text-slate-900 uppercase">${orgName}</h1><p class="text-slate-500 text-sm font-medium">NIT: ${taxId}</p><p class="text-slate-400 text-xs">${address}</p></div>
  </div>
  <div class="text-right"><div class="bg-blue-600/10 text-blue-600 px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase mb-2 inline-block">Reporte Oficial</div><h2 class="text-xl font-bold text-slate-900">Diezmos y Ofrendas</h2><p class="text-slate-500 text-sm">Periodo: ${nowDate}</p><p class="text-slate-400 text-xs mt-1 italic">Generado el ${nowDate} ${nowTime}</p></div>
</header><div class="mb-10"><h3 class="text-sm font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Resumen de Recaudación</h3><div class="grid grid-cols-4 gap-4"><div class="bg-slate-50 p-4 rounded-xl border border-slate-100"><p class="text-[10px] font-bold text-slate-500 uppercase mb-1">Total Diezmos</p><p class="text-lg font-black text-slate-900">$ ${formatCurrency(diezmos)}</p></div><div class="bg-slate-50 p-4 rounded-xl border border-slate-100"><p class="text-[10px] font-bold text-slate-500 uppercase mb-1">Total Ofrendas</p><p class="text-lg font-black text-slate-900">$ ${formatCurrency(ofrendas)}</p></div><div class="bg-slate-50 p-4 rounded-xl border border-slate-100"><p class="text-[10px] font-bold text-slate-500 uppercase mb-1">Proyectos Esp.</p><p class="text-lg font-black text-slate-900">$ ${formatCurrency(especiales)}</p></div><div class="bg-blue-600/5 p-4 rounded-xl border border-blue-600/20"><p class="text-[10px] font-bold text-blue-600 uppercase mb-1">Gran Total</p><p class="text-lg font-black text-blue-600">$ ${formatCurrency(total)}</p></div></div></div><div class="mb-12"><h3 class="text-sm font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Detalle de Contribuyentes</h3><div class="border border-slate-200 rounded-xl overflow-hidden"><table class="w-full text-left border-collapse"><thead><tr class="bg-slate-50 border-b border-slate-200"><th class="px-4 py-3 text-[11px] font-black text-slate-500 uppercase">Fecha</th><th class="px-4 py-3 text-[11px] font-black text-slate-500 uppercase">Miembro</th><th class="px-4 py-3 text-[11px] font-black text-slate-500 uppercase">Categoría</th><th class="px-4 py-3 text-[11px] font-black text-slate-500 uppercase">Método</th><th class="px-4 py-3 text-[11px] font-black text-slate-500 uppercase text-right">Monto</th></tr></thead><tbody class="divide-y divide-slate-100">${rows}</tbody><tfoot class="bg-slate-50"><tr><td class="px-4 py-4 text-sm font-black text-slate-700 uppercase tracking-wider" colspan="4">Subtotal Reportado</td><td class="px-4 py-4 text-lg font-black text-blue-600 text-right">$ ${formatCurrency(total)}</td></tr></tfoot></table></div><p class="mt-4 text-[10px] text-slate-400 italic">* Este listado corresponde al periodo seleccionado.</p></div><div class="grid grid-cols-2 gap-20 pt-10"><div class="text-center"><div class="border-t border-slate-400 pt-4 px-8"><p class="text-sm font-black text-slate-900 uppercase">Tesorero General</p><p class="text-xs text-slate-500 mt-1">Nombre: ________________________</p><p class="text-xs text-slate-500">C.C. ___________________________</p></div></div><div class="text-center"><div class="border-t border-slate-400 pt-4 px-8"><p class="text-sm font-black text-slate-900 uppercase">Revisor Fiscal / Pastor</p><p class="text-xs text-slate-500 mt-1">Nombre: ________________________</p><p class="text-xs text-slate-500">C.C. ___________________________</p></div></div></div><footer class="mt-20 pt-8 border-t border-slate-100 flex justify-between items-center text-[10px] text-slate-400 uppercase font-bold tracking-widest"><div>Página 1 de 1</div><div>Código Interno: DO-${new Date().getFullYear()}</div><div>Cifrix Contable</div></footer></div></body></html>`;
    }
    if (title === 'Certificado de Donación') {
      const sums = new Map<string, number>();
      (contributions || []).forEach(c => {
        if (!c.member_id) return;
        sums.set(c.member_id, (sums.get(c.member_id) || 0) + c.amount);
      });
      const top = Array.from(sums.entries()).sort((a, b) => b[1] - a[1])[0];
      const member = members?.find(m => m.id === (top?.[0] || '')) || null;
      const total = top?.[1] || 0;
      const diezmos = (contributions || []).filter(c => c.member_id === member?.id && c.category === 'DIEZMO').reduce((s, c) => s + c.amount, 0);
      const ofrendas = (contributions || []).filter(c => c.member_id === member?.id && c.category === 'OFRENDA').reduce((s, c) => s + c.amount, 0);
      const especiales = (contributions || []).filter(c => c.member_id === member?.id && c.category === 'ESPECIAL').reduce((s, c) => s + c.amount, 0);
      return `
<!DOCTYPE html><html class="light" lang="es"><head><meta charset="utf-8"/><meta content="width=device-width, initial-scale=1.0" name="viewport"/><title>Certificado de Donación</title><script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script><link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet"/></head><body class="bg-slate-100 font-display min-h-screen py-10"><div class="max-w-4xl mx-auto mb-6 px-4 no-print flex justify-between items-center"><button class="flex items-center gap-2 text-slate-600 font-semibold" onclick="window.close()">Cerrar</button><button class="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg shadow-lg font-bold" onclick="window.print()">Descargar Certificado</button></div><div class="pdf-container max-w-4xl mx-auto bg-white shadow-2xl min-h-[29.7cm] p-16 border-[12px] border-blue-600/10 relative overflow-hidden"><header class="flex flex-col items-center text-center mb-12">
  ${org?.settings?.logo_url ? `<img src="${org.settings.logo_url}" class="h-24 object-contain mb-6" />` : `<div class="size-24 bg-blue-600 rounded-full flex items-center justify-center text-white mb-6 shadow-xl"><span class="material-symbols-outlined text-6xl">church</span></div>`}
  <div class="space-y-1"><h1 class="text-3xl font-black tracking-tight text-slate-900 uppercase">${orgName}</h1><p class="text-slate-600 font-bold text-base tracking-widest uppercase">NIT: ${taxId}</p><p class="text-slate-400 text-sm">${address}</p></div>
</header><div class="text-center mb-16"><div class="inline-block border-y-2 border-blue-600/20 py-2 px-12 mb-4"><h2 class="text-4xl font-serif font-black text-slate-900 tracking-tight uppercase">Certificado de Donación</h2></div><p class="text-slate-500 font-medium italic">Expedido para fines tributarios y legales</p></div><div class="text-center mb-12 space-y-6"><p class="text-xl text-slate-800 leading-relaxed max-w-2xl mx-auto">La <span class="font-bold">${orgName}</span> debidamente constituida y reconocida legalmente,</p><h3 class="text-2xl font-black text-blue-600 uppercase tracking-wider">CERTIFICA QUE:</h3><div class="py-4"><p class="text-2xl font-bold text-slate-900 mb-1">${member?.full_name || 'CONTRIBUYENTE'}</p><p class="text-slate-500 text-lg uppercase tracking-widest">Identificación: ${member?.document_id || 'N/A'}</p></div><p class="text-lg text-slate-700 leading-relaxed text-justify px-8">Ha realizado aportes y donaciones voluntarias durante el año gravable ${new Date().getFullYear()}, por un valor total de <span class="font-black text-blue-600 underline underline-offset-4 tracking-tight uppercase">$ ${formatCurrency(total)}</span>.</p></div><div class="mb-12 px-8"><div class="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden"><div class="bg-blue-600/5 px-4 py-2 border-b border-slate-200"><h4 class="text-xs font-black text-blue-600 uppercase tracking-[0.1em]">Desglose de Aportaciones Anuales</h4></div><table class="w-full text-left text-sm"><thead><tr class="text-slate-400 border-b border-slate-100"><th class="px-6 py-3 font-black uppercase text-[10px]">Concepto</th><th class="px-6 py-3 font-black uppercase text-[10px] text-right">Monto Acumulado</th></tr></thead><tbody class="divide-y divide-slate-100"><tr><td class="px-6 py-3 font-medium text-slate-700">Diezmos Anuales</td><td class="px-6 py-3 font-bold text-right text-slate-900">$ ${formatCurrency(diezmos)}</td></tr><tr><td class="px-6 py-3 font-medium text-slate-700">Ofrendas Especiales</td><td class="px-6 py-3 font-bold text-right text-slate-900">$ ${formatCurrency(ofrendas)}</td></tr><tr><td class="px-6 py-3 font-medium text-slate-700">Donaciones Extraordinarias</td><td class="px-6 py-3 font-bold text-right text-slate-900">$ ${formatCurrency(especiales)}</td></tr></tbody><tfoot class="bg-slate-100"><tr class="font-black"><td class="px-6 py-4 text-slate-900 uppercase tracking-wider">Total Certificado</td><td class="px-6 py-4 text-right text-lg text-blue-600">$ ${formatCurrency(total)}</td></tr></tfoot></table></div></div><div class="grid grid-cols-2 gap-20 pt-16 px-12"><div class="text-center"><div class="h-20 flex items-end justify-center mb-2"><div class="border-b border-slate-300 w-full mb-4"></div></div><p class="text-sm font-black text-slate-900 uppercase">Representante Legal / Pastor Principal</p></div><div class="text-center"><div class="h-20 flex items-end justify-center mb-2"><div class="border-b border-slate-300 w-full mb-4"></div></div><p class="text-sm font-black text-slate-900 uppercase">Tesorera General</p></div></div><footer class="mt-24 pt-8 border-t border-slate-100 flex justify-between items-center text-[9px] text-slate-400 uppercase font-bold tracking-[0.2em]"><div class="flex items-center gap-2"><span class="material-symbols-outlined text-sm">lock</span>Código: CERT-${new Date().getFullYear()}</div><div>Generado por Cifrix</div><div>Página 1 de 1</div></footer></div></body></html>`;
    }
    if (title === 'Caja General') {
      const cajaAcc = (accounts || []).find(a => a.name.toLowerCase().includes('caja')) || (accounts || []).find(a => a.code.startsWith('11')) || null;
      const entries = (journalEntries || []).filter(e => cajaAcc && e.account_id === cajaAcc.id).sort((a, b) => {
        const ad = new Date(transactions?.find(t => t.id === a.transaction_id)?.date || '').getTime();
        const bd = new Date(transactions?.find(t => t.id === b.transaction_id)?.date || '').getTime();
        return ad - bd;
      });
      let running = 0;
      const rows = entries.map(e => {
        const tx = transactions?.find(t => t.id === e.transaction_id);
        running += e.debit - e.credit;
        return `<tr class="text-sm"><td class="px-4 py-3 text-slate-600">${formatDate(tx?.date || '')}</td><td class="px-4 py-3 text-slate-500">${tx?.reference_no || ''}</td><td class="px-4 py-3">${tx?.description || 'Sin descripción'}</td><td class="px-4 py-3 text-right ${e.debit > 0 ? 'text-emerald-600' : 'text-slate-400'}">${e.debit > 0 ? `$ ${formatCurrency(e.debit)}` : '$ 0'}</td><td class="px-4 py-3 text-right ${e.credit > 0 ? 'text-red-500' : 'text-slate-400'}">${e.credit > 0 ? `$ ${formatCurrency(e.credit)}` : '$ 0'}</td><td class="px-4 py-3 font-bold text-right">$ ${formatCurrency(running)}</td></tr>`;
      }).join('');
      const totalDebit = entries.reduce((s, e) => s + e.debit, 0);
      const totalCredit = entries.reduce((s, e) => s + e.credit, 0);
      const saldoActual = totalDebit - totalCredit;
      return `
<!DOCTYPE html><html class="light" lang="es"><head><meta charset="utf-8"/><meta content="width=device-width, initial-scale=1.0" name="viewport"/><title>Caja General</title><script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script><link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet"/></head><body class="bg-slate-100 font-display min-h-screen py-10"><div class="max-w-4xl mx-auto mb-6 px-4 no-print flex justify-between items-center"><button class="flex items-center gap-2 text-slate-600 font-semibold" onclick="window.close()">Cerrar</button><button class="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg shadow-lg font-bold" onclick="window.print()">Imprimir / PDF</button></div><div class="pdf-container max-w-4xl mx-auto bg-white shadow-2xl min-h-[29.7cm] p-12 border border-slate-200"><header class="flex justify-between items-start border-b-2 border-slate-100 pb-8 mb-8">
  <div class="flex items-center gap-4">
    ${org?.settings?.logo_url ? `<img src="${org.settings.logo_url}" class="size-16 object-contain" />` : ''}
    <div><h1 class="text-2xl font-black tracking-tight text-slate-900 uppercase">${orgName}</h1><p class="text-slate-500 text-sm font-medium">NIT: ${taxId}</p></div>
  </div>
  <div class="text-right"><div class="bg-blue-600/10 text-blue-600 px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase mb-2 inline-block">Reporte Oficial</div><h2 class="text-xl font-bold text-slate-900">${cajaAcc ? `${cajaAcc.code} - ${cajaAcc.name}` : 'Caja General'}</h2><p class="text-slate-500 text-sm">Generado el ${nowDate} ${nowTime}</p></div>
</header><div class="grid grid-cols-2 gap-4 mb-6"><div class="bg-slate-50 p-4 rounded-xl border"><p class="text-[10px] font-bold text-slate-500 uppercase mb-1">Saldo Actual</p><p class="text-lg font-black text-blue-600">$ ${formatCurrency(saldoActual)}</p></div><div class="bg-slate-50 p-4 rounded-xl border"><p class="text-[10px] font-bold text-slate-500 uppercase mb-1">Total Débitos / Créditos</p><p class="text-lg font-black text-slate-900">$ ${formatCurrency(totalDebit)} / $ ${formatCurrency(totalCredit)}</p></div></div><div class="border border-slate-200 rounded-xl overflow-hidden"><table class="w-full text-left border-collapse"><thead><tr class="bg-slate-50 border-b border-slate-200"><th class="px-4 py-3 text-[11px] font-black text-slate-500 uppercase">Fecha</th><th class="px-4 py-3 text-[11px] font-black text-slate-500 uppercase">Ref</th><th class="px-4 py-3 text-[11px] font-black text-slate-500 uppercase">Descripción</th><th class="px-4 py-3 text-[11px] font-black text-slate-500 uppercase text-right">Débito</th><th class="px-4 py-3 text-[11px] font-black text-slate-500 uppercase text-right">Crédito</th><th class="px-4 py-3 text-[11px] font-black text-slate-500 uppercase text-right">Saldo</th></tr></thead><tbody class="divide-y divide-slate-100">${rows}</tbody><tfoot class="bg-slate-50"><tr><td class="px-4 py-4 text-sm font-black text-slate-700 uppercase tracking-wider" colspan="3">Totales del periodo</td><td class="px-4 py-4 text-right font-bold text-emerald-600">$ ${formatCurrency(totalDebit)}</td><td class="px-4 py-4 text-right font-bold text-red-600">$ ${formatCurrency(totalCredit)}</td><td class="px-4 py-4 text-right font-black text-blue-600">$ ${formatCurrency(saldoActual)}</td></tr></tfoot></table></div><p class="mt-4 text-[10px] text-slate-400 italic">Este reporte muestra únicamente movimientos conciliados y registrados en el libro auxiliar de la cuenta seleccionada.</p></div></body></html>`;
    }
    if (title === 'Libro Auxiliar') {
      const targetAcc = (accounts || []).find(a => a.id === selectedAuxAccId) || (accounts || []).find(a => a.accepts_movement) || null;
      const entries = (journalEntries || []).filter(e => targetAcc && e.account_id === targetAcc.id).sort((a, b) => {
        const ad = new Date(transactions?.find(t => t.id === a.transaction_id)?.date || '').getTime();
        const bd = new Date(transactions?.find(t => t.id === b.transaction_id)?.date || '').getTime();
        return ad - bd;
      });
      let running = 0;
      const rows = entries.map(e => {
        const tx = transactions?.find(t => t.id === e.transaction_id);
        running += e.debit - e.credit;
        return `<tr class="text-sm"><td class="px-4 py-3 text-slate-600">${formatDate(tx?.date || '')}</td><td class="px-4 py-3 text-slate-500">${tx?.reference_no || ''}</td><td class="px-4 py-3">${tx?.description || 'Sin descripción'}</td><td class="px-4 py-3 text-right ${e.debit > 0 ? 'text-emerald-600' : 'text-slate-400'}">${e.debit > 0 ? `$ ${formatCurrency(e.debit)}` : '$ 0'}</td><td class="px-4 py-3 text-right ${e.credit > 0 ? 'text-red-500' : 'text-slate-400'}">${e.credit > 0 ? `$ ${formatCurrency(e.credit)}` : '$ 0'}</td><td class="px-4 py-3 font-bold text-right">$ ${formatCurrency(running)}</td></tr>`;
      }).join('');
      const totalDebit = entries.reduce((s, e) => s + e.debit, 0);
      const totalCredit = entries.reduce((s, e) => s + e.credit, 0);
      const saldoActual = totalDebit - totalCredit;
      const firstTxDate = entries.length > 0 ? transactions?.find(t => t.id === entries[0].transaction_id)?.date || '' : '';
      const lastTxDate = entries.length > 0 ? transactions?.find(t => t.id === entries[entries.length - 1].transaction_id)?.date || '' : '';
      return `
<!DOCTYPE html><html class="light" lang="es"><head><meta charset="utf-8"/><meta content="width=device-width, initial-scale=1.0" name="viewport"/><title>Libro Auxiliar</title><script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script><link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet"/></head><body class="bg-slate-100 font-display min-h-screen py-10"><div class="max-w-5xl mx-auto mb-6 px-4 no-print flex justify-between items-center"><button class="flex items-center gap-2 text-slate-600 font-semibold" onclick="window.close()">Cerrar</button><button class="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg shadow-lg font-bold" onclick="window.print()">Imprimir / PDF</button></div><div class="pdf-container max-w-5xl mx-auto bg-white shadow-2xl min-h-[29.7cm] p-12 border border-slate-200"><header class="flex justify-between items-start border-b-2 border-slate-100 pb-8 mb-8">
  <div class="flex items-center gap-4">
    ${org?.settings?.logo_url ? `<img src="${org.settings.logo_url}" class="size-16 object-contain" />` : `<div class="size-14 bg-blue-600 rounded-xl flex items-center justify-center text-white"><span class="material-symbols-outlined text-4xl">account_balance_wallet</span></div>`}
    <div><h1 class="text-2xl font-black tracking-tight text-slate-900 uppercase">${orgName}</h1><p class="text-slate-500 text-sm font-medium">NIT: ${taxId}</p><p class="text-slate-400 text-xs uppercase tracking-wider">Libro Auxiliar Contable</p></div>
  </div>
  <div class="text-right"><div class="bg-blue-600/10 text-blue-600 px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase mb-2 inline-block">Reporte Oficial</div><h2 class="text-xl font-bold text-slate-900">${targetAcc ? `${targetAcc.code} - ${targetAcc.name}` : 'Cuenta'}</h2><p class="text-slate-500 text-sm">Periodo: ${firstTxDate ? formatDate(firstTxDate) : nowDate} al ${lastTxDate ? formatDate(lastTxDate) : nowDate}</p><p class="text-slate-400 text-xs mt-1 italic">Generado el ${nowDate} ${nowTime}</p></div>
</header><div class="grid grid-cols-2 gap-6 mb-8"><div class="bg-blue-600/5 p-6 rounded-2xl border border-blue-600/20 flex justify-between items-center"><div><p class="text-[11px] font-black text-blue-600 uppercase tracking-widest mb-1">Saldo Actual</p><p class="text-2xl font-black text-blue-600">$ ${formatCurrency(saldoActual)}</p></div><div class="size-12 rounded-full bg-blue-600/10 flex items-center justify-center"><span class="material-symbols-outlined text-blue-600">account_balance</span></div></div><div class="bg-slate-50 p-6 rounded-2xl border flex justify-between items-center"><div><p class="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">Débitos / Créditos</p><p class="text-2xl font-black text-slate-900">$ ${formatCurrency(totalDebit)} / $ ${formatCurrency(totalCredit)}</p></div><div class="size-12 rounded-full bg-slate-200/50 flex items-center justify-center"><span class="material-symbols-outlined text-slate-500">summarize</span></div></div></div><div class="mb-12"><h3 class="text-sm font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2"><span class="material-symbols-outlined text-sm">list_alt</span>Detalle de Movimientos</h3><div class="border border-slate-200 rounded-xl overflow-hidden"><table class="w-full text-left border-collapse"><thead><tr class="bg-slate-50 border-b border-slate-200"><th class="px-4 py-3 text-[11px] font-black text-slate-500 uppercase">Fecha</th><th class="px-4 py-3 text-[11px] font-black text-slate-500 uppercase">Ref.</th><th class="px-4 py-3 text-[11px] font-black text-slate-500 uppercase">Descripción</th><th class="px-4 py-3 text-[11px] font-black text-slate-500 uppercase text-right">Débito</th><th class="px-4 py-3 text-[11px] font-black text-slate-500 uppercase text-right">Crédito</th><th class="px-4 py-3 text-[11px] font-black text-slate-500 uppercase text-right">Saldo</th></tr></thead><tbody class="divide-y divide-slate-100">${rows}</tbody><tfoot class="bg-slate-50"><tr><td class="px-4 py-4 text-xs font-black text-slate-700 text-right uppercase tracking-wider" colspan="3">Totales del Periodo</td><td class="px-4 py-4 text-sm font-bold text-emerald-700 text-right">$ ${formatCurrency(totalDebit)}</td><td class="px-4 py-4 text-sm font-bold text-rose-700 text-right">$ ${formatCurrency(totalCredit)}</td><td class="px-4 py-4 text-lg font-black text-blue-600 text-right">$ ${formatCurrency(saldoActual)}</td></tr></tfoot></table></div><p class="mt-4 text-[10px] text-slate-400 italic">Este reporte corresponde al libro auxiliar de la cuenta seleccionada.</p></div><footer class="mt-20 pt-8 border-t border-slate-100 flex justify-between items-center text-[10px] text-slate-400 uppercase font-bold tracking-widest"><div>Página 1 de 1</div><div>Cifrix Contable</div></footer></div></body></html>`;
    }
    if (title === 'Ejecución Presupuestaria') {
      const expByCat = new Map<string, number>();
      (journalEntries || []).forEach(e => {
        const acc = (accounts || []).find(a => a.id === e.account_id);
        if (acc?.type === 'EGRESO') {
          expByCat.set(acc.name, (expByCat.get(acc.name) || 0) + (e.debit - e.credit));
        }
      });
      const rows = Array.from(expByCat.entries()).map(([name, val], i) => `
      <tr class="text-sm ${i % 2 === 1 ? 'bg-slate-50/30' : ''}">
        <td class="px-4 py-4"><p class="font-bold text-slate-800 uppercase text-xs tracking-wider">${name}</p></td>
        <td class="px-4 py-4 font-medium text-right">$ ${formatCurrency(val)}</td>
        <td class="px-4 py-4 font-bold text-right">$ ${formatCurrency(val)}</td>
        <td class="px-4 py-4 font-bold text-right text-green-600">-$ 0</td>
        <td class="px-4 py-4 text-center"><span class="bg-blue-100 text-blue-700 text-[10px] font-black px-2 py-0.5 rounded">100%</span></td>
      </tr>`).join('');
      const totalExec = Array.from(expByCat.values()).reduce((s, v) => s + v, 0);
      return `
<!DOCTYPE html><html class="light" lang="es"><head><meta charset="utf-8"/><meta content="width=device-width, initial-scale=1.0" name="viewport"/><title>Ejecución Presupuestaria</title><script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script><link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet"/></head><body class="bg-slate-100 font-display min-h-screen py-10"><div class="max-w-5xl mx-auto mb-6 px-4 no-print flex justify-between items-center"><button class="flex items-center gap-2 text-slate-600 font-semibold" onclick="window.close()">Cerrar</button><button class="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg shadow-lg font-bold" onclick="window.print()">Imprimir / PDF</button></div><div class="pdf-container max-w-5xl mx-auto bg-white shadow-2xl min-h-[29.7cm] p-12 border border-slate-200"><header class="flex justify-between items-start border-b-2 border-slate-100 pb-8 mb-8"><div class="flex items-center gap-4"><div class="size-14 bg-blue-600 rounded-xl flex items-center justify-center text-white"><span class="material-symbols-outlined text-4xl">church</span></div><div><h1 class="text-2xl font-black tracking-tight text-slate-900 uppercase leading-none mb-1">${orgName}</h1><p class="text-slate-500 text-sm font-medium">NIT: ${taxId}</p></div></div><div class="text-right"><div class="bg-blue-600/10 text-blue-600 px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase mb-2 inline-block">Informe de Gestión</div><h2 class="text-xl font-bold text-slate-900">Ejecución Presupuestaria</h2><p class="text-slate-400 text-xs mt-1 italic">Generado el ${nowDate} ${nowTime}</p></div></header><div class="mb-10"><h3 class="text-sm font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Resumen de Cumplimiento</h3><div class="grid grid-cols-4 gap-4"><div class="bg-slate-50 p-4 rounded-xl border"><p class="text-[10px] font-bold text-slate-500 uppercase mb-1">Total Presupuestado</p><p class="text-lg font-black text-slate-900">$ ${formatCurrency(totalExec)}</p></div><div class="bg-slate-50 p-4 rounded-xl border"><p class="text-[10px] font-bold text-slate-500 uppercase mb-1">Total Ejecutado</p><p class="text-lg font-black text-slate-900">$ ${formatCurrency(totalExec)}</p></div><div class="bg-slate-50 p-4 rounded-xl border"><p class="text-[10px] font-bold text-slate-500 uppercase mb-1">Desviación Neta</p><p class="text-lg font-black text-amber-600">-$ 0</p></div><div class="bg-blue-600/5 p-4 rounded-xl border border-blue-600/20"><p class="text-[10px] font-bold text-blue-600 uppercase mb-1">% Cumplimiento Global</p><div class="flex items-end gap-2"><p class="text-2xl font-black text-blue-600 leading-none">100%</p><span class="text-[10px] text-blue-600/70 font-bold mb-0.5">YTD</span></div></div></div></div><div class="mb-12"><h3 class="text-sm font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Detalle por Centros de Costo</h3><div class="border border-slate-200 rounded-xl overflow-hidden"><table class="w-full text-left border-collapse"><thead><tr class="bg-slate-50 border-b border-slate-200"><th class="px-4 py-3 text-[11px] font-black text-slate-500 uppercase">Partida / Categoría</th><th class="px-4 py-3 text-[11px] font-black text-slate-500 uppercase text-right">Presupuestado</th><th class="px-4 py-3 text-[11px] font-black text-slate-500 uppercase text-right">Ejecutado</th><th class="px-4 py-3 text-[11px] font-black text-slate-500 uppercase text-right">Desviación</th><th class="px-4 py-3 text-[11px] font-black text-slate-500 uppercase text-center">% Ejec.</th></tr></thead><tbody class="divide-y divide-slate-100">${rows}</tbody><tfoot class="bg-slate-50"><tr><td class="px-4 py-4 text-sm font-black text-slate-700 text-right uppercase tracking-wider">Totales de Ejecución</td><td class="px-4 py-4 text-sm font-black text-slate-900 text-right border-l border-slate-200">$ ${formatCurrency(totalExec)}</td><td class="px-4 py-4 text-sm font-black text-slate-900 text-right">$ ${formatCurrency(totalExec)}</td><td class="px-4 py-4 text-sm font-black text-blue-600 text-right">-$ 0</td><td class="px-4 py-4 text-lg font-black text-blue-600 text-center">100%</td></tr></tfoot></table></div></div></div></body></html>`;
    }
    return `<html><body>Reporte no implementado</body></html>`;
  };

  const previewReport = async (name: string, autoPrint = false) => {
    if (!org) return;
    setIsGenerating(name);
    await new Promise(resolve => setTimeout(resolve, 300));
    try {
      const html = buildHtml(name);

      const win = window.open('', '_blank');
      if (!win) throw new Error('No se pudo abrir la nueva pestaña');

      win.document.open();
      win.document.write(html);
      win.document.close();

      if (autoPrint) {
        setTimeout(() => {
          try {
            win.focus();
            win.print();
          } catch (e) {
            console.error('Print auto-start failed:', e);
          }
        }, 800);
      }
    } catch (error) {
      console.error('Error previewing report:', error);
      toast.error('Hubo un error al generar la vista previa.');
    } finally {
      setIsGenerating(null);
    }
  };

  return (
    <div className="space-y-4 pb-6">
      {isGenerating && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center">
          <div className="fixed inset-0 bg-background/80 backdrop-blur-md" />
          <div className="bg-card p-8 rounded-3xl shadow-2xl flex flex-col items-center gap-6 animate-in fade-in zoom-in duration-300 border border-border relative z-10">
            <div className="relative">
              <div className="size-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
              <Loader2 className="size-8 text-primary absolute inset-0 m-auto animate-pulse" />
            </div>
            <div className="text-center">
              <p className="font-black text-foreground text-lg">Generando Reporte</p>
              <p className="text-sm text-muted-foreground mt-1">{isGenerating}</p>
            </div>
          </div>
        </div>,
        document.getElementById('modal-root') || document.body
      )}

      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-foreground mb-1 tracking-tight">Centro de Reportes</h2>
          <p className="text-xs sm:text-sm text-muted-foreground">Análisis financiero y exportación de datos.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => generateReport('Consolidado Total')}
            className="w-full sm:w-auto bg-primary text-primary-foreground px-6 py-3 rounded-xl font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-primary/25 hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98] transition-all uppercase tracking-tighter"
          >
            <Download className="size-5" />
            Exportar Consolidado
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[
          { label: 'Ingresos Totales', value: stats.incomeYTD, icon: ArrowUp, color: 'emerald', detail: 'Actualizado' },
          { label: 'Egresos Totales', value: stats.expenseYTD, icon: ArrowDown, color: 'red', detail: 'Actualizado' },
          { label: 'Margen Neto', value: stats.netMargin, icon: Banknote, color: 'blue', detail: `${stats.efficiency}% eficiencia` },
          { label: 'Base de Datos', value: 'Local', icon: History, color: 'slate', detail: 'Sincronizada' },
        ].map((stat, i) => (
          <div key={i} className="bg-card p-4 rounded-xl border border-border shadow-sm relative overflow-hidden group">
            <div className={`absolute -right-4 -top-4 size-24 bg-${stat.color}-600/5 rounded-full group-hover:scale-150 transition-transform duration-500`} />
            <p className="text-[10px] sm:text-xs text-muted-foreground font-black uppercase tracking-widest mb-3 relative z-10">{stat.label}</p>
            <h3 className={`text-xl sm:text-2xl font-black ${stat.color === 'blue' ? 'text-primary' : 'text-foreground'} relative z-10 tracking-tight`}>
              {typeof stat.value === 'number' ? `$ ${formatCurrency(stat.value)}` : stat.value}
            </h3>
            <div className={`mt-3 flex items-center gap-1.5 font-bold text-[10px] sm:text-xs relative z-10 ${stat.color === 'emerald' ? 'text-emerald-600' :
              stat.color === 'red' ? 'text-red-500' :
                stat.color === 'blue' ? 'text-primary' : 'text-muted-foreground'
              }`}>
              <stat.icon className="size-3.5" />
              {stat.detail}
            </div>
          </div>
        ))}
      </div>

      {/* Report Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { id: 'balance', name: 'Balance General', icon: FileText, color: 'blue', desc: 'Estado detallado de activos, pasivos y patrimonio.' },
          { id: 'pnl', name: 'Estado de Resultados', icon: BarChart3, color: 'emerald', desc: 'Resumen de ingresos y gastos por período.' },
          { id: 'cashflow', name: 'Flujo de Caja', icon: Banknote, color: 'amber', desc: 'Seguimiento de entradas y salidas reales de efectivo.' },
          { id: 'tithes', name: 'Diezmos y Ofrendas', icon: Heart, color: 'rose', desc: 'Desglose detallado por miembro y categoría.' },
          { id: 'budget', name: 'Ejecución Presupuestaria', icon: ClipboardCheck, color: 'indigo', desc: 'Comparativa entre proyectado y ejecutado.' },
          { id: 'auxiliary', name: 'Libro Auxiliar', icon: Table, color: 'slate', desc: 'Movimientos cronológicos de una cuenta específica.' },
        ].map((report) => (
          <div key={report.id} className="bg-card p-4 rounded-xl border border-border shadow-sm hover:shadow-lg hover:shadow-primary/5 hover:border-primary/30 transition-all flex flex-col group">
            <div className="flex items-start justify-between mb-4">
              <div className={`size-12 bg-${report.color}-600/10 text-${report.color}-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
                <report.icon className="size-6" />
              </div>
              <div className="bg-muted px-3 py-1 rounded-full text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                PDF / Imprimir
              </div>
            </div>

            <h4 className="text-lg font-black mb-2 text-foreground tracking-tight">{report.name}</h4>
            <p className="text-xs text-muted-foreground mb-6 flex-1 leading-relaxed">{report.desc}</p>

            <div className="space-y-4">
              {report.id === 'auxiliary' && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-1">Seleccionar Cuenta</label>
                  <select
                    value={selectedAuxAccId}
                    onChange={(e) => setSelectedAuxAccId(e.target.value)}
                    className="w-full bg-muted border-0 rounded-xl text-sm font-bold text-foreground px-4 py-3 focus:ring-2 focus:ring-primary/20 transition-all appearance-none"
                  >
                    <option value="">Buscar cuenta contable...</option>
                    {(accounts || [])
                      .filter(a => a.accepts_movement)
                      .sort((a, b) => a.code.localeCompare(b.code))
                      .map(a => (
                        <option key={a.id} value={a.id}>
                          {a.code} - {a.name}
                        </option>
                      ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => previewReport(report.name, true)}
                  className="bg-primary text-primary-foreground py-3.5 rounded-xl font-black text-xs transition-all hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/20 active:scale-95 uppercase tracking-tighter"
                >
                  Generar
                </button>
                <button
                  onClick={() => previewReport(report.name, false)}
                  className="bg-muted text-foreground py-3.5 rounded-xl font-black text-xs transition-all hover:bg-accent active:scale-95 uppercase tracking-tighter"
                >
                  Vista Previa
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
