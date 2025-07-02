import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { DatabaseService, LogService, Medicine, DailyLog } from './databaseService';
import { globalStyles } from './globalstyle';
import { Colors } from '../constants/Colors';
import BottomBar from './BottomBar';

// Helper to normalize a Date object to the start of its day (local time)
const normalizeDateToDayStart = (date: Date): Date => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

// Helper to format date consistently for database keys (YYYY-MM-DD)
const getYYYYMMDD = (date: Date): string => normalizeDateToDayStart(date).toISOString().split('T')[0];

// Helper to get all days in a specific month
const getDaysInMonth = (year: number, month: number) => {
  const date = new Date(year, month, 1);
  const days = [];
  while (date.getMonth() === month) {
    days.push(new Date(date));
    date.setDate(date.getDate() + 1);
  }
  return days;
};

// Helper to arrange days into weeks for the calendar grid (RTL adjusted)
const getCalendarWeeks = (year: number, month: number) => {
  const firstDayOfMonth = new Date(year, month, 1);
  const startingDayIndex = firstDayOfMonth.getDay();
  const daysToPadAtStart = (startingDayIndex + 1) % 7;

  const daysInMonth = getDaysInMonth(year, month);

  const calendarDays: (Date | null)[] = Array(daysToPadAtStart).fill(null);
  calendarDays.push(...daysInMonth);

  const totalCells = Math.ceil(calendarDays.length / 7) * 7;
  while (calendarDays.length < totalCells) {
    calendarDays.push(null);
  }

  const weeks = [];
  for (let i = 0; i < calendarDays.length; i += 7) {
    weeks.push(calendarDays.slice(i, i + 7));
  }
  return weeks;
};

// Extend Medicine type for convenience in rendering
interface MedicineWithDailyStatus extends Medicine {
  takenForSelectedDay: { [time: string]: boolean };
}

