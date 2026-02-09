import { db, Organization, Member, Category, Project, Transaction, Contribution, JournalEntry, Customer, Invoice, InvoiceItem, Payment } from '../lib/db';
import { v4 as uuidv4 } from 'uuid';
import { seedDefaultAccounts } from '../lib/accountSeeder';

async function ensureDemoPUCSubaccounts(orgId: string) {
  const needed = [
    { code: '11', name: 'DISPONIBLE', type: 'ACTIVO', nature: 'DEBITO', accepts_movement: false, parent_code: '1' },
    { code: '1105', name: 'CAJA', type: 'ACTIVO', nature: 'DEBITO', accepts_movement: false, parent_code: '11' },
    { code: '110505', name: 'CAJA GENERAL', type: 'ACTIVO', nature: 'DEBITO', accepts_movement: true, parent_code: '1105' },
    { code: '1110', name: 'BANCOS', type: 'ACTIVO', nature: 'DEBITO', accepts_movement: false, parent_code: '11' },
    { code: '111005', name: 'CUENTA CORRIENTE', type: 'ACTIVO', nature: 'DEBITO', accepts_movement: true, parent_code: '1110' },
    { code: '12', name: 'CARTERA', type: 'ACTIVO', nature: 'DEBITO', accepts_movement: false, parent_code: '1' },
    { code: '1205', name: 'CLIENTES', type: 'ACTIVO', nature: 'DEBITO', accepts_movement: true, parent_code: '12' },
    { code: '21', name: 'OBLIGACIONES FINANCIERAS', type: 'PASIVO', nature: 'CREDITO', accepts_movement: false, parent_code: '2' },
    { code: '2105', name: 'CRÉDITOS BANCARIOS', type: 'PASIVO', nature: 'CREDITO', accepts_movement: true, parent_code: '21' },
    { code: '23', name: 'CUENTAS POR PAGAR', type: 'PASIVO', nature: 'CREDITO', accepts_movement: false, parent_code: '2' },
    { code: '2335', name: 'COSTOS Y GASTOS POR PAGAR', type: 'PASIVO', nature: 'CREDITO', accepts_movement: true, parent_code: '23' },
    { code: '24', name: 'IMPUESTOS POR PAGAR', type: 'PASIVO', nature: 'CREDITO', accepts_movement: false, parent_code: '2' },
    { code: '2408', name: 'IVA GENERADO', type: 'PASIVO', nature: 'CREDITO', accepts_movement: true, parent_code: '24' },
    { code: '31', name: 'CAPITAL', type: 'PATRIMONIO', nature: 'CREDITO', accepts_movement: false, parent_code: '3' },
    { code: '3105', name: 'CAPITAL SUSCRITO Y PAGADO', type: 'PATRIMONIO', nature: 'CREDITO', accepts_movement: true, parent_code: '31' },
    { code: '41', name: 'INGRESOS OPERACIONALES', type: 'INGRESO', nature: 'CREDITO', accepts_movement: false, parent_code: '4' },
    { code: '4105', name: 'VENTAS / INGRESOS PRINCIPALES', type: 'INGRESO', nature: 'CREDITO', accepts_movement: true, parent_code: '41' },
    { code: '4110', name: 'OFRENDAS', type: 'INGRESO', nature: 'CREDITO', accepts_movement: true, parent_code: '41' },
    { code: '4115', name: 'OFRENDAS ESPECIALES', type: 'INGRESO', nature: 'CREDITO', accepts_movement: true, parent_code: '41' },
    { code: '51', name: 'GASTOS OPERACIONALES', type: 'EGRESO', nature: 'DEBITO', accepts_movement: false, parent_code: '5' },
    { code: '5105', name: 'SUELDOS Y SALARIOS', type: 'EGRESO', nature: 'DEBITO', accepts_movement: true, parent_code: '51' },
    { code: '5115', name: 'SERVICIOS PÚBLICOS', type: 'EGRESO', nature: 'DEBITO', accepts_movement: true, parent_code: '51' },
    { code: '5120', name: 'ARRENDAMIENTO', type: 'EGRESO', nature: 'DEBITO', accepts_movement: true, parent_code: '51' },
    { code: '5125', name: 'MANTENIMIENTO', type: 'EGRESO', nature: 'DEBITO', accepts_movement: true, parent_code: '51' },
    { code: '5195', name: 'OTROS GASTOS', type: 'EGRESO', nature: 'DEBITO', accepts_movement: true, parent_code: '51' }
  ];
  const accounts = await db.accounts.where('organization_id').equals(orgId).toArray();
  const existingCodes = new Set(accounts.map(a => a.code));
  const codeToId = new Map<string, string>(accounts.map(a => [a.code, a.id]));
  const sorted = [...needed].sort((a, b) => a.code.length - b.code.length);
  const toAdd: any[] = [];
  for (const acc of sorted) {
    if (existingCodes.has(acc.code)) {
      continue;
    }
    let parentId: string | null = null;
    if (acc.parent_code) {
      parentId = codeToId.get(acc.parent_code) || null;
      if (!parentId) {
        const parent = await db.accounts.where({ organization_id: orgId, code: acc.parent_code }).first();
        if (parent) {
          parentId = parent.id;
          codeToId.set(acc.parent_code, parent.id);
          existingCodes.add(acc.parent_code);
        }
      }
    }
    const id = uuidv4();
    codeToId.set(acc.code, id);
    existingCodes.add(acc.code);
    toAdd.push({
      id,
      organization_id: orgId,
      code: acc.code,
      name: acc.name,
      type: acc.type as any,
      nature: acc.nature as any,
      level: acc.code.length,
      accepts_movement: acc.accepts_movement,
      parent_id: parentId,
      created_at: new Date().toISOString(),
      sync_status: 'pendiente' as const
    });
  }
  if (toAdd.length > 0) {
    await db.accounts.bulkAdd(toAdd);
  }
}

