// databaseService.tsx (MODIFIED for AsyncStorage)
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Patient {
  id: number;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  registeredBy: 'patient' | 'responsible';
  responsiblePersonId: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface ResponsiblePerson {
  id: number;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  createdAt: string;
  updatedAt: string;
}

export interface Medicine {
  id: number;
  name: string;
  photo?: string | null;
  quantity: number;
  periods: string[];
  exactTimes: string[];
  takenTimes: { [key: string]: boolean };
  createdAt: string;
  updatedAt: string;
  lastTakenDate?: string; // NEW: To track the last date takenTimes was reset or updated
}

export interface DailyLog {
  date: string;
  taken: {
    [medicineId: number]: {
      name: string;
      takenTimes: { [time: string]: boolean };
    };
  };
}

export const STORAGE_KEYS = {
  PATIENTS: 'patients',
  RESPONSIBLE_PERSONS: 'responsible_persons',
  MEDICINES: 'medicines',
  DAILY_LOGS: 'daily_logs',
};

export const DatabaseService = {
  // Existing Patient functions (UNCHANGED)
  async savePatient(patient: Omit<Patient, 'id' | 'createdAt' | 'updatedAt'>): Promise<Patient> {
    const patients = await this.getPatients();
    const responsiblePersons = await this.getResponsiblePersons();

    const newPatient: Patient = {
      id: patients.length > 0 ? Math.max(...patients.map(p => p.id)) + 1 : 1, // Ensure unique ID
      ...patient,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (patient.responsiblePersonId) {
      const responsiblePersonExists = responsiblePersons.some(rp => rp.id === patient.responsiblePersonId);
      if (!responsiblePersonExists) throw new Error('Responsible person does not exist');
    }

    patients.push(newPatient);
    await AsyncStorage.setItem(STORAGE_KEYS.PATIENTS, JSON.stringify(patients));
    return newPatient;
  },

  async getPatients(): Promise<Patient[]> {
    const json = await AsyncStorage.getItem(STORAGE_KEYS.PATIENTS);
    return json ? JSON.parse(json) : [];
  },

  async deleteAllPatients(): Promise<void> {
    await AsyncStorage.removeItem(STORAGE_KEYS.PATIENTS);
  },

  // Existing ResponsiblePerson functions (UNCHANGED)
  async deleteAllResponsiblePersons(): Promise<void> {
    await AsyncStorage.removeItem(STORAGE_KEYS.RESPONSIBLE_PERSONS);
  },

  async saveResponsiblePerson(
    responsiblePerson: Omit<ResponsiblePerson, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<ResponsiblePerson> {
    const responsiblePersons = await this.getResponsiblePersons();

    const newResponsiblePerson: ResponsiblePerson = {
      id: responsiblePersons.length > 0 ? Math.max(...responsiblePersons.map(rp => rp.id)) + 1 : 1, // Ensure unique ID
      ...responsiblePerson,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    responsiblePersons.push(newResponsiblePerson);
    await AsyncStorage.setItem(STORAGE_KEYS.RESPONSIBLE_PERSONS, JSON.stringify(responsiblePersons));
    return newResponsiblePerson;
  },

  async getResponsiblePersons(): Promise<ResponsiblePerson[]> {
    const json = await AsyncStorage.getItem(STORAGE_KEYS.RESPONSIBLE_PERSONS);
    return json ? JSON.parse(json) : [];
  },

  // MODIFIED Medicine functions
  async saveMedicine(
    // MODIFIED: added lastTakenDate to the Omit list for initial save as it's set by the service
    medicine: Omit<Medicine, 'id' | 'createdAt' | 'updatedAt' | 'takenTimes' | 'lastTakenDate'>
  ): Promise<Medicine> {
    const medicines = await this.getMedicines();
    const today = new Date().toDateString(); // Get today's date string for initial lastTakenDate

    const newMedicine: Medicine = {
      id: medicines.length > 0 ? Math.max(...medicines.map(m => m.id)) + 1 : 1, // Ensure unique ID
      ...medicine,
      takenTimes: {}, // MODIFIED: Initialize takenTimes as an empty object
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastTakenDate: today, // NEW: Initialize with today's date
    };

    medicines.push(newMedicine);
    await AsyncStorage.setItem(STORAGE_KEYS.MEDICINES, JSON.stringify(medicines));
    return newMedicine;
  },

  async getMedicines(): Promise<Medicine[]> {
    const json = await AsyncStorage.getItem(STORAGE_KEYS.MEDICINES);
    const medicines: Medicine[] = json ? JSON.parse(json) : [];
    // Ensure takenTimes is always an object, even if stored as null/undefined
    return medicines.map(med => ({
      ...med,
      takenTimes: med.takenTimes || {},
    }));
  },

  async updateMedicine(id: number, updates: Partial<Medicine>): Promise<Medicine> {
    const medicines = await this.getMedicines();
    const index = medicines.findIndex(m => m.id === id);
    if (index === -1) throw new Error('Medicine not found');

    const updated: Medicine = {
      ...medicines[index],
      ...updates,
      updatedAt: new Date().toISOString(),
      // Ensure takenTimes is merged properly, especially when new values come in
      takenTimes: updates.takenTimes !== undefined
        ? updates.takenTimes
        : medicines[index].takenTimes,
      // lastTakenDate is explicitly updated if provided, otherwise kept
      lastTakenDate: updates.lastTakenDate !== undefined
        ? updates.lastTakenDate
        : medicines[index].lastTakenDate,
    };

    medicines[index] = updated;
    await AsyncStorage.setItem(STORAGE_KEYS.MEDICINES, JSON.stringify(medicines));
    return updated;
  },

  // Existing deleteMedicine (UNCHANGED)
  async deleteMedicine(id: number): Promise<void> {
    const medicines = await this.getMedicines();
    const updated = medicines.filter(m => m.id !== id);
    await AsyncStorage.setItem(STORAGE_KEYS.MEDICINES, JSON.stringify(updated));
  },
};

// Existing LogService (UNCHANGED - it's already implemented correctly for fresh reads)
export const LogService = {
  async saveDailyLog(date: string, log: DailyLog): Promise<void> {
    const logs = await this.getAllDailyLogs(); // Get the latest logs
    logs[date] = log; // Update the specific date entry
    await AsyncStorage.setItem(STORAGE_KEYS.DAILY_LOGS, JSON.stringify(logs)); // Save the entire updated collection
    console.log(`[LogService] Saved daily log for ${date}. Total logs: ${Object.keys(logs).length}`); // Debug log
  },

  async getDailyLog(date: string): Promise<DailyLog | null> {
    const logs = await this.getAllDailyLogs();
    return logs[date] || null;
  },

  async getAllDailyLogs(): Promise<{ [date: string]: DailyLog }> {
    const json = await AsyncStorage.getItem(STORAGE_KEYS.DAILY_LOGS);
    const logs = json ? JSON.parse(json) : {};
    console.log(`[LogService] Retrieved all daily logs from storage. Found ${Object.keys(logs).length} entries.`); // Debug log
    return logs;
  },

  async deleteDailyLog(date: string): Promise<void> {
    const logs = await this.getAllDailyLogs();
    delete logs[date];
    await AsyncStorage.setItem(STORAGE_KEYS.DAILY_LOGS, JSON.stringify(logs));
  },

  async clearAllDailyLogs(): Promise<void> {
    await AsyncStorage.removeItem(STORAGE_KEYS.DAILY_LOGS);
    console.log('[LogService] Cleared all daily logs from storage.'); // Debug log
  },
};