export default function CalendarScreen() {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [dailyLogs, setDailyLogs] = useState<{ [date: string]: DailyLog }>({});
  const [loading, setLoading] = useState(true);
  const [displayDate, setDisplayDate] = useState(normalizeDateToDayStart(new Date()));
  const [selectedDayInfo, setSelectedDayInfo] = useState<Date>(normalizeDateToDayStart(new Date()));

  const currentMonth = displayDate.getMonth();
  const currentYear = displayDate.getFullYear();

  // Load all medicines and all daily logs
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const storedMedicines = await DatabaseService.getMedicines();
      const storedDailyLogs = await LogService.getAllDailyLogs();
      setMedicines(storedMedicines);
      setDailyLogs(storedDailyLogs);
    } catch (error) {
      console.error("Failed to load data:", error);
      Alert.alert('خطأ', 'فشل في تحميل بيانات الأدوية والسجلات اليومية.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Use useFocusEffect to reload data whenever the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadData();
      setSelectedDayInfo(normalizeDateToDayStart(new Date()));
      return () => {};
    }, [loadData])
  );

  // This function updates the DailyLog when a medicine is marked as taken/untaken
  const handleTakeMedicine = async (medicineId: number, time: string, date: Date) => {
    const medicine = medicines.find(m => m.id === medicineId);
    if (!medicine) return;

    const dateString = getYYYYMMDD(date);
    const currentDailyLog = dailyLogs[dateString] || { date: dateString, taken: {} };

    const medicineLogForDate: { [key: string]: boolean } = currentDailyLog.taken?.[medicineId]?.takenTimes || {};
    const updatedMedicineLogForDate = {
      ...medicineLogForDate,
      [time]: !medicineLogForDate[time],
    };

    const updatedDailyLog: DailyLog = {
      ...currentDailyLog,
      taken: {
        ...currentDailyLog.taken,
        [medicineId]: {
          name: medicine.name,
          takenTimes: updatedMedicineLogForDate,
        },
      },
    };

    try {
      await LogService.saveDailyLog(dateString, updatedDailyLog);
      setDailyLogs(prevLogs => ({
        ...prevLogs,
        [dateString]: updatedDailyLog,
      }));
    } catch (error) {
      console.error('Failed to update medicine status:', error);
      Alert.alert('خطأ', 'فشل في تحديث حالة الدواء في السجل اليومي.');
    }
  };

  // Calendar Navigation
  const goToNextMonth = () => {
    const newDate = normalizeDateToDayStart(new Date(displayDate.getFullYear(), displayDate.getMonth() + 1, 1));
    setDisplayDate(newDate);
    setSelectedDayInfo(newDate);
  };

  const goToPreviousMonth = () => {
    const newDate = normalizeDateToDayStart(new Date(displayDate.getFullYear(), displayDate.getMonth() - 1, 1));
    setDisplayDate(newDate);
    setSelectedDayInfo(newDate);
  };

  // Determine daily status
  const getDailyStatus = useCallback((date: Date | null): 'all_taken' | 'some_forgotten' | 'all_forgotten' | 'no_scheduled' | 'future' => {
    if (!date) return 'no_scheduled';

    const normalizedToday = normalizeDateToDayStart(new Date());
    const normalizedCheckDate = normalizeDateToDayStart(date);

    if (normalizedCheckDate.getTime() > normalizedToday.getTime()) {
      return 'future';
    }

    const dateString = getYYYYMMDD(normalizedCheckDate);
    const dailyLogForDate = dailyLogs[dateString];

    let totalScheduledTimes = 0;
    let totalTakenTimes = 0;

    medicines.forEach(med => {
      if (med.exactTimes && med.exactTimes.length > 0) {
        totalScheduledTimes += med.exactTimes.length;
        const medTakenTimes = dailyLogForDate?.taken?.[med.id]?.takenTimes || {};
        med.exactTimes.forEach(time => {
          if (medTakenTimes[time]) totalTakenTimes++;
        });
      }
    });

    if (totalScheduledTimes === 0) return 'no_scheduled';
    if (totalTakenTimes === totalScheduledTimes) return 'all_taken';
    if (totalTakenTimes > 0) return 'some_forgotten';
    return 'all_forgotten';
  }, [medicines, dailyLogs]);

  // Memoized calendar data
  const calendarWeeks = useMemo(() => {
    return getCalendarWeeks(currentYear, currentMonth);
  }, [currentYear, currentMonth]);

  // Filter and enrich medicines for selected day
  const medicinesForSelectedDay: MedicineWithDailyStatus[] = useMemo(() => {
    const selectedDateString = getYYYYMMDD(selectedDayInfo);
    const dailyLogForSelectedDay = dailyLogs[selectedDateString];

    return medicines
      .filter(med => med.exactTimes && med.exactTimes.length > 0)
      .map(med => {
        const takenForSelectedDay = dailyLogForSelectedDay?.taken?.[med.id]?.takenTimes || {};
        return {
          ...med,
          takenForSelectedDay,
          exactTimes: med.exactTimes.sort((a, b) => {
            const [ah, am] = a.split(':').map(Number);
            const [bh, bm] = b.split(':').map(Number);
            return ah === bh ? am - bm : ah - bh;
          })
        };
      });
  }, [medicines, selectedDayInfo, dailyLogs]);

  // Determine status for selected day
  const selectedDayStatus = useMemo(() => getDailyStatus(selectedDayInfo), [selectedDayInfo, getDailyStatus]);

  const getStatusDescription = (status: ReturnType<typeof getDailyStatus>) => {
    switch (status) {
      case 'all_taken': return { text: 'جميع الأدوية تم تناولها لهذا اليوم! 🎉', color: Colors.success };
      case 'some_forgotten': return { text: 'لقد نسيت بعض الأدوية لهذا اليوم. ⚠️', color: Colors.warning };
      case 'all_forgotten': return { text: 'لقد نسيت جميع الأدوية لهذا اليوم. ❌', color: Colors.error };
      case 'no_scheduled': return { text: 'لا توجد أدوية مجدولة لهذا اليوم.', color: Colors.textTertiary };
      case 'future': return { text: 'هذا يوم في المستقبل.', color: Colors.textSecondary };
      default: return { text: 'حالة غير معروفة.', color: Colors.textSecondary };
    }
  };

  const { text: statusText, color: statusColor } = getStatusDescription(selectedDayStatus);

  // Jump to today function
  const jumpToToday = () => {
    const today = normalizeDateToDayStart(new Date());
    setDisplayDate(today);
    setSelectedDayInfo(today);
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient
        colors={[Colors.primaryDark, Colors.primary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerNav}>
          <TouchableOpacity onPress={goToPreviousMonth} style={styles.navButton}>
            <Ionicons name="chevron-forward" size={24} color={Colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {displayDate.toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' })}
          </Text>
          <TouchableOpacity onPress={goToNextMonth} style={styles.navButton}>
            <Ionicons name="chevron-back" size={24} color={Colors.white} />
          </TouchableOpacity>
        </View>
        <Text style={styles.headerSubtitle}>جدولك اليومي والصحي</Text>

        <TouchableOpacity
          onPress={jumpToToday}
          style={styles.todayButton}
        >
          <Text style={styles.todayButtonText}>اليوم</Text>
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Legend */}
        <View style={styles.legendContainer}>
          <View style={styles.legendItem}>
            <View style={[styles.legendColorBox, { backgroundColor: Colors.successLight }]} />
            <Text style={styles.legendText}>جميع الأدوية مأخوذة</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColorBox, { backgroundColor: Colors.warningLight }]} />
            <Text style={styles.legendText}>بعض الأدوية نسيت</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColorBox, { backgroundColor: Colors.errorLight }]} />
            <Text style={styles.legendText}>جميع الأدوية نسيت</Text>
          </View>
          <View style={styles.legendItem}>
          </View>
        </View>

        {/* Calendar Grid */}
        <View style={styles.calendarContainer}>
          <View style={styles.weekdaysHeader}>
            {['س', 'ح', 'ن', 'ث', 'ر', 'خ', 'ج'].map((day, index) => (
              <Text key={index} style={styles.weekdayText}>{day}</Text>
            ))}
          </View>

          <View style={styles.calendarGrid}>
            {calendarWeeks.map((week, weekIndex) => (
              <View key={weekIndex} style={styles.weekRow}>
                {week.map((day, dayIndex) => {
                  const normalizedDay = day ? normalizeDateToDayStart(day) : null;
                  const normalizedSelectedDay = normalizeDateToDayStart(selectedDayInfo);
                  const normalizedToday = normalizeDateToDayStart(new Date());

                  const dayStatus = getDailyStatus(day);
                  const isSelected = normalizedDay && normalizedDay.getTime() === normalizedSelectedDay.getTime();
                  const isToday = normalizedDay && normalizedDay.getTime() === normalizedToday.getTime();

                  let backgroundColor;
                  switch (dayStatus) {
                    case 'all_taken': backgroundColor = Colors.successLight; break;
                    case 'some_forgotten': backgroundColor = Colors.warningLight; break;
                    case 'all_forgotten': backgroundColor = Colors.errorLight; break;
                    case 'future': backgroundColor = Colors.background; break;
                    default: backgroundColor = Colors.cardBackground;
                  }

                  let textColor = Colors.textPrimary;
                  if (dayStatus === 'all_taken') textColor = Colors.success;
                  else if (dayStatus === 'some_forgotten') textColor = Colors.warning;
                  else if (dayStatus === 'all_forgotten') textColor = Colors.error;
                  else if (dayStatus === 'future') textColor = Colors.textSecondary;

                  if (isSelected) {
                    backgroundColor = Colors.primary;
                    textColor = Colors.white;
                  } else if (isToday) {
                    backgroundColor = Colors.primaryLight;
                    textColor = Colors.white;
                  }

                  return (
                    <TouchableOpacity
                      key={dayIndex}
                      style={[
                        styles.dayCell,
                        { backgroundColor },
                        isToday && styles.todayCellBorder,
                        isSelected && styles.selectedCellBorder,
                      ]}
                      onPress={() => day && setSelectedDayInfo(normalizeDateToDayStart(day))}
                      disabled={!day}
                    >
                      {day && (
                        <Text style={[styles.dayCellText, { color: textColor }]}>
                          {day.getDate()}
                        </Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </View>
        </View>

        {/* Status Description */}
        <View style={[styles.statusDescriptionContainer, { backgroundColor: statusColor }]}>
          <Text style={styles.statusDescriptionText}>
            {statusText}
          </Text>
        </View>

        {/* Medicine Schedule List */}
        <View style={styles.scheduleListContainer}>
          {loading ? (
            <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 50 }} />
          ) : medicinesForSelectedDay.length === 0 ? (
            <View style={styles.emptyStateContainer}>
              <Ionicons name="alarm-outline" size={60} color={Colors.textTertiary} />
              <Text style={styles.emptyStateText}>لا توجد أدوية مجدولة لهذا اليوم.</Text>
              <Text style={styles.emptyStateSubText}>
                يمكنك إضافة دواء جديد لتذكيرك به.
              </Text>
            </View>
          ) : (
            medicinesForSelectedDay.map(med => {
              const isToday = getYYYYMMDD(selectedDayInfo) === getYYYYMMDD(normalizeDateToDayStart(new Date()));
              return (
                <View key={med.id} style={styles.medicineScheduleCard}>
                  <View style={styles.medicineScheduleInfo}>
                    <Text style={styles.medicineScheduleName}>{med.name}</Text>
                    <Text style={styles.medicineScheduleQuantity}>الكمية: {med.quantity}</Text>
                  </View>
                  <View style={styles.medicineScheduleTimes}>
                    {med.exactTimes.map(time => {
                      const isTaken = med.takenForSelectedDay[time];
                      return (
                        <TouchableOpacity
                          key={time}
                          style={[
                            styles.scheduleTimeChip,
                            isTaken && styles.scheduleTimeChipTaken,
                            !isToday && styles.scheduleTimeChipDisabled
                          ]}
                          onPress={() => handleTakeMedicine(med.id, time, selectedDayInfo)}
                          disabled={!isToday}
                        >
                          <Ionicons
                            name={isTaken ? "checkmark-circle" : "time-outline"}
                            size={16}
                            color={isTaken ? Colors.white : Colors.primary}
                            style={{ marginRight: 5 }}
                          />
                          <Text style={[styles.scheduleTimeText, isTaken && styles.scheduleTimeTextTaken]}>{time}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      <BottomBar currentRoute="calendar" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerNav: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  navButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 22,
    color: Colors.white,
    textAlign: 'center',
    flex: 1,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'right',
    marginTop: 5,
  },
  todayButton: {
    position: 'absolute',
    left: 20,
    top: 15,
    backgroundColor: Colors.primaryLight,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 20,
    elevation: 2,
  },
  todayButtonText: {
    fontSize: 14,
    color: Colors.white,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  legendContainer: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-around',
    paddingVertical: 10,
    backgroundColor: Colors.cardBackground,
    marginHorizontal: 15,
    borderRadius: 10,
    marginTop: 10,
    marginBottom: 10,
  },
  legendItem: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
  },
  legendColorBox: {
    width: 15,
    height: 15,
    borderRadius: 3,
    marginHorizontal: 5,
  },
  legendText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  calendarContainer: {
    backgroundColor: Colors.cardBackground,
    marginHorizontal: 15,
    borderRadius: 15,
    padding: 15,
    elevation: 5,
  },
  weekdaysHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-around',
    marginBottom: 10,
  },
  weekdayText: {
    fontSize: 14,
    color: Colors.textSecondary,
    flex: 1,
    textAlign: 'center',
  },
  calendarGrid: {},
  weekRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-around',
    marginBottom: 5,
  },
  dayCell: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    margin: 2,
  },
  dayCellText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  todayCellBorder: {
    borderWidth: 2,
    borderColor: Colors.primaryLight,
  },
  selectedCellBorder: {
    borderWidth: 2,
    borderColor: Colors.white,
    elevation: 3,
  },
  statusDescriptionContainer: {
    marginHorizontal: 15,
    marginTop: 15,
    borderRadius: 15,
    padding: 15,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
  },
  statusDescriptionText: {
    fontSize: 16,
    color: Colors.white,
    textAlign: 'center',
  },
  scheduleListContainer: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
  },
  medicineScheduleCard: {
    flexDirection: 'row-reverse',
    backgroundColor: Colors.cardBackground,
    borderRadius: 15,
    padding: 15,
    marginBottom: 10,
    elevation: 3,
    alignItems: 'center',
  },
  medicineScheduleInfo: {
    flex: 1,
    marginRight: 10,
  },
  medicineScheduleName: {
    fontSize: 17,
    color: Colors.textPrimary,
    textAlign: 'right',
  },
  medicineScheduleQuantity: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'right',
    marginTop: 2,
  },
  medicineScheduleTimes: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    maxWidth: '50%',
  },
  scheduleTimeChip: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: Colors.lightGrey,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
    marginLeft: 8,
    marginTop: 5,
  },
  scheduleTimeChipTaken: {
    backgroundColor: Colors.success,
  },
  scheduleTimeChipDisabled: {
    opacity: 0.6,
  },
  scheduleTimeText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: 'bold',
  },
  scheduleTimeTextTaken: {
    color: Colors.white,
  },
  emptyStateContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyStateText: {
    fontSize: 20,
    color: Colors.textSecondary,
    marginTop: 15,
  },
  emptyStateSubText: {
    fontSize: 14,
    color: Colors.textTertiary,
    textAlign: 'center',
    marginTop: 5,
  },
});