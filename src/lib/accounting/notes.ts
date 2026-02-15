import { db, FinancialNote } from '../db';
import { v4 as uuidv4 } from 'uuid';

export class FinancialNotesService {
    /**
     * Obtiene las notas para un periodo y tipo de reporte
     */
    async getNotes(organizationId: string, periodId: string, reportType: FinancialNote['report_type']): Promise<FinancialNote[]> {
        return db.financial_notes
            .where({ organization_id: organizationId })
            .and(n => n.period_id === periodId && n.report_type === reportType)
            .sortBy('order');
    }

    /**
     * Crea o actualiza una nota
     */
    async saveNote(note: Partial<FinancialNote> & { organization_id: string }): Promise<string> {
        if (note.id) {
            await db.financial_notes.update(note.id, {
                ...note,
                sync_status: 'pendiente'
            });
            return note.id;
        } else {
            const id = uuidv4();
            await db.financial_notes.add({
                id,
                organization_id: note.organization_id,
                period_id: note.period_id!,
                report_type: note.report_type!,
                title: note.title || '',
                content: note.content || '',
                order: note.order || 0,
                created_at: new Date().toISOString(),
                sync_status: 'pendiente',
                ...note
            } as FinancialNote);
            return id;
        }
    }

    /**
     * Elimina una nota
     */
    async deleteNote(id: string): Promise<void> {
        // Soft delete logic if we were tracking deletions, but for notes we might just remove locally
        // given db.ts structure tracking deletions:
        await db.financial_notes.delete(id);
    }
}

export const financialNotesService = new FinancialNotesService();
