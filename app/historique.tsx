import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useDailyLog } from '../services/DailyLogContext';
import { Colors } from '../constants/Colors';

const HistoriqueScreen = () => {
  const { dailyLogs } = useDailyLog();

  // Get all unique medication times and names across all logs
  const allMeds: { [id: string]: { name: string; times: Set<string> } } = {};
  Object.values(dailyLogs).forEach(log => {
    Object.entries(log.taken).forEach(([medId, med]) => {
      if (!allMeds[medId]) allMeds[medId] = { name: med.name, times: new Set() };
      Object.keys(med.takenTimes || {}).forEach(time => allMeds[medId].times.add(time));
    });
  });
  const medIds = Object.keys(allMeds);
  const allTimes = Array.from(new Set(medIds.flatMap(id => Array.from(allMeds[id].times)))).sort();

  // Sort dates descending
  const dates = Object.keys(dailyLogs).sort((a, b) => b.localeCompare(a));

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Historique de prise des médicaments</Text>
      {dates.length === 0 && <Text style={styles.empty}>Aucun historique trouvé.</Text>}
      {dates.map(date => (
        <View key={date} style={styles.dayBlock}>
          <Text style={styles.date}>{date}</Text>
          <View style={styles.tableHeader}>
            <Text style={[styles.cell, styles.headerCell, {flex: 2}]}>Médicament</Text>
            {allTimes.map(time => (
              <Text key={time} style={[styles.cell, styles.headerCell]}>{time}</Text>
            ))}
          </View>
          {medIds.map(medId => {
            const med = allMeds[medId];
            const taken = dailyLogs[date]?.taken?.[medId];
            return (
              <View key={medId} style={styles.tableRow}>
                <Text style={[styles.cell, {flex: 2}]}>{med.name}</Text>
                {allTimes.map(time => {
                  const status = taken?.takenTimes?.[time];
                  return (
                    <Text
                      key={time}
                      style={[styles.cell, status === true ? styles.taken : styles.notTaken]}
                    >
                      {status === true ? '✅' : status === false ? '❌' : '-'}
                    </Text>
                  );
                })}
              </View>
            );
          })}
        </View>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, padding: 12 },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 16, color: Colors.primary },
  empty: { color: Colors.textSecondary, textAlign: 'center', marginTop: 32 },
  dayBlock: { marginBottom: 32, backgroundColor: '#fff', borderRadius: 8, padding: 8, elevation: 2 },
  date: { fontWeight: 'bold', fontSize: 16, marginBottom: 8, color: Colors.primaryDark },
  tableHeader: { flexDirection: 'row', borderBottomWidth: 1, borderColor: Colors.border, marginBottom: 4 },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderColor: '#eee', alignItems: 'center' },
  cell: { flex: 1, padding: 6, textAlign: 'center', fontSize: 14 },
  headerCell: { fontWeight: 'bold', backgroundColor: Colors.primaryLight, color: Colors.primaryDark },
  taken: { color: 'green', fontWeight: 'bold' },
  notTaken: { color: 'red', fontWeight: 'bold' },
});

export default HistoriqueScreen; 