export async function seedIglesiaSAS(targetOrgId?: string) {
  try {
    console.log('Starting seed process...');
    
    let orgId = targetOrgId;

    if (!orgId) {
      // Check if "Iglesia S.A.S" already exists
      const existingOrgs = await db.organizations.toArray();
      orgId = existingOrgs.find(o => o.name === 'Iglesia S.A.S')?.id;

      if (!orgId) {
        orgId = uuidv4();
        const newOrg: Organization = {
          id: orgId,
          name: 'Iglesia S.A.S',
          type: 'IGLESIA',
          tax_id: '900.123.456-7',
          settings: {
            address: 'Calle 123 # 45-67, Bogotá',
            phone: '300 123 4567',
            email: 'contacto@iglesiasas.com',
            currency: 'COP'
          },
          created_at: new Date().toISOString(),
          sync_status: 'pendiente'
        };
        await db.organizations.add(newOrg);
        console.log('Organization created:', newOrg);
      }
    } else {
       console.log(`Seeding target organization: ${orgId}`);
    }

    // Cleanup old data for this org
    console.log('Cleaning up old simulation data...');
    const txs = await db.transactions.where('organization_id').equals(orgId).toArray();
    const txIds = txs.map(t => t.id);
    if (txIds.length > 0) {
      await db.journal_entries.where('transaction_id').anyOf(txIds).delete();
    }
    await db.transactions.where('organization_id').equals(orgId).delete();
    await db.contributions.where('organization_id').equals(orgId).delete();
    await db.members.where('organization_id').equals(orgId).delete();
    await db.categories.where('organization_id').equals(orgId).delete();
    await db.projects.where('organization_id').equals(orgId).delete();
    
    // Ensure Default Accounts Exist
    await seedDefaultAccounts(orgId);
    await ensureDemoPUCSubaccounts(orgId);

    const accounts = await db.accounts.where('organization_id').equals(orgId).toArray();
    
    // Helper to find account by code
    const getAccount = (code: string) => accounts.find(a => a.code === code && a.accepts_movement === true);

    // 2. Create Members
    const memberNames = [
      'Juan Pérez', 'María Rodríguez', 'Carlos Gómez', 'Ana Martínez', 'Luis Hernández',
      'Elena López', 'Jorge Díaz', 'Sofía Torres', 'Pedro Ruiz', 'Laura Ramírez',
      'Diego Castro', 'Valentina Morales', 'Andrés Herrera', 'Isabela Jiménez', 'Gabriel Vargas',
      'Camila Romero', 'Mateo Silva', 'Lucía Muñoz', 'Samuel Rojas', 'Daniela Navarro'
    ];

    const members: Member[] = memberNames.map(name => ({
      id: uuidv4(),
      organization_id: orgId!,
      full_name: name,
      document_id: Math.floor(10000000 + Math.random() * 90000000).toString(),
      phone: `3${Math.floor(Math.random() * 10)}0 ${Math.floor(100 + Math.random() * 900)} ${Math.floor(1000 + Math.random() * 9000)}`,
      email: `${name.toLowerCase().replace(' ', '.')}@email.com`,
      address: `Carrera ${Math.floor(Math.random() * 100)} # ${Math.floor(Math.random() * 100)}-${Math.floor(Math.random() * 100)}`,
      birth_date: new Date(1970 + Math.floor(Math.random() * 40), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28)).toISOString(),
      entry_date: new Date(2020 + Math.floor(Math.random() * 4), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28)).toISOString(),
      baptism_date: Math.random() > 0.3 ? new Date(2021, 0, 1).toISOString() : null,
      ministry: Math.random() > 0.7 ? (Math.random() > 0.5 ? ['Alabanza'] : ['Ujieres']) : [],
      status: 'activo',
      is_active: true,
      photo_url: null,
      created_at: new Date().toISOString(),
      sync_status: 'pendiente'
    }));

    await db.members.bulkAdd(members);
    console.log(`${members.length} members created.`);

    // 3. Create Categories
    const categories: Category[] = [
      { id: uuidv4(), organization_id: orgId!, name: 'Diezmos', type: 'ingreso', parent_id: null, icon: 'HandCoins', color: 'green', created_at: new Date().toISOString(), sync_status: 'pendiente' },
      { id: uuidv4(), organization_id: orgId!, name: 'Ofrendas Generales', type: 'ingreso', parent_id: null, icon: 'Gift', color: 'blue', created_at: new Date().toISOString(), sync_status: 'pendiente' },
      { id: uuidv4(), organization_id: orgId!, name: 'Ofrendas Misioneras', type: 'ingreso', parent_id: null, icon: 'Globe', color: 'cyan', created_at: new Date().toISOString(), sync_status: 'pendiente' },
      { id: uuidv4(), organization_id: orgId!, name: 'Eventos Especiales', type: 'ingreso', parent_id: null, icon: 'Calendar', color: 'purple', created_at: new Date().toISOString(), sync_status: 'pendiente' },
      
      { id: uuidv4(), organization_id: orgId!, name: 'Servicios Públicos', type: 'egreso', parent_id: null, icon: 'Zap', color: 'yellow', created_at: new Date().toISOString(), sync_status: 'pendiente' },
      { id: uuidv4(), organization_id: orgId!, name: 'Mantenimiento', type: 'egreso', parent_id: null, icon: 'Wrench', color: 'orange', created_at: new Date().toISOString(), sync_status: 'pendiente' },
      { id: uuidv4(), organization_id: orgId!, name: 'Nómina Pastoral', type: 'egreso', parent_id: null, icon: 'Users', color: 'red', created_at: new Date().toISOString(), sync_status: 'pendiente' },
      { id: uuidv4(), organization_id: orgId!, name: 'Ayudas Sociales', type: 'egreso', parent_id: null, icon: 'Heart', color: 'pink', created_at: new Date().toISOString(), sync_status: 'pendiente' }
    ];

    await db.categories.bulkAdd(categories);
    console.log(`${categories.length} categories created.`);

    // 4. Create Projects
    const projects: Project[] = [
      { id: uuidv4(), organization_id: orgId!, name: 'Fondo de Construcción', description: 'Ampliación del auditorio principal', target_amount: 50000000, start_date: new Date(2024, 0, 1).toISOString(), end_date: null, status: 'activo', created_at: new Date().toISOString(), sync_status: 'pendiente' },
      { id: uuidv4(), organization_id: orgId!, name: 'Misiones Guajira 2024', description: 'Viaje misionero y ayuda humanitaria', target_amount: 15000000, start_date: new Date(2024, 2, 1).toISOString(), end_date: new Date(2024, 11, 31).toISOString(), status: 'activo', created_at: new Date().toISOString(), sync_status: 'pendiente' }
    ];

    await db.projects.bulkAdd(projects);
    console.log(`${projects.length} projects created.`);

    // 5. Generate Transactions and Contributions (Last 3 months)
    const transactions: Transaction[] = [];
    const contributions: Contribution[] = [];
    const journalEntries: JournalEntry[] = [];
    const now = new Date();
    
    const cashAccount = getAccount('110505') || accounts.find(a => a.code.startsWith('1105') && a.accepts_movement === true);
    const bankAccount = getAccount('111005') || accounts.find(a => a.code.startsWith('1110') && a.accepts_movement === true);
    const payablesAccount = getAccount('2335') || accounts.find(a => a.code.startsWith('2335') && a.accepts_movement === true);
    const capitalAccount = getAccount('3105') || accounts.find(a => a.type === 'PATRIMONIO' && a.accepts_movement === true);

    // Income (Tithes & Offerings)
    for (let i = 0; i < 50; i++) {
      const member = members[Math.floor(Math.random() * members.length)];
      const category = categories.filter(c => c.type === 'ingreso')[Math.floor(Math.random() * 4)]; // Pick random income category
      const date = new Date(now.getFullYear(), now.getMonth() - Math.floor(Math.random() * 3), Math.floor(Math.random() * 28) + 1);
      
      const amount = category.name === 'Diezmos' 
        ? Math.floor(50000 + Math.random() * 450000) // 50k - 500k
        : Math.floor(5000 + Math.random() * 45000);   // 5k - 50k

      const transactionId = uuidv4();
      
      transactions.push({
        id: transactionId,
        organization_id: orgId!,
        date: date.toISOString(),
        description: `${category.name} - ${member.full_name}`,
        reference_no: `ING-${Math.floor(1000 + i)}`,
        type: 'ingreso',
        category_id: category.id,
        project_id: category.name.includes('Misioneras') ? projects[1].id : null,
        method: Math.random() > 0.7 ? 'TRANSFERENCIA' : 'EFECTIVO',
        created_by: 'system',
        created_at: date.toISOString(),
        sync_status: 'pendiente'
      });

      contributions.push({
        id: uuidv4(),
        organization_id: orgId!,
        member_id: member.id,
        transaction_id: transactionId,
        category: category.name === 'Diezmos' ? 'DIEZMO' : 'OFRENDA',
        fund_id: null,
        project_id: category.name.includes('Misioneras') ? projects[1].id : null,
        amount: amount,
        method: Math.random() > 0.7 ? 'TRANSFERENCIA' : 'EFECTIVO',
        date: date.toISOString(),
        created_at: date.toISOString(),
        sync_status: 'pendiente'
      });

      // Journal Entries for Income
      let incomeAccountCode = '4110'; // Default Ofrendas
      if (category.name === 'Diezmos') incomeAccountCode = '4105';
      else if (category.name === 'Eventos Especiales') incomeAccountCode = '4115';
      
      const incomeAccount = getAccount(incomeAccountCode) || getAccount('4110') || accounts.find(a => a.type === 'INGRESO' && a.accepts_movement === true);

      if (cashAccount && incomeAccount) {
         // Debit Cash
         journalEntries.push({
           id: uuidv4(),
           transaction_id: transactionId,
           account_id: cashAccount.id,
           debit: amount,
           credit: 0,
           notes: `Ingreso a Caja - ${category.name} (${date.toISOString().split('T')[0]})`,
           sync_status: 'pendiente'
         });
         // Credit Income
         journalEntries.push({
           id: uuidv4(),
           transaction_id: transactionId,
           account_id: incomeAccount.id,
           debit: 0,
           credit: amount,
           notes: `Ingreso ${category.name}`,
           sync_status: 'pendiente'
         });
      }
    }

    // Expenses
    const expenseCategories = categories.filter(c => c.type === 'egreso');
    for (let i = 0; i < 15; i++) {
      const category = expenseCategories[Math.floor(Math.random() * expenseCategories.length)];
      const date = new Date(now.getFullYear(), now.getMonth() - Math.floor(Math.random() * 3), Math.floor(Math.random() * 28) + 1);
      
      const amount = Math.floor(100000 + Math.random() * 900000); // 100k - 1M

      const transactionId = uuidv4();

      transactions.push({
        id: transactionId,
        organization_id: orgId!,
        date: date.toISOString(),
        description: `Pago de ${category.name}`,
        reference_no: `EGR-${Math.floor(1000 + i)}`,
        type: 'egreso',
        category_id: category.id,
        project_id: null,
        method: 'TRANSFERENCIA',
        created_by: 'system',
        created_at: date.toISOString(),
        sync_status: 'pendiente'
      });

      // Journal Entries for Expenses
      let expenseAccountCode = '5195';
      if (category.name === 'Servicios Públicos') expenseAccountCode = '5135';
      else if (category.name === 'Mantenimiento') expenseAccountCode = '5125';
      else if (category.name === 'Nómina Pastoral') expenseAccountCode = '5105';
      
      const expenseAccount = getAccount(expenseAccountCode) || accounts.find(a => a.type === 'EGRESO' && a.accepts_movement === true);

      if (cashAccount && expenseAccount) {
         // Debit Expense
         journalEntries.push({
           id: uuidv4(),
           transaction_id: transactionId,
           account_id: expenseAccount.id,
           debit: amount,
           credit: 0,
           notes: `Gasto - ${category.name}`,
           sync_status: 'pendiente'
         });
         // Credit Cash
         journalEntries.push({
           id: uuidv4(),
           transaction_id: transactionId,
           account_id: cashAccount.id,
           debit: 0,
           credit: amount,
           notes: `Salida de Caja - ${category.name}`,
           sync_status: 'pendiente'
         });
      }
    }

    // Opening Equity: Capital Contribution to Bank (beginning of year)
    if (bankAccount && capitalAccount) {
      const date = new Date(now.getFullYear(), 0, 1);
      const amount = Math.floor(8000000 + Math.random() * 12000000); // 8M - 20M
      const transactionId = uuidv4();
      
      transactions.push({
        id: transactionId,
        organization_id: orgId!,
        date: date.toISOString(),
        description: 'Aporte Inicial de Capital',
        reference_no: 'CAP-001',
        type: 'ingreso',
        category_id: null,
        project_id: null,
        method: 'TRANSFERENCIA',
        created_by: 'system',
        created_at: date.toISOString(),
        sync_status: 'pendiente'
      });

      journalEntries.push({
        id: uuidv4(),
        transaction_id: transactionId,
        account_id: bankAccount.id,
        debit: amount,
        credit: 0,
        notes: 'Ingreso de capital a Banco',
        sync_status: 'pendiente'
      });
      journalEntries.push({
        id: uuidv4(),
        transaction_id: transactionId,
        account_id: capitalAccount.id,
        debit: 0,
        credit: amount,
        notes: 'Capital Suscrito y Pagado',
        sync_status: 'pendiente'
      });
    }

    // Create Expenses on Credit (Accounts Payable) and subsequent payments
    if (payablesAccount) {
      // Credit purchases of services to be paid later
      for (let i = 0; i < 8; i++) {
        const category = expenseCategories[Math.floor(Math.random() * expenseCategories.length)];
        const date = new Date(now.getFullYear(), now.getMonth() - Math.floor(Math.random() * 2), Math.floor(Math.random() * 20) + 1);
        const amount = Math.floor(200000 + Math.random() * 800000); // 200k - 1M
        const transactionId = uuidv4();

        transactions.push({
          id: transactionId,
          organization_id: orgId!,
          date: date.toISOString(),
          description: `Gasto a crédito - ${category.name}`,
          reference_no: `CR-${Math.floor(2000 + i)}`,
          type: 'egreso',
          category_id: category.id,
          project_id: null,
          method: 'TRANSFERENCIA',
          created_by: 'system',
          created_at: date.toISOString(),
          sync_status: 'pendiente'
        });

        // Debit Expense
        const expenseAccountCode = 
          category.name === 'Servicios Públicos' ? '5135' :
          category.name === 'Mantenimiento' ? '5125' :
          category.name === 'Nómina Pastoral' ? '5105' : '5195';
        const expenseAccount = getAccount(expenseAccountCode) || accounts.find(a => a.type === 'EGRESO');

        if (expenseAccount) {
          journalEntries.push({
            id: uuidv4(),
            transaction_id: transactionId,
            account_id: expenseAccount.id,
            debit: amount,
            credit: 0,
            notes: `Reconocimiento gasto a crédito - ${category.name}`,
            sync_status: 'pendiente'
          });
        }
        // Credit Accounts Payable
        journalEntries.push({
          id: uuidv4(),
          transaction_id: transactionId,
          account_id: payablesAccount.id,
          debit: 0,
          credit: amount,
          notes: 'Obligación por pagar',
          sync_status: 'pendiente'
        });

        // Payment later (randomly pay ~50% of them)
        if (Math.random() > 0.5 && bankAccount) {
          const payDate = new Date(date);
          payDate.setDate(payDate.getDate() + Math.floor(5 + Math.random() * 20));
          const payAmount = amount;
          const payTxId = uuidv4();

          transactions.push({
            id: payTxId,
            organization_id: orgId!,
            date: payDate.toISOString(),
            description: `Pago obligación - ${category.name}`,
            reference_no: `PAGO-${Math.floor(3000 + i)}`,
            type: 'egreso',
            category_id: null,
            project_id: null,
            method: 'TRANSFERENCIA',
            created_by: 'system',
            created_at: payDate.toISOString(),
            sync_status: 'pendiente'
          });

          // Debit Accounts Payable
          journalEntries.push({
            id: uuidv4(),
            transaction_id: payTxId,
            account_id: payablesAccount.id,
            debit: payAmount,
            credit: 0,
            notes: 'Cancelación obligación',
            sync_status: 'pendiente'
          });
          // Credit Bank
          journalEntries.push({
            id: uuidv4(),
            transaction_id: payTxId,
            account_id: bankAccount.id,
            debit: 0,
            credit: payAmount,
            notes: 'Salida de Banco por pago',
            sync_status: 'pendiente'
          });
        }
      }
    }

    // Transfer between Cash and Bank to diversify assets
    if (cashAccount && bankAccount) {
      for (let i = 0; i < 5; i++) {
        const date = new Date(now.getFullYear(), now.getMonth() - Math.floor(Math.random() * 2), Math.floor(Math.random() * 25) + 1);
        const amount = Math.floor(300000 + Math.random() * 700000); // 300k - 1M
        const transactionId = uuidv4();

        transactions.push({
          id: transactionId,
          organization_id: orgId!,
          date: date.toISOString(),
          description: 'Transferencia de Caja a Banco',
          reference_no: `TR-${Math.floor(4000 + i)}`,
          type: 'transferencia',
          category_id: null,
          project_id: null,
          method: 'TRANSFERENCIA',
          created_by: 'system',
          created_at: date.toISOString(),
          sync_status: 'pendiente'
        });

        // Credit Cash
        journalEntries.push({
          id: uuidv4(),
          transaction_id: transactionId,
          account_id: cashAccount.id,
          debit: 0,
          credit: amount,
          notes: 'Salida de Caja',
          sync_status: 'pendiente'
        });
        // Debit Bank
        journalEntries.push({
          id: uuidv4(),
          transaction_id: transactionId,
          account_id: bankAccount.id,
          debit: amount,
          credit: 0,
          notes: 'Entrada a Banco',
          sync_status: 'pendiente'
        });
      }
    }

    await db.transactions.bulkAdd(transactions);
    await db.contributions.bulkAdd(contributions);
    await db.journal_entries.bulkAdd(journalEntries);
    
    console.log(`${transactions.length} transactions created.`);
    console.log(`${contributions.length} contributions created.`);
    console.log(`${journalEntries.length} journal entries created.`);

    return { success: true, message: 'Simulación completada con éxito. Organización: Iglesia S.A.S' };

  } catch (error) {
    console.error('Error seeding data:', error);
    return { success: false, message: 'Error al simular datos: ' + (error as Error).message };
  }
}

