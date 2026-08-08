import { create } from 'zustand';
import { getAllFromStore, putToStore } from '../utils/db';

export const useAuditStore = create((set, get) => ({
  auditLogs: [],
  isLoaded: false,

  loadAuditLogs: async () => {
    try {
      const logs = await getAllFromStore('auditLogs');
      // Sort by newest first
      logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      set({ auditLogs: logs, isLoaded: true });
    } catch (err) {
      console.error('Failed to load audit logs:', err);
      set({ auditLogs: [], isLoaded: true });
    }
  },

  logAction: async (action, record) => {
    const newLog = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      userAction: action,
      affectedRecord: record
    };

    try {
      await putToStore('auditLogs', newLog);
      set(state => ({
        auditLogs: [newLog, ...state.auditLogs]
      }));
    } catch (err) {
      console.error('Failed to save audit log:', err);
    }
  }
}));

// Expose simple helper
export async function logAudit(action, record) {
  await useAuditStore.getState().logAction(action, record);
}
