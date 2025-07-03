import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useDailyLog } from '../services/DailyLogContext';
import { DatabaseService, Medicine } from '../services/databaseService';
import { Colors } from '../constants/Colors';
import { globalStyles } from '../services/globalstyle';
import { StatusBar } from 'expo-status-bar';

const padTime = (t: string) => {
  const [h, m] = t.split(':');
  return `${h.padStart(2, '0')}:${m.padStart(2, '0')}`;
};

function getMonthMatrix(year: number, month: number) {
  // Returns a 2D array representing the weeks of the month
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const matrix = [];
  let week = [];
  let dayOfWeek = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1; // Monday = 0
  // Fill first week with blanks
  for (let i = 0; i < dayOfWeek; i++) week.push(null);
  for (let d = 1; d <= lastDay.getDate(); d++) {
    week.push(new Date(year, month, d));
    if (week.length === 7) {
      matrix.push(week);
      week = [];
    }
  }
  if (week.length > 0) {
    while (week.length < 7) week.push(null);
    matrix.push(week);
  }
  return matrix;
}

export default function CalendarScreen() {
  const { dailyLogs } = useDailyLog();
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [currentMonth, setCurrentMonth] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), today.getDate());
  });

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

  // Calendar grid helpers
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const monthMatrix = getMonthMatrix(year, month);
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const selectedStr = selectedDate.toISOString().slice(0, 10);
  // Find which days have entries
  const daysWithEntries = new Set(entries.map(e => e.date));

  // Filter entries for selected day
  const selectedEntries = entries.filter(e => e.date === selectedStr);

  // Month navigation
  const goToPrevMonth = () => {
    setCurrentMonth(new Date(year, month - 1, 1));
  };
  const goToNextMonth = () => {
    setCurrentMonth(new Date(year, month + 1, 1));
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <LinearGradient
        colors={["#6a11cb", "#2575fc"]}
        style={styles.gradientBackground}
      >
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
          <View style={styles.headerContainer}>
            <Text style={styles.title}>
              Calendrier des Médicaments
            </Text>
            <Ionicons name="calendar-outline" size={32} color="#fff" style={{ marginLeft: 8 }} />
          </View>
          {/* Month navigation */}
          <View style={styles.monthNavContainer}>
            <TouchableOpacity onPress={goToPrevMonth} style={styles.monthNavBtn}>
              <Ionicons name="chevron-back" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.monthNavText}>
              {currentMonth.toLocaleString('fr-FR', { month: 'long', year: 'numeric' })}
            </Text>
            <TouchableOpacity onPress={goToNextMonth} style={styles.monthNavBtn}>
              <Ionicons name="chevron-forward" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
          {/* Calendar grid */}
          <View style={styles.calendarGridContainer}>
            <View style={styles.weekRow}>
              {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((d, i) => (
                <Text key={i} style={styles.weekDayText}>{d}</Text>
              ))}
            </View>
            {monthMatrix.map((week, wIdx) => (
              <View key={wIdx} style={styles.weekRow}>
                {week.map((date, dIdx) => {
                  if (!date) {
                    return <View key={dIdx} style={styles.dayCell} />;
                  }
                  const dateStr = date.toISOString().slice(0, 10);
                  const isToday = dateStr === todayStr;
                  const isSelected = dateStr === selectedStr;
                  const hasEntry = daysWithEntries.has(dateStr);
                  return (
                    <TouchableOpacity
                      key={dIdx}
                      style={[
                        styles.dayCell,
                        isToday && styles.todayCell,
                        isSelected && styles.selectedCell,
                      ]}
                      onPress={() => setSelectedDate(date)}
                    >
                      <Text style={[
                        styles.dayCellText,
                        isToday && styles.todayCellText,
                        isSelected && styles.selectedCellText,
                      ]}>
                        {date.getDate()}
                      </Text>
                      {hasEntry && <View style={styles.dot} />}
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </View>
          {/* Entries for selected day */}
          <Text style={styles.selectedDayLabel}>
            {selectedDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </Text>
          {selectedEntries.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="information-circle-outline" size={60} color="#b0b0b0" />
              <Text style={styles.emptyText}>Aucune donnée disponible pour ce jour</Text>
            </View>
          ) : (
            <View style={styles.tableCard}>
              <View style={styles.tableHeader}>
                <Text style={[styles.headerCell, { flex: 2 }]}>Médicament</Text>
                <Text style={styles.headerCell}>Heure</Text>
                <Text style={styles.headerCell}>Statut</Text>
              </View>
              {selectedEntries.map((item, idx) => (
                <View
                  key={idx}
                  style={[
                    styles.tableRow,
                    idx % 2 === 0 ? styles.tableRowEven : styles.tableRowOdd,
                  ]}
                >
                  <Text style={[styles.cell, { flex: 2 }]}>{item.medName}</Text>
                  <Text style={styles.cell}>{item.time}</Text>
                  <Ionicons
                    name={item.status ? 'checkmark-circle' : 'close-circle'}
                    size={24}
                    color={item.status ? '#4BB543' : '#FF5252'}
                    style={styles.statusIcon}
                  />
                </View>
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
    padding: 20,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
    marginTop: 10,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    letterSpacing: 1,
    marginRight: 8,
  },
  monthNavContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  monthNavBtn: {
    padding: 8,
    borderRadius: 20,
  },
  monthNavText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginHorizontal: 16,
    letterSpacing: 0.5,
  },
  calendarGridContainer: {
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderRadius: 16,
    padding: 10,
    marginBottom: 18,
    marginHorizontal: 2,
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  weekDayText: {
    flex: 1,
    textAlign: 'center',
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
    marginBottom: 4,
  },
  dayCell: {
    flex: 1,
    aspectRatio: 1,
    margin: 2,
    borderRadius: 10,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  dayCellText: {
    color: '#222',
    fontSize: 16,
    fontWeight: '500',
  },
  todayCell: {
    borderWidth: 2,
    borderColor: '#2575fc',
    backgroundColor: '#e3eefe',
  },
  todayCellText: {
    color: '#2575fc',
    fontWeight: 'bold',
  },
  selectedCell: {
    backgroundColor: '#2575fc',
  },
  selectedCellText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#4BB543',
    position: 'absolute',
    bottom: 7,
    left: '50%',
    marginLeft: -3.5,
  },
  selectedDayLabel: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
    marginVertical: 12,
    letterSpacing: 0.2,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    marginTop: 10,
    marginHorizontal: 10,
  },
  emptyText: {
    marginTop: 18,
    fontSize: 18,
    color: '#b0b0b0',
    textAlign: 'center',
    fontWeight: '500',
  },
  tableCard: {
    borderRadius: 18,
    backgroundColor: '#fff',
    marginTop: 10,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#2575fc',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  tableRowEven: {
    backgroundColor: '#f7faff',
  },
  tableRowOdd: {
    backgroundColor: '#e3eefe',
  },
  cell: {
    flex: 1,
    paddingHorizontal: 8,
    textAlign: 'center',
    fontSize: 15,
    color: '#222',
  },
  headerCell: {
    flex: 1,
    paddingHorizontal: 8,
    paddingVertical: 8,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
  },
  statusIcon: {
    alignSelf: 'center',
  },
});