export async function seedEmpresaSAS(targetOrgId?: string) {
  try {
    console.log('Starting seed process for Empresa S.A.S...');
    
    let orgId = targetOrgId;

    if (!orgId) {
      // Check if "Empresa S.A.S" already exists
      const existingOrgs = await db.organizations.toArray();
      orgId = existingOrgs.find(o => o.name === 'Empresa S.A.S')?.id;

      if (!orgId) {
        orgId = uuidv4();
        const newOrg: Organization = {
          id: orgId,
          name: 'Empresa S.A.S',
          type: 'EMPRESA',
          tax_id: '800.987.654-3',
          settings: {
            address: 'Avenida Siempre Viva 123',
            phone: '310 987 6543',
            email: 'contacto@empresasas.com',
            currency: 'COP'
          },
          created_at: new Date().toISOString(),
          sync_status: 'pendiente'
        };
        await db.organizations.add(newOrg);
        console.log('Organization created:', newOrg);
      }
    } else {
       console.log(`Seeding target organization: ${orgId}`);
       // Update type if needed
       await db.organizations.update(orgId, { type: 'EMPRESA' });
    }

    console.log('Cleaning up old simulation data...');
    // Cleanup
    const txs = await db.transactions.where('organization_id').equals(orgId).toArray();
    const txIds = txs.map(t => t.id);
    if (txIds.length > 0) {
      await db.journal_entries.where('transaction_id').anyOf(txIds).delete();
    }
    
    await db.transactions.where('organization_id').equals(orgId).delete();
    await db.customers.where('organization_id').equals(orgId).delete();
    
    // Cleanup invoices and items
    const invoicesToDelete = await db.invoices.where('organization_id').equals(orgId).toArray();
    const invoiceIds = invoicesToDelete.map(i => i.id);
    if (invoiceIds.length > 0) {
      await db.invoice_items.where('invoice_id').anyOf(invoiceIds).delete();
    }
    await db.invoices.where('organization_id').equals(orgId).delete();
    
    await db.payments.where('organization_id').equals(orgId).delete();
    await db.categories.where('organization_id').equals(orgId).delete();
    
    // Ensure Default Accounts Exist
    await seedDefaultAccounts(orgId);
    await ensureDemoPUCSubaccounts(orgId);
    const accounts = await db.accounts.where('organization_id').equals(orgId).toArray();
    
    const getAccount = (code: string) => accounts.find(a => a.code === code && a.accepts_movement === true);

    // 2. Create Customers
    const customerNames = [
      'Tech Solutions Ltda', 'Inversiones Globales', 'Comercializadora del Norte', 
      'Distribuidora ABC', 'Servicios Integrales SAS', 'Consultores Asociados', 
      'Supermercados El Ahorro', 'Ferretería La Tuerca', 'Restaurante El Sabor', 
      'Hotel Plaza Real'
    ];

    const customers: Customer[] = customerNames.map(name => ({
      id: uuidv4(),
      organization_id: orgId!,
      name: name,
      tax_id: Math.floor(800000000 + Math.random() * 99999999).toString(),
      email: `contacto@${name.toLowerCase().replace(/ /g, '')}.com`,
      phone: `3${Math.floor(Math.random() * 10)}0 ${Math.floor(100 + Math.random() * 900)} ${Math.floor(1000 + Math.random() * 9000)}`,
      address: `Calle ${Math.floor(Math.random() * 100)} # ${Math.floor(Math.random() * 100)}-${Math.floor(Math.random() * 100)}`,
      created_at: new Date().toISOString(),
      sync_status: 'pendiente'
    }));

    await db.customers.bulkAdd(customers);
    console.log(`${customers.length} customers created.`);

    // 3. Create Categories (for Expenses mainly)
    const categories: Category[] = [
      { id: uuidv4(), organization_id: orgId!, name: 'Arrendamientos', type: 'egreso', parent_id: null, icon: 'Building', color: 'blue', created_at: new Date().toISOString(), sync_status: 'pendiente' },
      { id: uuidv4(), organization_id: orgId!, name: 'Servicios Públicos', type: 'egreso', parent_id: null, icon: 'Zap', color: 'yellow', created_at: new Date().toISOString(), sync_status: 'pendiente' },
      { id: uuidv4(), organization_id: orgId!, name: 'Nómina', type: 'egreso', parent_id: null, icon: 'Users', color: 'red', created_at: new Date().toISOString(), sync_status: 'pendiente' },
      { id: uuidv4(), organization_id: orgId!, name: 'Mantenimiento', type: 'egreso', parent_id: null, icon: 'Wrench', color: 'orange', created_at: new Date().toISOString(), sync_status: 'pendiente' },
      { id: uuidv4(), organization_id: orgId!, name: 'Ventas de Servicios', type: 'ingreso', parent_id: null, icon: 'Briefcase', color: 'green', created_at: new Date().toISOString(), sync_status: 'pendiente' },
      { id: uuidv4(), organization_id: orgId!, name: 'Venta de Productos', type: 'ingreso', parent_id: null, icon: 'ShoppingBag', color: 'cyan', created_at: new Date().toISOString(), sync_status: 'pendiente' }
    ];

    await db.categories.bulkAdd(categories);

    // 4. Generate Sales (Invoices)
    const invoices: Invoice[] = [];
    const invoiceItems: InvoiceItem[] = [];
    const payments: Payment[] = [];
    const journalEntries: JournalEntry[] = [];
    const transactions: Transaction[] = []; // For expenses and payments reflecting in cash flow
    
    const now = new Date();
    const salesAccount = getAccount('4105') || accounts.find(a => a.type === 'INGRESO' && a.accepts_movement === true);
    const arAccount = getAccount('1205') || accounts.find(a => a.code.startsWith('12') && a.accepts_movement === true);
    const cashAccount = getAccount('110505') || accounts.find(a => a.code.startsWith('1105') && a.accepts_movement === true);
    const bankAccount = getAccount('111005') || accounts.find(a => a.code.startsWith('1110') && a.accepts_movement === true);
    const taxAccount = getAccount('2408') || accounts.find(a => a.code.startsWith('2408') && a.accepts_movement === true);

    for (let i = 0; i < 30; i++) {
      const customer = customers[Math.floor(Math.random() * customers.length)];
      const date = new Date(now.getFullYear(), now.getMonth() - Math.floor(Math.random() * 3), Math.floor(Math.random() * 28) + 1);
      
      const subtotal = Math.floor(100000 + Math.random() * 5000000);
      const tax = Math.floor(subtotal * 0.19);
      const total = subtotal + tax;

      const invoiceId = uuidv4();
      
      invoices.push({
        id: invoiceId,
        organization_id: orgId!,
        customer_id: customer.id,
        number: `FV-${1000 + i}`,
        date: date.toISOString(),
        due_date: new Date(date.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        subtotal,
        tax,
        total,
        payment_form: Math.random() > 0.5 ? 'Contado' : 'Credito',
        payment_method: 'Transferencia',
        status: 'enviada',
        created_at: date.toISOString(),
        sync_status: 'pendiente'
      });

      invoiceItems.push({
        id: uuidv4(),
        invoice_id: invoiceId,
        description: 'Servicios Profesionales',
        quantity: 1,
        unit_price: subtotal,
        tax_percent: 19,
        total: subtotal,
        sync_status: 'pendiente'
      });

      // Create Transaction record for the Invoice (Accrual Income)
      transactions.push({
        id: invoiceId,
        organization_id: orgId!,
        date: date.toISOString(),
        description: `Venta Factura FV-${1000 + i}`,
        reference_no: `FV-${1000 + i}`,
        type: 'ingreso',
        category_id: categories.find(c => c.name === 'Ventas de Servicios')?.id || null,
        method: 'TRANSFERENCIA',
        created_by: 'system',
        created_at: date.toISOString(),
        sync_status: 'pendiente'
      });

      // Journal Entry for Sale
      if (salesAccount && arAccount) {
        // Debit AR
        journalEntries.push({
           id: uuidv4(),
           transaction_id: invoiceId, // Using invoiceId as transaction reference for simplicity here, though usually separate
           account_id: arAccount.id,
           debit: total,
           credit: 0,
           notes: `Venta Factura FV-${1000 + i}`,
           sync_status: 'pendiente'
        });
        
        // Credit Income (Subtotal)
        journalEntries.push({
           id: uuidv4(),
           transaction_id: invoiceId,
           account_id: salesAccount.id,
           debit: 0,
           credit: subtotal,
           notes: `Ingreso Venta FV-${1000 + i}`,
           sync_status: 'pendiente'
        });

        // Credit Tax (IVA Generated 2408)
        if (taxAccount && tax > 0) {
          journalEntries.push({
             id: uuidv4(),
             transaction_id: invoiceId,
             account_id: taxAccount.id,
             debit: 0,
             credit: tax,
             notes: `IVA Generado Venta FV-${1000 + i}`,
             sync_status: 'pendiente'
          });
        } else if (tax > 0) {
           // Fallback: If no tax account, add tax to sales credit to ensure balance
           // Find the previous entry (Sales Credit) and update it
           const salesEntry = journalEntries[journalEntries.length - 1];
           salesEntry.credit += tax;
        }
      }

      // Payment (if Contado or random)
      if (Math.random() > 0.3) {
        const paymentDate = new Date(date.getTime() + Math.random() * 10 * 24 * 60 * 60 * 1000);
        if (paymentDate <= now) {
          const paymentId = uuidv4();
          payments.push({
            id: paymentId,
            organization_id: orgId!,
            invoice_id: invoiceId,
            date: paymentDate.toISOString(),
            amount: total,
            method: 'TRANSFERENCIA',
            created_at: paymentDate.toISOString(),
            sync_status: 'pendiente'
          });

          // Journal Entry for Payment
          if (bankAccount && arAccount) {
            journalEntries.push({
               id: uuidv4(),
               transaction_id: paymentId,
               account_id: bankAccount.id,
               debit: total,
               credit: 0,
               notes: `Pago Factura FV-${1000 + i}`,
               sync_status: 'pendiente'
            });
             journalEntries.push({
               id: uuidv4(),
               transaction_id: paymentId,
               account_id: arAccount.id,
               debit: 0,
               credit: total,
               notes: `Cobro Cliente ${customer.name}`,
               sync_status: 'pendiente'
            });
          }
          
          // Also create a Transaction record for cash flow visibility
          transactions.push({
            id: paymentId, // reusing ID to link
            organization_id: orgId!,
            date: paymentDate.toISOString(),
            description: `Pago Cliente - ${customer.name}`,
            reference_no: `RC-${Math.floor(1000 + i)}`,
            type: 'ingreso',
            category_id: categories.find(c => c.name === 'Ventas de Servicios')?.id || null,
            method: 'TRANSFERENCIA',
            created_by: 'system',
            created_at: paymentDate.toISOString(),
            sync_status: 'pendiente'
          });
        }
      }
    }

    // 5. Expenses
    const expenseCategories = categories.filter(c => c.type === 'egreso');
    for (let i = 0; i < 15; i++) {
      const category = expenseCategories[Math.floor(Math.random() * expenseCategories.length)];
      const date = new Date(now.getFullYear(), now.getMonth() - Math.floor(Math.random() * 3), Math.floor(Math.random() * 28) + 1);
      
      const amount = Math.floor(200000 + Math.random() * 2000000); 

      const transactionId = uuidv4();

      transactions.push({
        id: transactionId,
        organization_id: orgId!,
        date: date.toISOString(),
        description: `Pago de ${category.name}`,
        reference_no: `EGR-${Math.floor(2000 + i)}`,
        type: 'egreso',
        category_id: category.id,
        method: 'TRANSFERENCIA',
        created_by: 'system',
        created_at: date.toISOString(),
        sync_status: 'pendiente'
      });

      // Journal Entries for Expenses
      let expenseAccountCode = '5195'; 
      if (category.name === 'Servicios Públicos') expenseAccountCode = '5115';
      else if (category.name === 'Mantenimiento') expenseAccountCode = '5125';
      else if (category.name === 'Arrendamientos') expenseAccountCode = '5120';
      else if (category.name === 'Nómina') expenseAccountCode = '5105';
      
      const expenseAccount = getAccount(expenseAccountCode) || accounts.find(a => a.type === 'EGRESO' && a.accepts_movement === true);

      if (bankAccount && expenseAccount) {
         // Debit Expense
         journalEntries.push({
           id: uuidv4(),
           transaction_id: transactionId,
           account_id: expenseAccount.id,
           debit: amount,
           credit: 0,
           notes: `Gasto - ${category.name}`,
           sync_status: 'pendiente'
         });
         // Credit Bank
         journalEntries.push({
           id: uuidv4(),
           transaction_id: transactionId,
           account_id: bankAccount.id,
           debit: 0,
           credit: amount,
           notes: `Pago ${category.name}`,
           sync_status: 'pendiente'
         });
      }
    }

    // 6. Generate Liabilities (Pasivos) - Credit Purchases & Loans
    const liabilityAccount = getAccount('2335') || accounts.find(a => a.code.startsWith('23') && a.accepts_movement === true) || accounts.find(a => a.type === 'PASIVO' && a.accepts_movement === true);
    const loanAccount = getAccount('2105') || accounts.find(a => a.code.startsWith('21') && a.accepts_movement === true);
    
    // 6.1 Credit Expenses (Cuentas por Pagar)
    if (liabilityAccount) {
      for (let i = 0; i < 5; i++) {
        const category = expenseCategories[Math.floor(Math.random() * expenseCategories.length)];
        const date = new Date(now.getFullYear(), now.getMonth(), Math.floor(Math.random() * 28) + 1); // Recent
        const amount = Math.floor(500000 + Math.random() * 1500000);
        
        const transactionId = uuidv4();
        
        // Transaction record (marked as pending payment implicitly or just expense accrual)
        transactions.push({
          id: transactionId,
          organization_id: orgId!,
          date: date.toISOString(),
          description: `Causación ${category.name} (Pendiente de Pago)`,
          reference_no: `CXP-${Math.floor(5000 + i)}`,
          type: 'egreso',
          category_id: category.id,
          method: 'TRANSFERENCIA', // Placeholder
          created_by: 'system',
          created_at: date.toISOString(),
          sync_status: 'pendiente'
        });

        // Journal Entry
        let expenseAccountCode = '5195'; 
        if (category.name === 'Servicios Públicos') expenseAccountCode = '5115';
        else if (category.name === 'Mantenimiento') expenseAccountCode = '5125';
        else if (category.name === 'Arrendamientos') expenseAccountCode = '5120';
        else if (category.name === 'Nómina') expenseAccountCode = '5105';
        
        const expenseAccount = getAccount(expenseAccountCode) || accounts.find(a => a.type === 'EGRESO' && a.accepts_movement === true);

        if (expenseAccount) {
          // Debit Expense
          journalEntries.push({
             id: uuidv4(),
             transaction_id: transactionId,
             account_id: expenseAccount.id,
             debit: amount,
             credit: 0,
             notes: `Gasto Causado - ${category.name}`,
             sync_status: 'pendiente'
          });
          // Credit Liability (Cuentas por Pagar)
          journalEntries.push({
             id: uuidv4(),
             transaction_id: transactionId,
             account_id: liabilityAccount.id,
             debit: 0,
             credit: amount,
             notes: `CxP - ${category.name}`,
             sync_status: 'pendiente'
          });
        }
      }
    }

    // 6.2 Bank Loan (Obligación Financiera)
    if (loanAccount && bankAccount) {
      const date = new Date(now.getFullYear(), now.getMonth() - 2, 15);
      const amount = 50000000; // 50M Loan
      const transactionId = uuidv4();

      transactions.push({
          id: transactionId,
          organization_id: orgId!,
          date: date.toISOString(),
          description: `Desembolso Préstamo Bancario`,
          reference_no: `PT-001`,
          type: 'ingreso', // Money comes in
          category_id: null,
          method: 'TRANSFERENCIA',
          created_by: 'system',
          created_at: date.toISOString(),
          sync_status: 'pendiente'
      });

      // Debit Bank
      journalEntries.push({
         id: uuidv4(),
         transaction_id: transactionId,
         account_id: bankAccount.id,
         debit: amount,
         credit: 0,
         notes: `Ingreso Préstamo Bancario`,
         sync_status: 'pendiente'
      });
      // Credit Liability
      journalEntries.push({
         id: uuidv4(),
         transaction_id: transactionId,
         account_id: loanAccount.id,
         debit: 0,
         credit: amount,
         notes: `Obligación Financiera Banco`,
         sync_status: 'pendiente'
      });
    }

    // 7. Equity (Patrimonio) - Initial Capital
    const capitalAccount = getAccount('3105') || accounts.find(a => a.code.startsWith('31') && a.accepts_movement === true);
    if (capitalAccount && bankAccount) {
      const date = new Date(now.getFullYear(), 0, 1); // Start of year
      const amount = 20000000; // 20M Capital
      const transactionId = uuidv4();

      transactions.push({
          id: transactionId,
          organization_id: orgId!,
          date: date.toISOString(),
          description: `Aporte Capital Inicial`,
          reference_no: `CAP-001`,
          type: 'ingreso',
          category_id: null,
          method: 'TRANSFERENCIA',
          created_by: 'system',
          created_at: date.toISOString(),
          sync_status: 'pendiente'
      });

      // Debit Bank
      journalEntries.push({
         id: uuidv4(),
         transaction_id: transactionId,
         account_id: bankAccount.id,
         debit: amount,
         credit: 0,
         notes: `Ingreso Capital Social`,
         sync_status: 'pendiente'
      });
      // Credit Equity
      journalEntries.push({
         id: uuidv4(),
         transaction_id: transactionId,
         account_id: capitalAccount.id,
         debit: 0,
         credit: amount,
         notes: `Capital Suscrito y Pagado`,
         sync_status: 'pendiente'
      });
    }

    await db.invoices.bulkAdd(invoices);
    await db.invoice_items.bulkAdd(invoiceItems);
    await db.payments.bulkAdd(payments);
    await db.transactions.bulkAdd(transactions);
    await db.journal_entries.bulkAdd(journalEntries);
    
    return { success: true, message: 'Simulación completada con éxito. Organización: Empresa S.A.S' };

  } catch (error) {
    console.error('Error seeding data:', error);
    return { success: false, message: 'Error al simular datos: ' + (error as Error).message };
  }
} 
