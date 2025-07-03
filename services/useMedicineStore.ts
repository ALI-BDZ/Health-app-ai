import create from 'zustand';
import { LogService, DailyLog } from './databaseService';

export const useMedicineStore = create((set, get) => ({
  medicines: [],
  dailyLogs: {}, // { '2025-07-03': { doliprane: true, ibuprofen: false, ... } }

  setMedicines: (medicines) => set({ medicines }),

  updateMedicine: (id, updates) =>
    set((state) => ({
      medicines: state.medicines.map((m) =>
        m.id === id ? { ...m, ...updates } : m
      ),
    })),

  // Marquer un médicament comme pris/non pris pour une date donnée
  setMedicineTaken: (date, medicineName, taken) =>
    set((state) => ({
      dailyLogs: {
        ...state.dailyLogs,
        [date]: {
          ...(state.dailyLogs[date] || {}),
          [medicineName]: taken,
        },
      },
    })),
}));

// --- DailyLogContext for global daily log state ---
import * as React from 'react';

const DailyLogContext = React.createContext({
  dailyLogs: {} as { [date: string]: DailyLog },
  setDailyLogs: (logs: { [date: string]: DailyLog }) => {},
  refreshDailyLogs: async () => {},
  updateDailyLog: async (date: string, log: DailyLog) => {},
});

export const DailyLogProvider = ({ children }: { children: React.ReactNode }) => {
  const [dailyLogs, setDailyLogs] = React.useState<{ [date: string]: DailyLog }>({});

  // Load all logs from storage
  const refreshDailyLogs = React.useCallback(async () => {
    const logs = await LogService.getAllDailyLogs();
    setDailyLogs(logs);
  }, []);

  // Update a single log and update state
  const updateDailyLog = React.useCallback(async (date: string, log: DailyLog) => {
    await LogService.saveDailyLog(date, log);
    setDailyLogs(prev => ({ ...prev, [date]: log }));
  }, []);

  return (
    <DailyLogContext.Provider value={{ dailyLogs, setDailyLogs, refreshDailyLogs, updateDailyLog }}>
      {children}
    </DailyLogContext.Provider>
  );
};

export const useDailyLog = () => React.useContext(DailyLogContext);
