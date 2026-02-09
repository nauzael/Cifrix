import { v4 as uuidv4 } from 'uuid';
import { db } from './db';
import { UNIVERSAL_PUC } from './pucTemplates';

export async function seedDefaultAccounts(orgId: string) {
  const defaultAccounts = UNIVERSAL_PUC;
  
  // Track created IDs to map parent_code to parent_id
  const codeToIdMap = new Map<string, string>();

  // Sort by code length to ensure parents are created before children
  // (Assuming shorter codes are parents of longer codes)
  const sortedAccounts = [...defaultAccounts].sort((a, b) => a.code.length - b.code.length);

  const accountsToAdd = [];

  for (const acc of sortedAccounts) {
    const exists = await db.accounts.where({ organization_id: orgId, code: acc.code }).first();
    
    if (!exists) {
      const id = uuidv4();
      codeToIdMap.set(acc.code, id);
      
      let parentId: string | null = null;
      if (acc.parent_code) {
        // Try to find parent in our map first (newly created)
        parentId = codeToIdMap.get(acc.parent_code) || null;
        
        // If not in map, try DB (maybe existed before)
        if (!parentId) {
          const parent = await db.accounts.where({ organization_id: orgId, code: acc.parent_code }).first();
          if (parent) {
            parentId = parent.id;
            codeToIdMap.set(acc.parent_code, parent.id);
          }
        }
      }

      accountsToAdd.push({
        id,
        organization_id: orgId,
        code: acc.code,
        name: acc.name,
        type: acc.type,
        nature: acc.nature,
        level: acc.code.length, // Simplified level logic
        accepts_movement: acc.accepts_movement,
        parent_id: parentId,
        created_at: new Date().toISOString(),
        sync_status: 'pendiente' as const
      });
    } else {
      codeToIdMap.set(acc.code, exists.id);
    }
  }

  if (accountsToAdd.length > 0) {
    await db.accounts.bulkAdd(accountsToAdd);
    // console.log(`Seeded ${accountsToAdd.length} accounts for ${orgType}`);
  }
}
