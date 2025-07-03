import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useDailyLog } from '../services/DailyLogContext';
import { DatabaseService, Medicine } from '../services/databaseService';
import { Colors } from '../constants/Colors';
import { globalStyles } from '../services/globalstyle';

const padTime = (t: string) => {
  const [h, m] = t.split(':');
  return `${h.padStart(2, '0')}:${m.padStart(2, '0')}`;
};

export default function CalendarScreen() {
  const { dailyLogs } = useDailyLog();
  const [medicines, setMedicines] = useState<Medicine[]>([]);

  useEffect(() => {
    DatabaseService.getMedicines().then(setMedicines);
  }, [dailyLogs]);

  // Build a list of all (date, med, time, status)
  const entries: { date: string; medName: string; time: string; status: boolean }[] = [];
  Object.entries(dailyLogs).forEach(([date, log]) => {
    medicines.forEach(med => {
      const medLog = log.taken[String(med.id)] || log.taken[med.id];
      med.exactTimes.forEach(time => {
        const formattedTime = padTime(time);
        const taken = medLog?.takenTimes?.[formattedTime] === true;
        entries.push({ date, medName: med.name, time: formattedTime, status: taken });
      });
    });
  });
  // Sort by date desc, medName, time
  entries.sort((a, b) => b.date.localeCompare(a.date) || a.medName.localeCompare(b.medName) || a.time.localeCompare(b.time));

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient
        colors={[Colors.primaryLight, Colors.background]}
        style={styles.gradientBackground}
      >
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
          <View style={styles.headerContainer}>
            <Text style={[globalStyles.title, styles.title]}>
              Calendrier des Médicaments
            </Text>
            <Ionicons name="calendar-outline" size={24} color={Colors.primary} />
          </View>
          {entries.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="information-circle-outline" size={48} color={Colors.textSecondary} />
              <Text style={[globalStyles.text, styles.emptyText]}>
                Aucune donnée disponible
              </Text>
            </View>
          ) : (
            <View style={[globalStyles.card, styles.table]}>
              <View style={styles.tableHeader}>
                <Text style={[styles.headerCell, { flex: 2 }]}>Date</Text>
                <Text style={[styles.headerCell, { flex: 2 }]}>Médicament</Text>
                <Text style={styles.headerCell}>Heure</Text>
                <Text style={styles.headerCell}>Statut</Text>
              </View>
              {entries.map((item, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[styles.tableRow, idx % 2 === 0 ? styles.tableRowEven : styles.tableRowOdd]}
                  activeOpacity={0.7}
                >
                  <Text style={[globalStyles.text, styles.cell, { flex: 2 }]}>
                    {item.date}
                  </Text>
                  <Text style={[globalStyles.text, styles.cell, { flex: 2 }]}>
                    {item.medName}
                  </Text>
                  <Text style={[globalStyles.text, styles.cell]}>
                    {item.time}
                  </Text>
                  <Ionicons
                    name={item.status ? 'checkmark-circle' : 'close-circle'}
                    size={20}
                    color={item.status ? Colors.success : Colors.error}
                    style={styles.cell}
                  />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  gradientBackground: {
    flex: 1,
  },
  container: {
    flex: 1,
    padding: 16,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: Colors.primary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  table: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tableRowEven: {
    backgroundColor: Colors.background,
  },
  tableRowOdd: {
    backgroundColor: Colors.primaryLight + '22', // Slight transparency for alternating rows
  },
  cell: {
    flex: 1,
    paddingHorizontal: 8,
    textAlign: 'center',
    fontSize: 14,
  },
  headerCell: {
    flex: 1,
    paddingHorizontal: 8,
    paddingVertical: 8,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
    color: Colors.white,
  },
});