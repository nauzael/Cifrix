import { formatCurrency } from '../utils';

export interface ReportMasterConfig {
  organization: any;
  title: string;
  period: string;
  subTitle?: string;
  summaryCards?: Array<{
    label: string;
    value: number;
    type?: 'primary' | 'neutral';
  }>;
  signatures?: boolean;
}

export const generateMasterReportHTML = (config: ReportMasterConfig, contentHTML: string): string => {
  const { organization: org, title, period, subTitle, summaryCards, signatures = true } = config;
  
  const orgName = org?.name || 'Organización';
  const taxId = org?.tax_id || '';
  const phone = org?.settings?.phone || '';
  const email = org?.settings?.email || '';
  const address = org?.settings?.address || '';
  const logoUrl = org?.settings?.logo_url || '';
  const repLegalName = org?.settings?.rep_legal_name || '';
  const repLegalDoc = org?.settings?.rep_legal_document || '';
  const contadorName = org?.settings?.contador_name || '';
  const contadorTp = org?.settings?.contador_tp || '';
  const repLegalSig = org?.settings?.rep_legal_signature || '';
  const contadorSig = org?.settings?.contador_signature || '';

  const summaryHTML = summaryCards ? `
    <div class="mb-10">
      ${subTitle ? `<h3 class="text-sm font-black text-slate-400 uppercase tracking-[0.2em] mb-4">${subTitle}</h3>` : ''}
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        ${summaryCards.map(card => `
          <div class="${card.type === 'primary' ? 'bg-blue-600/5 border-blue-600/20' : 'bg-slate-50 border-slate-100'} p-4 rounded-xl border">
            <p class="text-[10px] font-bold ${card.type === 'primary' ? 'text-blue-600' : 'text-slate-500'} uppercase mb-1">${card.label}</p>
            <p class="text-lg font-black ${card.type === 'primary' ? 'text-blue-600' : 'text-slate-900'}">$ ${formatCurrency(card.value)}</p>
          </div>
        `).join('')}
      </div>
    </div>
  ` : '';

  const signaturesHTML = signatures ? `
    <div class="grid grid-cols-2 gap-20 pt-10">
      <div class="text-center relative">
        ${repLegalSig ? `<img src="${repLegalSig}" class="h-24 absolute -top-20 left-1/2 -translate-x-1/2 object-contain mix-blend-multiply" />` : ''}
        <div class="border-t border-slate-400 pt-4 px-4 w-[220px] mx-auto flex flex-col items-center">
          <p class="text-[11px] font-black text-slate-900 uppercase tracking-wider">REPRESENTANTE LEGAL</p>
          <div class="w-full flex justify-center">
            <p class="text-xs text-slate-800 mt-1 font-bold whitespace-nowrap">${repLegalName}</p>
          </div>
          <p class="text-[10px] text-slate-500">${repLegalDoc ? `C.C. ${repLegalDoc}` : 'C.C.'}</p>
        </div>
      </div>
      <div class="text-center relative">
        ${contadorSig ? `<img src="${contadorSig}" class="h-24 absolute -top-20 left-1/2 -translate-x-1/2 object-contain mix-blend-multiply" />` : ''}
        <div class="border-t border-slate-400 pt-4 px-4 w-[220px] mx-auto flex flex-col items-center">
          <p class="text-[11px] font-black text-slate-900 uppercase tracking-wider">CONTADOR PÚBLICO</p>
          <div class="w-full flex justify-center">
            <p class="text-xs text-slate-800 mt-1 font-bold whitespace-nowrap">${contadorName}</p>
          </div>
          <p class="text-[10px] text-slate-500">${contadorTp || ''}</p>
        </div>
      </div>
    </div>
  ` : '';

  const printStyles = `
    <style>
      @media print {
        @page { size: portrait; margin: 1cm; }
        body { background: white !important; font-size: 9pt !important; }
        .no-print { display: none !important; }
        .pdf-container { box-shadow: none !important; border: none !important; padding: 0 !important; max-width: 100% !important; margin: 0 !important; }
        .grid { display: grid !important; }
        .grid-cols-3 { grid-template-columns: repeat(3, 1fr) !important; }
        .grid-cols-2 { grid-template-columns: repeat(2, 1fr) !important; }
      }
      .font-display { font-family: 'Inter', system-ui, sans-serif; }
      .report-table th { background-color: #f8fafc; border-bottom: 2px solid #e2e8f0; font-weight: 800; font-size: 10px; color: #64748b; padding: 12px 16px; text-transform: uppercase; }
      .report-table td { padding: 10px 16px; border-bottom: 1px solid #f1f5f9; font-size: 13px; color: #334155; }
    </style>
  `;

  return `
<!DOCTYPE html>
<html class="light" lang="es">
<head>
    <meta charset="utf-8"/>
    <meta content="width=device-width, initial-scale=1.0" name="viewport"/>
    <title>${title} - ${orgName}</title>
    <script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet"/>
    <style type="text/tailwindcss">
      @theme {
        --font-display: 'Inter', sans-serif;
      }
      body { font-family: 'Inter', sans-serif; }
    </style>
    ${printStyles}
</head>
<body class="bg-slate-100 font-display min-h-screen py-10 selection:bg-blue-100">
    <div class="max-w-4xl mx-auto mb-6 px-4 no-print flex justify-between items-center">
        <button class="flex items-center gap-2 text-slate-600 font-semibold hover:text-slate-900 transition-colors" onclick="window.close()">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            Volver
        </button>
        <div class="flex gap-3">
            <button class="flex items-center gap-2 bg-white text-slate-700 px-4 py-2 rounded-lg border border-slate-200 shadow-sm font-bold hover:bg-slate-50 transition-all" onclick="window.print()">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect width="12" height="8" x="6" y="14"/></svg>
                Imprimir
            </button>
        </div>
    </div>

    <div class="pdf-container max-w-4xl mx-auto bg-white shadow-2xl min-h-[29.7cm] p-12 border border-slate-200 relative overflow-hidden">
        <header class="flex justify-between items-start border-b-2 border-slate-100 pb-8 mb-8 relative">
            <div class="flex items-center gap-8">
                ${logoUrl ? `
                    <img src="${logoUrl}" class="h-28 max-w-[140px] object-contain" />
                ` : `
                    <div class="size-20 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
                        <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z"/><path d="m3 9 2.45-4.9A2 2 0 0 1 7.24 3h9.52a2 2 0 0 1 1.8 1.1L21 9"/><path d="M12 3v6"/></svg>
                    </div>
                `}
                <div>
                    <h1 class="text-2xl font-black tracking-tight text-slate-900 uppercase leading-none mb-1">${orgName}</h1>
                    <p class="text-slate-500 text-sm font-bold tracking-widest mb-3">NIT: ${taxId}</p>
                    <div class="text-slate-400 text-[10px] font-medium leading-relaxed max-w-md">
                        ${address ? `<span>${address}</span>` : ''}
                        ${phone ? `<span class="mx-2">•</span><span>${phone}</span>` : ''}
                        ${email ? `<span class="mx-2">•</span><span>${email}</span>` : ''}
                    </div>
                </div>
            </div>
            <div class="text-right">
                <span class="bg-blue-600/10 text-blue-600 px-4 py-1.5 rounded-full text-[10px] font-black tracking-[0.2em] uppercase mb-4 inline-block">Reporte Oficial</span>
                <h2 class="text-3xl font-black text-slate-900 uppercase leading-tight">${title}</h2>
                <p class="text-slate-600 text-base font-bold mt-1">${period}</p>
                <p class="text-slate-300 text-[10px] mt-4 uppercase font-bold tracking-widest italic">Cifrix Contable Ecosystem</p>
            </div>
        </header>

        <main>
            ${summaryHTML}
            
            <div class="relative min-h-[400px]">
                ${contentHTML}
            </div>
        </main>

        <footer class="mt-20">
            ${signaturesHTML}
            <div class="mt-20 pt-8 border-t border-slate-100 flex justify-between items-center text-[10px] text-slate-400 uppercase font-bold tracking-widest">
                <div>Página 1 de 1</div>
                <div class="flex items-center gap-2">
                    <span class="size-2 bg-blue-600 rounded-full animate-pulse"></span>
                    Cifrix Contable - Generado automáticamente
                </div>
            </div>
        </footer>
    </div>
</body>
</html>
  `;
};
