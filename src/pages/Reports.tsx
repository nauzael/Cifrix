import { useState, useEffect, useMemo } from 'react';
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
  Loader2,
  Calendar
} from 'lucide-react';
import { formatCurrency, formatDate } from '../lib/utils';
import { generateMasterReportHTML } from '../lib/accounting/report-templates';
import { useAuthStore } from '../store/authStore';

export function Reports() {
  const [org, setOrg] = useState<Organization | null>(null);
  const [orgId, setOrgId] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
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
    async () => {
      if (!orgId) return [];
      const txs = await db.transactions.where('organization_id').equals(orgId).toArray();
      const txIds = txs.map(t => t.id);
      const entries = await db.journal_entries.where('transaction_id').anyOf(txIds).toArray();
      const txMap = new Map(txs.map(t => [t.id, t.date]));
      return entries.map(e => ({ ...e, date: txMap.get(e.transaction_id) }));
    },
    [orgId]
  );

  const accounts = useLiveQuery(
    () => orgId ? db.accounts.where('organization_id').equals(orgId).toArray() : [],
    [orgId]
  );

  const transactions = useLiveQuery(
    () => orgId ? db.transactions.where('organization_id').equals(orgId).toArray() : [],
    [orgId]
  );

  // Derivar años disponibles
  const availableYears = useMemo(() => {
    if (!journalEntries || journalEntries.length === 0) return [new Date().getFullYear()];
    const years = journalEntries
      .map(e => e.date ? new Date(e.date).getFullYear() : 0)
      .filter(y => y > 0);
    const uniqueYears = Array.from(new Set(years)).sort((a, b) => b - a);
    return uniqueYears.length > 0 ? uniqueYears : [new Date().getFullYear()];
  }, [journalEntries]);

  const contributions = useLiveQuery(
    () => orgId ? db.contributions.where('organization_id').equals(orgId).toArray() : [],
    [orgId]
  );

  const members = useLiveQuery(
    () => orgId ? db.members.where('organization_id').equals(orgId).toArray() : [],
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
        if (!entry.date) return;
        const entryYear = new Date(entry.date).getFullYear();
        if (entryYear !== selectedYear) return;

        const account = detailAccounts.find(a => a.id === entry.account_id);
        if (account) {
          if (account.type === 'INGRESO') income += (entry.credit - entry.debit);
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
    const calcBalance = (accId: string, nature: 'DEBITO' | 'CREDITO') => {
      const acc = (accounts || []).find(a => a.id === accId);
      if (!acc) return 0;
      const entries = (journalEntries || []).filter(e => {
        if (!e.date || e.account_id !== accId) return false;
        const entryYear = new Date(e.date).getFullYear();
        if (['INGRESO', 'EGRESO'].includes(acc.type)) {
          return entryYear === selectedYear;
        } else {
          return entryYear <= selectedYear;
        }
      });
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
      const reportContent = `
        <div class="mb-12">
          <h3 class="text-sm font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Detalle de Cuentas</h3>
          <div class="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <table class="report-table w-full text-left border-collapse">
              <thead>
                <tr class="bg-slate-50 border-b-2 border-slate-200">
                  <th class="px-4 py-3 text-[11px] font-black text-slate-500 uppercase">Código</th>
                  <th class="px-4 py-3 text-[11px] font-black text-slate-500 uppercase">Nombre de la Cuenta</th>
                  <th class="px-4 py-3 text-[11px] font-black text-slate-500 uppercase">Tipo</th>
                  <th class="px-4 py-3 text-[11px] font-black text-slate-500 uppercase text-right">Saldo</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                <tr class="bg-slate-50/80"><td class="px-4 py-2 text-[10px] font-black text-blue-600 uppercase tracking-wider" colspan="4">1. Activos</td></tr>
                ${assetsRows}
                <tr class="bg-slate-50/80"><td class="px-4 py-2 text-[10px] font-black text-red-600 uppercase tracking-wider" colspan="4">2. Pasivos</td></tr>
                ${liabilitiesRows}
                <tr class="bg-slate-50/80"><td class="px-4 py-2 text-[10px] font-black text-amber-600 uppercase tracking-wider" colspan="4">3. Patrimonio</td></tr>
                ${equityRows}
                <tr class="text-sm">
                  <td class="px-4 py-3 text-slate-400 italic">Resultado del Ejercicio</td>
                  <td class="px-4 py-3 font-semibold text-slate-800">Utilidad/Pérdida</td>
                  <td class="px-4 py-3"><span class="flex items-center gap-1.5"><span class="size-1.5 rounded-full ${netResult >= 0 ? 'bg-emerald-500' : 'bg-red-500'}"></span>Patrimonio</span></td>
                  <td class="px-4 py-3 font-bold text-right ${netResult >= 0 ? 'text-emerald-600' : 'text-red-600'}">$ ${formatCurrency(netResult)}</td>
                </tr>
              </tbody>
              <tfoot class="bg-slate-900 text-white">
                <tr>
                  <td class="px-4 py-4 text-sm font-black text-slate-100 text-right uppercase tracking-wider" colspan="3">Ecuación Contable (A = P + PT)</td>
                  <td class="px-4 py-4 text-lg font-black text-blue-400 text-right">$ ${formatCurrency(totalAssets)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      `;

      return generateMasterReportHTML({
        organization: org,
        title,
        period: `A 31 de diciembre de ${selectedYear}`,
        subTitle: 'Estado de Situación Financiera',
        summaryCards: [
          { label: 'Total Activos', value: totalAssets },
          { label: 'Total Pasivos', value: totalLiabilities },
          { label: 'Patrimonio Neto', value: patrimonioNeto, type: 'primary' }
        ]
      }, reportContent);
    }
    if (title === 'Estado de Resultados') {
      const incAccs = (accounts || []).filter(a => a.type === 'INGRESO').map(a => ({ ...a, balance: calcBalance(a.id, a.nature) })).filter(a => Math.abs(a.balance) > 0);
      const expAccs = (accounts || []).filter(a => a.type === 'EGRESO').map(a => ({ ...a, balance: calcBalance(a.id, a.nature) })).filter(a => Math.abs(a.balance) > 0);
      const totalInc = incAccs.reduce((s, a) => s + a.balance, 0);
      const totalExp = expAccs.reduce((s, a) => s + a.balance, 0);
      const net = totalInc - totalExp;
      const incRows = incAccs.map(a => `<tr class="text-sm"><td class="px-4 py-2 pl-8 text-slate-600">${a.code}. ${a.name}</td><td class="px-4 py-2 text-right text-slate-500">$ ${formatCurrency(a.balance)}</td><td class="px-4 py-2 text-right"></td></tr>`).join('');
      const expRows = expAccs.map(a => `<tr class="text-sm"><td class="px-4 py-2 pl-8 text-slate-600">${a.code}. ${a.name}</td><td class="px-4 py-2 text-right text-slate-500">$ ${formatCurrency(a.balance)}</td><td class="px-4 py-2 text-right"></td></tr>`).join('');
            const reportContent = `
        <div class="mb-12">
          <h3 class="text-sm font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Detalle de Operaciones</h3>
          <div class="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <table class="report-table w-full text-left border-collapse">
              <thead>
                <tr class="bg-slate-50 border-b-2 border-slate-200">
                  <th class="px-4 py-3 text-[11px] font-black text-slate-500 uppercase w-1/2">Descripción de la Cuenta</th>
                  <th class="px-4 py-3 text-[11px] font-black text-slate-500 uppercase text-right">Parcial</th>
                  <th class="px-4 py-3 text-[11px] font-black text-slate-500 uppercase text-right">Total</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                <tr class="bg-slate-50/80"><td class="px-4 py-2 text-[10px] font-black text-blue-600 uppercase tracking-wider" colspan="3">INGRESOS</td></tr>
                ${incRows}
                <tr class="text-sm font-bold bg-slate-50/30">
                  <td class="px-4 py-3 text-slate-900 uppercase text-[10px] tracking-wider">TOTAL INGRESOS OPERACIONALES</td>
                  <td class="px-4 py-3 text-right"></td>
                  <td class="px-4 py-3 text-right text-emerald-600 font-black">$ ${formatCurrency(totalInc)}</td>
                </tr>
                <tr class="bg-slate-50/80"><td class="px-4 py-2 text-[10px] font-black text-red-600 uppercase tracking-wider" colspan="3">GASTOS</td></tr>
                ${expRows}
                <tr class="text-sm font-bold bg-slate-50/30">
                  <td class="px-4 py-3 text-slate-900 uppercase text-[10px] tracking-wider">TOTAL GASTOS OPERACIONALES</td>
                  <td class="px-4 py-3 text-right"></td>
                  <td class="px-4 py-3 text-right text-red-600 font-black">$ ${formatCurrency(totalExp)}</td>
                </tr>
              </tbody>
              <tfoot class="bg-blue-900 text-white">
                <tr>
                  <td class="px-4 py-4 text-sm font-black text-slate-100 uppercase tracking-wider" colspan="2">Resultado del Ejercicio (Excedente/Déficit)</td>
                  <td class="px-4 py-4 text-lg font-black text-blue-400 text-right">$ ${formatCurrency(net)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
          <p class="mt-4 text-[10px] text-slate-400 italic px-2">* Reporte consolidado basado en los registros del libro mayor auxiliar.</p>
        </div>
      `;

      return generateMasterReportHTML({
        organization: org,
        title,
        period: `Del 1 de enero al 31 de diciembre de ${selectedYear}`,
        subTitle: 'Resumen de Resultados',
        summaryCards: [
          { label: 'Total Ingresos', value: totalInc },
          { label: 'Total Gastos', value: totalExp },
          { label: 'Resultado Neto', value: net, type: 'primary' }
        ]
      }, reportContent);
    }
    if (title === 'Flujo de Caja') {
      const cashAccs = (accounts || []).filter(a => a.accepts_movement && (a.name.toLowerCase().includes('caja') || a.name.toLowerCase().includes('banco') || a.code.startsWith('11')));
      const cashEntries = (journalEntries || []).filter(e => {
        if (!e.date) return false;
        const entryYear = new Date(e.date).getFullYear();
        return entryYear === selectedYear && cashAccs.some(a => a.id === e.account_id);
      });
      const monthly = new Map<string, { in: number; out: number }>();
      cashEntries.forEach(e => {
        if (!e.date) return;
        const monthKey = e.date.substring(0, 7);
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
            const reportContent = `
        <div class="mb-12">
          <h3 class="text-sm font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Análisis de Movimientos</h3>
          <div class="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <table class="report-table w-full text-left border-collapse">
              <thead>
                <tr class="bg-slate-50 border-b-2 border-slate-200">
                  <th class="px-4 py-3 text-[11px] font-black text-slate-500 uppercase">Periodo</th>
                  <th class="px-4 py-3 text-[11px] font-black text-slate-500 uppercase text-right">Ingresos</th>
                  <th class="px-4 py-3 text-[11px] font-black text-slate-500 uppercase text-right">Egresos</th>
                  <th class="px-4 py-3 text-[11px] font-black text-slate-500 uppercase text-right">Saldo Neto</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                ${rows}
              </tbody>
              <tfoot class="bg-slate-900 text-white">
                <tr>
                  <td class="px-4 py-4 text-sm font-black uppercase tracking-wider">Totales Consolidados</td>
                  <td class="px-4 py-4 text-right font-bold text-emerald-400">$ ${formatCurrency(totalIn)}</td>
                  <td class="px-4 py-4 text-right font-bold text-red-400">$ ${formatCurrency(totalOut)}</td>
                  <td class="px-4 py-4 text-lg font-black text-right text-blue-400">$ ${formatCurrency(net)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      `;

      return generateMasterReportHTML({
        organization: org,
        title,
        period: `Del 1 de enero al 31 de diciembre de ${selectedYear}`,
        subTitle: 'Resumen de Liquidez y Efectivo',
        summaryCards: [
          { label: 'Entradas', value: totalIn },
          { label: 'Salidas', value: totalOut },
          { label: 'Saldo Neto', value: net, type: 'primary' }
        ]
      }, reportContent);
    }
    if (title === 'Diezmos y Ofrendas') {
      const filteredContribs = (contributions || []).filter(c => {
        if (!c.date) return false;
        return new Date(c.date).getFullYear() === selectedYear;
      });
      const diezmos = filteredContribs.filter(c => c.category === 'DIEZMO').reduce((s, c) => s + c.amount, 0);
      const ofrendas = filteredContribs.filter(c => c.category === 'OFRENDA').reduce((s, c) => s + c.amount, 0);
      const especiales = filteredContribs.filter(c => c.category === 'ESPECIAL').reduce((s, c) => s + c.amount, 0);
      const total = diezmos + ofrendas + especiales;
      const rows = filteredContribs.map(c => {
        const m = members?.find(x => x.id === c.member_id);
        return `<tr class="text-sm"><td class="px-4 py-2">${formatDate(c.date)}</td><td class="px-4 py-2">${m?.full_name || 'Anónimo'}</td><td class="px-4 py-2">${c.category === 'DIEZMO' ? 'Diezmo' : c.category === 'OFRENDA' ? 'Ofrenda' : 'Especial'}</td><td class="px-4 py-2">${c.method}</td><td class="px-4 py-2 text-right font-bold">$ ${formatCurrency(c.amount)}</td></tr>`;
      }).join('');
      const reportContent = `
        <div class="mb-12">
          <h3 class="text-sm font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Detalle de Contribuciones</h3>
          <div class="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <table class="report-table w-full text-left border-collapse">
              <thead>
                <tr class="bg-slate-50 border-b-2 border-slate-200">
                  <th class="px-4 py-3 text-[11px] font-black text-slate-500 uppercase">Fecha</th>
                  <th class="px-4 py-3 text-[11px] font-black text-slate-500 uppercase">Miembro / Contribuyente</th>
                  <th class="px-4 py-3 text-[11px] font-black text-slate-500 uppercase">Categoría</th>
                  <th class="px-4 py-3 text-[11px] font-black text-slate-500 uppercase">Método</th>
                  <th class="px-4 py-3 text-[11px] font-black text-slate-500 uppercase text-right">Monto</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                ${rows}
              </tbody>
              <tfoot class="bg-blue-900 text-white">
                <tr>
                  <td class="px-4 py-4 text-sm font-black uppercase tracking-wider" colspan="4">Total Recaudado en el Periodo</td>
                  <td class="px-4 py-4 text-lg font-black text-blue-400 text-right">$ ${formatCurrency(total)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
          <p class="mt-4 text-[10px] text-slate-400 italic px-2">* Este listado corresponde al periodo seleccionado y consolidado por membresía.</p>
        </div>
      `;

      return generateMasterReportHTML({
        organization: org,
        title,
        period: `Del 1 de enero al 31 de diciembre de ${selectedYear}`,
        subTitle: 'Reporte Detallado de Recaudación',
        summaryCards: [
          { label: 'Diezmos', value: diezmos },
          { label: 'Ofrendas', value: ofrendas },
          { label: 'Gran Total', value: total, type: 'primary' }
        ]
      }, reportContent);
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
            const reportContent = `
        <div class="px-8 py-12 text-center">
          <div class="mb-12">
            <h3 class="text-3xl font-serif font-black text-slate-900 uppercase tracking-tight mb-2">Certificado de Donación</h3>
            <p class="text-slate-500 italic">Expedido para fines tributarios y legales</p>
          </div>
          
          <div class="space-y-8 text-lg text-slate-700 leading-relaxed text-justify max-w-3xl mx-auto mb-16">
            <p>La <span class="font-bold text-slate-900">${orgName}</span>, debidamente constituida y reconocida legalmente, por medio del presente:</p>
            
            <h4 class="text-xl font-black text-blue-600 tracking-[0.2em] uppercase text-center">CERTIFICA QUE:</h4>
            
            <div class="text-center py-6 bg-slate-50 rounded-2xl border border-slate-100 shadow-sm">
              <p class="text-2xl font-black text-slate-900 mb-1">${member?.full_name || 'CONTRIBUYENTE'}</p>
              <p class="text-slate-500 font-bold tracking-widest uppercase">Identificación: ${member?.document_id || 'N/A'}</p>
            </div>
            
            <p>Ha realizado aportes y donaciones voluntarias durante el año gravable <span class="font-bold text-slate-900">${selectedYear}</span>, 
               por un valor total de <span class="font-black text-blue-600 text-xl decoration-blue-200 decoration-4 underline-offset-4 underline">$ ${formatCurrency(total)}</span>.</p>
          </div>

          <div class="max-w-2xl mx-auto border border-slate-200 rounded-xl overflow-hidden shadow-sm text-left">
            <div class="bg-slate-50 px-6 py-3 border-b border-slate-200">
              <h5 class="text-[10px] font-black text-slate-500 uppercase tracking-widest">Desglose de Aportaciones</h5>
            </div>
            <table class="w-full text-sm">
              <tbody class="divide-y divide-slate-100">
                <tr><td class="px-6 py-3 text-slate-600">Diezmos Anuales</td><td class="px-6 py-3 text-right font-bold text-slate-900">$ ${formatCurrency(diezmos)}</td></tr>
                <tr><td class="px-6 py-3 text-slate-600">Ofrendas Especiales</td><td class="px-6 py-3 text-right font-bold text-slate-900">$ ${formatCurrency(ofrendas)}</td></tr>
                <tr><td class="px-6 py-3 text-slate-600">Donaciones Extraordinarias</td><td class="px-6 py-3 text-right font-bold text-slate-900">$ ${formatCurrency(especiales)}</td></tr>
                <tr class="bg-blue-900 text-white font-black">
                  <td class="px-6 py-4 uppercase tracking-wider">Total Certificado</td>
                  <td class="px-6 py-4 text-right text-lg text-blue-400">$ ${formatCurrency(total)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      `;
      return generateMasterReportHTML({
        organization: org,
        title: 'Certificado de Donación',
        period: `Año Gravable ${selectedYear}`,
        subTitle: 'Reconocimiento de Aportes',
      }, reportContent);
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
            const reportContent = `
        <div class="mb-10 text-center">
          <div class="inline-block bg-blue-600/10 text-blue-600 px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest uppercase mb-4">Movimientos de Caja</div>
          <h3 class="text-3xl font-black text-slate-900 tracking-tighter uppercase mb-6">${cajaAcc ? cajaAcc.name : 'Caja General'}</h3>
        </div>

        <div class="grid grid-cols-2 gap-4 mb-8">
          <div class="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex justify-between items-center decoration-slate-200">
            <div>
              <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Saldo Final</p>
              <p class="text-2xl font-black text-blue-600">$ ${formatCurrency(saldoActual)}</p>
            </div>
            <div class="size-12 rounded-full bg-blue-600/10 flex items-center justify-center">
              <span class="material-symbols-outlined text-blue-600">account_balance_wallet</span>
            </div>
          </div>
          <div class="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex items-center gap-6">
            <div class="flex-1 border-r border-slate-200 px-2">
              <p class="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-1">Entradas</p>
              <p class="text-lg font-black text-emerald-600 leading-none">$ ${formatCurrency(totalDebit)}</p>
            </div>
            <div class="flex-1 px-2">
              <p class="text-[9px] font-black text-red-500 uppercase tracking-widest mb-1">Salidas</p>
              <p class="text-lg font-black text-red-500 leading-none">$ ${formatCurrency(totalCredit)}</p>
            </div>
          </div>
        </div>

        <div class="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <table class="report-table w-full text-left border-collapse">
            <thead class="bg-slate-50 border-b-2 border-slate-200">
              <tr>
                <th class="px-4 py-3 text-[10px] font-black text-slate-500 uppercase">Fecha</th>
                <th class="px-4 py-3 text-[10px] font-black text-slate-500 uppercase">Ref.</th>
                <th class="px-4 py-3 text-[10px] font-black text-slate-500 uppercase">Descripción</th>
                <th class="px-4 py-3 text-[10px] font-black text-slate-500 uppercase text-right">Ingreso</th>
                <th class="px-4 py-3 text-[10px] font-black text-slate-500 uppercase text-right">Egreso</th>
                <th class="px-4 py-3 text-[10px] font-black text-slate-500 uppercase text-right">Saldo</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              ${rows}
            </tbody>
            <tfoot class="bg-slate-900 text-white">
              <tr class="font-bold">
                <td colspan="3" class="px-4 py-4 text-xs font-black uppercase tracking-widest">Totales de Movimiento</td>
                <td class="px-4 py-4 text-right text-emerald-400">$ ${formatCurrency(totalDebit)}</td>
                <td class="px-4 py-4 text-right text-red-400">$ ${formatCurrency(totalCredit)}</td>
                <td class="px-4 py-4 text-right text-lg text-blue-400">$ ${formatCurrency(saldoActual)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        <p class="mt-6 text-[10px] text-slate-400 italic px-4">Este reporte presenta de forma cronológica los ingresos y egresos registrados en el libro de caja.</p>
      `;

      return generateMasterReportHTML({
        organization: org,
        title: 'Reporte de Caja General',
        period: `Del 1 de enero al 31 de diciembre de ${selectedYear}`,
        subTitle: 'Estado de Efectivo Consolidado',
      }, reportContent);
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
      const reportContent = `
        <div class="mb-10 text-center">
          <div class="inline-block bg-slate-900 text-white px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest uppercase mb-4">Libro Auxiliar por Cuenta</div>
          <h3 class="text-3xl font-black text-slate-900 tracking-tighter uppercase mb-2">${targetAcc ? targetAcc.name : 'Libro Auxiliar'}</h3>
          <p class="text-slate-500 font-bold uppercase tracking-widest text-xs">Código: ${targetAcc?.code || '---'}</p>
        </div>

        <div class="grid grid-cols-2 gap-4 mb-8">
          <div class="bg-blue-600 p-6 rounded-2xl shadow-xl shadow-blue-600/20 flex justify-between items-center text-white relative overflow-hidden">
             <div class="relative z-10">
              <p class="text-[10px] font-black text-blue-200 uppercase tracking-widest mb-1">Saldo Final</p>
              <p class="text-3xl font-black">$ ${formatCurrency(saldoActual)}</p>
            </div>
            <span class="material-symbols-outlined text- white/20 text-6xl absolute -right-4 -bottom-4">account_balance_wallet</span>
          </div>
          <div class="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex items-center gap-6">
            <div class="flex-1 border-r border-slate-200 px-2">
              <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Débitos</p>
              <p class="text-lg font-black text-slate-900 leading-none">$ ${formatCurrency(totalDebit)}</p>
            </div>
            <div class="flex-1 px-2">
              <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Créditos</p>
              <p class="text-lg font-black text-slate-900 leading-none">$ ${formatCurrency(totalCredit)}</p>
            </div>
          </div>
        </div>

        <div class="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <table class="report-table w-full text-left border-collapse">
            <thead class="bg-slate-50 border-b-2 border-slate-200">
              <tr>
                <th class="px-4 py-3 text-[10px] font-black text-slate-500 uppercase">Fecha</th>
                <th class="px-4 py-3 text-[10px] font-black text-slate-500 uppercase">Ref.</th>
                <th class="px-4 py-3 text-[10px] font-black text-slate-500 uppercase">Descripción</th>
                <th class="px-4 py-3 text-[10px] font-black text-slate-500 uppercase text-right">Débito</th>
                <th class="px-4 py-3 text-[10px] font-black text-slate-500 uppercase text-right">Crédito</th>
                <th class="px-4 py-3 text-[10px] font-black text-slate-500 uppercase text-right">Saldo</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              ${rows}
            </tbody>
            <tfoot class="bg-slate-900 text-white">
              <tr class="font-bold">
                <td colspan="3" class="px-4 py-4 text-xs font-black uppercase tracking-widest">Totales Consolidados</td>
                <td class="px-4 py-4 text-right text-emerald-400">$ ${formatCurrency(totalDebit)}</td>
                <td class="px-4 py-4 text-right text-red-400">$ ${formatCurrency(totalCredit)}</td>
                <td class="px-4 py-4 text-right text-lg text-blue-400">$ ${formatCurrency(saldoActual)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        <p class="mt-6 text-[10px] text-slate-400 italic px-4">Este documento refleja la totalidad de cierres y movimientos de la cuenta contable seleccionada durante el ejercicio.</p>
      `;

      return generateMasterReportHTML({
        organization: org,
        title: 'Libro Auxiliar por Cuenta',
        period: `Del 1 de enero al 31 de diciembre de ${selectedYear}`,
        subTitle: `Detalle de Movimientos - ${targetAcc?.name || 'Varios'}`,
      }, reportContent);
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
            const reportContent = `
        <div class="mb-12">
          <div class="grid grid-cols-3 gap-4 mb-10">
            <div class="bg-slate-50 p-6 rounded-2xl border border-slate-100">
               <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Presupuestado</p>
               <p class="text-2xl font-black text-slate-900">$ ${formatCurrency(totalExec)}</p>
            </div>
            <div class="bg-blue-600/5 p-6 rounded-2xl border border-blue-600/20">
               <p class="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">Ejecutado Real</p>
               <p class="text-2xl font-black text-blue-700">$ ${formatCurrency(totalExec)}</p>
            </div>
            <div class="bg-slate-50 p-6 rounded-2xl border border-slate-100">
               <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">% Ejecución</p>
               <p class="text-2xl font-black text-slate-900">100%</p>
            </div>
          </div>

          <h3 class="text-sm font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Detalle por Centro de Gastos</h3>
          <div class="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <table class="report-table w-full text-left border-collapse">
              <thead class="bg-slate-50 border-b-2 border-slate-200">
                <tr>
                  <th class="px-4 py-3 text-[10px] font-black text-slate-500 uppercase">Partida / Categoría</th>
                  <th class="px-4 py-3 text-[10px] font-black text-slate-500 uppercase text-right">Presupuestado</th>
                  <th class="px-4 py-3 text-[10px] font-black text-slate-500 uppercase text-right">Ejecutado</th>
                  <th class="px-4 py-3 text-[10px] font-black text-slate-500 uppercase text-right">Variación</th>
                  <th class="px-4 py-3 text-[10px] font-black text-slate-500 uppercase text-center">% Ejec.</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                ${rows}
              </tbody>
              <tfoot class="bg-slate-900 text-white">
                <tr class="font-bold">
                  <td class="px-4 py-4 text-xs font-black uppercase tracking-widest">Totales de Ejecución</td>
                  <td class="px-4 py-4 text-right">$ ${formatCurrency(totalExec)}</td>
                  <td class="px-4 py-4 text-right">$ ${formatCurrency(totalExec)}</td>
                  <td class="px-4 py-4 text-right text-blue-400">$ 0</td>
                  <td class="px-4 py-4 text-center text-lg text-blue-400">100%</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      `;

      return generateMasterReportHTML({
        organization: org,
        title: 'Ejecución Presupuestaria',
        period: `Del 1 de enero al 31 de diciembre de ${selectedYear}`,
        subTitle: 'Análisis de Partidas y Gastos',
      }, reportContent);
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
          { id: 'cash_general', name: 'Caja General', icon: Banknote, color: 'emerald', desc: 'Movimientos detallados del libro de caja diario.' },
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
