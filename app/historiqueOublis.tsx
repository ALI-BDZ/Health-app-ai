import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useDailyLog } from '../services/DailyLogContext';
import { Colors } from '../constants/Colors';
import { DatabaseService, Medicine } from '../services/databaseService';

const padTime = (t: string) => {
  // Ensure time is always HH:MM
  const [h, m] = t.split(':');
  return `${h.padStart(2, '0')}:${m.padStart(2, '0')}`;
};

const HistoriqueOublisScreen = () => {
  const { dailyLogs } = useDailyLog();
  const [medicines, setMedicines] = useState<Medicine[]>([]);

  // Refresh medicines whenever logs change (to catch new/edited meds)
  useEffect(() => {
    DatabaseService.getMedicines().then(setMedicines);
  }, [dailyLogs]);

  // Build a list of missed medications: [{date, medName, time}]
  const missed: { date: string; medName: string; time: string }[] = [];
  Object.entries(dailyLogs).forEach(([date, log]) => {
    medicines.forEach(med => {
      const medLog = log.taken[String(med.id)] || log.taken[med.id];
      med.exactTimes.forEach(time => {
        const formattedTime = padTime(time);
        // Check in log with formatted time
        const taken = medLog?.takenTimes?.[formattedTime];
        if (taken !== true) {
          missed.push({ date, medName: med.name, time: formattedTime });
        }
      });
    });
  });

  // Sort by date descending, then medName, then time
  missed.sort((a, b) => b.date.localeCompare(a.date) || a.medName.localeCompare(b.medName) || a.time.localeCompare(b.time));

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Historique des oublis de médicaments</Text>
      {missed.length === 0 ? (
        <Text style={styles.empty}>Aucun oubli 🎉</Text>
      ) : (
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.cell, styles.headerCell, {flex: 2}]}>Date</Text>
            <Text style={[styles.cell, styles.headerCell, {flex: 2}]}>Médicament</Text>
            <Text style={[styles.cell, styles.headerCell]}>Heure</Text>
          </View>
          {missed.map((item, idx) => (
            <View key={idx} style={styles.tableRow}>
              <Text style={[styles.cell, {flex: 2}]}>{item.date}</Text>
              <Text style={[styles.cell, {flex: 2}]}>{item.medName}</Text>
              <Text style={styles.cell}>{item.time}</Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, padding: 12 },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 16, color: Colors.primary },
  empty: { color: 'green', textAlign: 'center', marginTop: 32, fontSize: 18 },
  table: { marginTop: 8 },
  tableHeader: { flexDirection: 'row', borderBottomWidth: 1, borderColor: Colors.border, marginBottom: 4 },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderColor: '#eee', alignItems: 'center' },
  cell: { flex: 1, padding: 6, textAlign: 'center', fontSize: 14 },
  headerCell: { fontWeight: 'bold', backgroundColor: Colors.primaryLight, color: Colors.primaryDark },
});

export default HistoriqueOublisScreen; 