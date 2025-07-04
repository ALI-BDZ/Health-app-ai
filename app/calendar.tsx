import React, { useMemo, useState, useEffect } from 'react';
import { Animated, Dimensions, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../constants/Colors';
import { useDailyLog } from '../services/DailyLogContext';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import BottomBar from './BottomBar';
import { globalStyles } from '../services/globalstyle';

const { width } = Dimensions.get('window');

const getDayName = (dateString: string) => {
  const date = new Date(dateString);
  const daysOfWeek = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  return daysOfWeek[date.getDay()];
};

export default function CalendarScreen() {
  const { dailyLogs } = useDailyLog();
  const [sortBy, setSortBy] = useState<'date' | 'medicine' | 'time' | 'status'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'taken' | 'missed'>('all');
  const [animatedValue] = useState(new Animated.Value(0));
  const [selectedDay, setSelectedDay] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<number | 'all'>('all');
  const [selectedYear, setSelectedYear] = useState<number | 'all'>('all');
  const [showDayModal, setShowDayModal] = useState(false);
  const [showMonthModal, setShowMonthModal] = useState(false);
  const [showYearModal, setShowYearModal] = useState(false);

  const daysOfWeek = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  const months = [
    'جانفي', 'فيفري', 'مارس', 'أفريل', 'ماي', 'جوان',
    'جويلية', 'أوت', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
  ];

  const entries = useMemo(() => {
    const result: { date: string; medName: string; time: string; status: boolean }[] = [];
    Object.entries(dailyLogs).forEach(([date, log]) => {
      Object.entries(log.taken).forEach(([medId, medLog]) => {
        Object.entries(medLog.takenTimes).forEach(([time, status]) => {
          result.push({ date, medName: medLog.name, time, status });
        });
      });
    });
    return result;
  }, [dailyLogs]);

  const uniqueEntries = useMemo(() => {
    return entries.filter((entry, index, self) =>
      index === self.findIndex(e =>
        e.date === entry.date &&
        e.medName === entry.medName &&
        e.time === entry.time
      )
    );
  }, [entries]);

  const filteredEntries = useMemo(() => {
    return uniqueEntries.filter(entry => {
      const date = new Date(entry.date);
      const dayOfWeek = date.getDay();
      const month = date.getMonth();
      const year = date.getFullYear();
      if (selectedDay !== 'all' && daysOfWeek[dayOfWeek] !== selectedDay) return false;
      if (selectedMonth !== 'all' && month !== selectedMonth) return false;
      if (selectedYear !== 'all' && year !== selectedYear) return false;
      if (selectedFilter === 'taken') return entry.status;
      if (selectedFilter === 'missed') return !entry.status;
      return true;
    });
  }, [uniqueEntries, selectedDay, selectedMonth, selectedYear, selectedFilter]);

  const sortedEntries = useMemo(() => {
    return [...filteredEntries].sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'date': comparison = a.date.localeCompare(b.date); break;
        case 'medicine': comparison = a.medName.localeCompare(b.medName); break;
        case 'time': comparison = a.time.localeCompare(b.time); break;
        case 'status': comparison = Number(a.status) - Number(b.status); break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [filteredEntries, sortBy, sortOrder]);

  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, []);

  const handleSort = (column: 'date' | 'medicine' | 'time' | 'status') => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  const getAvailableYears = () => {
    const years = new Set<number>();
    Object.keys(dailyLogs).forEach(dateStr => {
      const year = new Date(dateStr).getFullYear();
      years.add(year);
    });
    return Array.from(years).sort((a, b) => b - a);
  };

  const getSortIcon = (column: 'date' | 'medicine' | 'time' | 'status') => {
    if (sortBy !== column) return 'swap-vertical-outline';
    return sortOrder === 'asc' ? 'arrow-up' : 'arrow-down';
  };

  const resetFilters = () => {
    setSelectedDay('all');
    setSelectedMonth('all');
    setSelectedYear('all');
    setSelectedFilter('all');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    if (date.toDateString() === today.toDateString()) return 'اليوم';
    if (date.toDateString() === yesterday.toDateString()) return 'أمس';
    return date.toLocaleDateString('ar-AR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit'
    });
  };

  const getStatusStats = () => {
    const total = uniqueEntries.length;
    const taken = uniqueEntries.filter(e => e.status).length;
    const missed = total - taken;
    const percentage = total > 0 ? Math.round((taken / total) * 100) : 0;
    return { total, taken, missed, percentage };
  };

  const stats = getStatusStats();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.background}>
        <LinearGradient
          colors={[Colors.primary, Colors.primaryDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.topBar}
        >
          <View style={styles.topBarContent}>
            <Ionicons name="calendar-outline" size={28} color={Colors.white} />
            <Text style={styles.topBarTitle}>تتبع مسار أخذ الأدوية</Text>
          </View>
        </LinearGradient>
        <ScrollView style={styles.container} showsVerticalScrollIndicator={true}>
          <Animated.View style={[styles.headerContainer, { opacity: animatedValue, transform: [{ translateY: animatedValue.interpolate({ inputRange: [0, 1], outputRange: [-50, 0] }) }] }]}>
            <View style={styles.headerContent}>

              <View style={styles.statsContainer}>
                <View style={styles.statCard}>
                  <Text style={[globalStyles.text, styles.statNumber]}>{stats.percentage}%</Text>
                  <Text style={[globalStyles.text, styles.statLabel]}>الالتزام</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={[globalStyles.text, styles.statNumber, { color: Colors.success }]}>{stats.taken}</Text>
                  <Text style={[globalStyles.text, styles.statLabel]}>مأخوذ</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={[globalStyles.text, styles.statNumber, { color: Colors.error }]}>{stats.missed}</Text>
                  <Text style={[globalStyles.text, styles.statLabel]}>فائتة</Text>
                </View>
              </View>
            </View>
          </Animated.View>
          <Animated.View style={[styles.selectorContainer, { opacity: animatedValue, transform: [{ translateY: animatedValue.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) }] }]}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.selectorScroll} contentContainerStyle={styles.selectorContent}>
              <TouchableOpacity style={[styles.selectorButton, selectedDay !== 'all' && styles.selectorButtonActive]} onPress={() => setShowDayModal(true)}>
                <Ionicons name="calendar-outline" size={16} color={selectedDay !== 'all' ? Colors.white : Colors.primary} />
                <Text style={[globalStyles.text, styles.selectorButtonText, selectedDay !== 'all' && styles.selectorButtonTextActive]}>
                  {selectedDay === 'all' ? 'اليوم' : selectedDay}
                </Text>
                <Ionicons name="chevron-down" size={14} color={selectedDay !== 'all' ? Colors.white : Colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.selectorButton, selectedMonth !== 'all' && styles.selectorButtonActive]} onPress={() => setShowMonthModal(true)}>
                <Ionicons name="calendar-outline" size={16} color={selectedMonth !== 'all' ? Colors.white : Colors.primary} />
                <Text style={[globalStyles.text, styles.selectorButtonText, selectedMonth !== 'all' && styles.selectorButtonTextActive]}>
                  {selectedMonth === 'all' ? 'الشهر' : months[selectedMonth]}
                </Text>
                <Ionicons name="chevron-down" size={14} color={selectedMonth !== 'all' ? Colors.white : Colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.selectorButton, selectedYear !== 'all' && styles.selectorButtonActive]} onPress={() => setShowYearModal(true)}>
                <Ionicons name="calendar-outline" size={16} color={selectedYear !== 'all' ? Colors.white : Colors.primary} />
                <Text style={[globalStyles.text, styles.selectorButtonText, selectedYear !== 'all' && styles.selectorButtonTextActive]}>
                  {selectedYear === 'all' ? 'السنة' : selectedYear}
                </Text>
                <Ionicons name="chevron-down" size={14} color={selectedYear !== 'all' ? Colors.white : Colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.resetButton} onPress={resetFilters}>
                <Ionicons name="refresh-outline" size={16} color={Colors.error} />
                <Text style={[globalStyles.text, styles.resetButtonText]}>إعادة</Text>
              </TouchableOpacity>
            </ScrollView>
          </Animated.View>
          <Animated.View style={[styles.filterContainer, { opacity: animatedValue, transform: [{ translateY: animatedValue.interpolate({ inputRange: [0, 1], outputRange: [50, 0] }) }] }]}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterContent}>
              <TouchableOpacity style={[styles.filterButton, selectedFilter === 'all' && styles.filterButtonActive]} onPress={() => setSelectedFilter('all')}>
                <Ionicons name="list-outline" size={16} color={selectedFilter === 'all' ? Colors.white : Colors.primary} />
                <Text style={[globalStyles.text, styles.filterButtonText, selectedFilter === 'all' && styles.filterButtonTextActive]}>
                  الكل ({uniqueEntries.length})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.filterButton, selectedFilter === 'taken' && styles.filterButtonActive]} onPress={() => setSelectedFilter('taken')}>
                <Ionicons name="checkmark-circle-outline" size={16} color={selectedFilter === 'taken' ? Colors.white : Colors.success} />
                <Text style={[globalStyles.text, styles.filterButtonText, selectedFilter === 'taken' && styles.filterButtonTextActive]}>
                  مأخوذ ({stats.taken})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.filterButton, selectedFilter === 'missed' && styles.filterButtonActive]} onPress={() => setSelectedFilter('missed')}>
                <Ionicons name="close-circle-outline" size={16} color={selectedFilter === 'missed' ? Colors.white : Colors.error} />
                <Text style={[globalStyles.text, styles.filterButtonText, selectedFilter === 'missed' && styles.filterButtonTextActive]}>
                  فائتة ({stats.missed})
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </Animated.View>
          {sortedEntries.length === 0 ? (
            <Animated.View style={[styles.emptyContainer, { opacity: animatedValue, transform: [{ scale: animatedValue.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) }] }]}>
              <View style={styles.emptyIconContainer}>
                <Ionicons name="information-circle-outline" size={64} color={Colors.textSecondary} />
              </View>
              <Text style={[globalStyles.text, styles.emptyText]}>
                لا توجد بيانات متاحة
              </Text>
              <Text style={[globalStyles.text, styles.emptySubText]}>
                ستظهر البيانات هنا بمجرد بدء تناول الأدوية
              </Text>
            </Animated.View>
          ) : (
            <Animated.View style={[styles.tableContainer, { opacity: animatedValue, transform: [{ translateY: animatedValue.interpolate({ inputRange: [0, 1], outputRange: [100, 0] }) }] }]}>
              <ScrollView horizontal showsHorizontalScrollIndicator={true} style={styles.horizontalScroll}>
                <View style={styles.table}>
                  <View style={styles.tableHeader}>
                    <TouchableOpacity style={[styles.headerCell, { flex: 2 }]} onPress={() => handleSort('date')}>
                      <Text style={[globalStyles.text, styles.headerCellText]}>التاريخ</Text>
                      <Ionicons name={getSortIcon('date')} size={14} color={Colors.white} />
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.headerCell, { flex: 2.5 }]} onPress={() => handleSort('medicine')}>
                      <Text style={[globalStyles.text, styles.headerCellText]}>الدواء</Text>
                      <Ionicons name={getSortIcon('medicine')} size={14} color={Colors.white} />
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.headerCell, { flex: 1.5 }]} onPress={() => handleSort('time')}>
                      <Text style={[globalStyles.text, styles.headerCellText]}>الوقت</Text>
                      <Ionicons name={getSortIcon('time')} size={14} color={Colors.white} />
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.headerCell, { flex: 1.5 }]} onPress={() => handleSort('status')}>
                      <Text style={[globalStyles.text, styles.headerCellText]}>الحالة</Text>
                      <Ionicons name={getSortIcon('status')} size={14} color={Colors.white} />
                    </TouchableOpacity>
                  </View>
                  {sortedEntries.map((item, idx) => (
                    <TouchableOpacity key={`${item.date}-${item.medName}-${item.time}`} style={[styles.tableRow, idx % 2 === 0 ? styles.tableRowEven : styles.tableRowOdd]} activeOpacity={0.7}>
                      <View style={[styles.cell, { flex: 2 }]}>
                        <Text style={[globalStyles.text, styles.cellText]}>{formatDate(item.date)}</Text>
                        <Text style={[globalStyles.text, styles.dayText]}>{getDayName(item.date)}</Text>
                      </View>
                      <View style={[styles.cell, { flex: 2.5 }]}>
                        <View style={styles.medicineContainer}>
                          <View style={styles.medicineIcon}>
                            <Ionicons name="medical-outline" size={12} color={Colors.primary} />
                          </View>
                          <Text style={[globalStyles.text, styles.cellText]} numberOfLines={1}>
                            {item.medName}
                          </Text>
                        </View>
                      </View>
                      <View style={[styles.cell, { flex: 1.5 }]}>
                        <View style={styles.timeContainer}>
                          <Ionicons name="time-outline" size={12} color={Colors.textSecondary} />
                          <Text style={[globalStyles.text, styles.cellText]}>{item.time}</Text>
                        </View>
                      </View>
                      <View style={[styles.cell, { flex: 1.5 }]}>
                        <View style={[styles.statusContainer, item.status ? styles.statusTaken : styles.statusMissed]}>
                          <Ionicons name={item.status ? 'checkmark-circle' : 'close-circle'} size={16} color={item.status ? Colors.success : Colors.error} />
                          <Text style={[globalStyles.text, styles.statusText, { color: item.status ? Colors.success : Colors.error }]}>
                            {item.status ? 'مأخوذ' : 'مفوّت'}
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </Animated.View>
          )}
        </ScrollView>
        <Modal visible={showDayModal} transparent={true} animationType="fade" onRequestClose={() => setShowDayModal(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={[globalStyles.title, styles.modalTitle]}>اختر يومًا</Text>
              <ScrollView style={styles.modalScroll}>
                <TouchableOpacity style={[styles.modalOption, selectedDay === 'all' && styles.modalOptionActive]} onPress={() => { setSelectedDay('all'); setShowDayModal(false); }}>
                  <Text style={[globalStyles.text, styles.modalOptionText, selectedDay === 'all' && styles.modalOptionTextActive]}>كل الأيام</Text>
                </TouchableOpacity>
                {daysOfWeek.map((day, index) => (
                  <TouchableOpacity key={index} style={[styles.modalOption, selectedDay === day && styles.modalOptionActive]} onPress={() => { setSelectedDay(day); setShowDayModal(false); }}>
                    <Text style={[globalStyles.text, styles.modalOptionText, selectedDay === day && styles.modalOptionTextActive]}>{day}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TouchableOpacity style={styles.modalCloseButton} onPress={() => setShowDayModal(false)}>
                <Text style={[globalStyles.text, styles.modalCloseText]}>إغلاق</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
        <Modal visible={showMonthModal} transparent={true} animationType="fade" onRequestClose={() => setShowMonthModal(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={[globalStyles.title, styles.modalTitle]}>اختر شهرًا</Text>
              <ScrollView style={styles.modalScroll}>
                <TouchableOpacity style={[styles.modalOption, selectedMonth === 'all' && styles.modalOptionActive]} onPress={() => { setSelectedMonth('all'); setShowMonthModal(false); }}>
                  <Text style={[globalStyles.text, styles.modalOptionText, selectedMonth === 'all' && styles.modalOptionTextActive]}>كل الشهور</Text>
                </TouchableOpacity>
                {months.map((month, index) => (
                  <TouchableOpacity key={index} style={[styles.modalOption, selectedMonth === index && styles.modalOptionActive]} onPress={() => { setSelectedMonth(index); setShowMonthModal(false); }}>
                    <Text style={[globalStyles.text, styles.modalOptionText, selectedMonth === index && styles.modalOptionTextActive]}>{month}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TouchableOpacity style={styles.modalCloseButton} onPress={() => setShowMonthModal(false)}>
                <Text style={[globalStyles.text, styles.modalCloseText]}>إغلاق</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
        <Modal visible={showYearModal} transparent={true} animationType="fade" onRequestClose={() => setShowYearModal(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={[globalStyles.title, styles.modalTitle]}>اختر سنة</Text>
              <ScrollView style={styles.modalScroll}>
                <TouchableOpacity style={[styles.modalOption, selectedYear === 'all' && styles.modalOptionActive]} onPress={() => { setSelectedYear('all'); setShowYearModal(false); }}>
                  <Text style={[globalStyles.text, styles.modalOptionText, selectedYear === 'all' && styles.modalOptionTextActive]}>كل السنوات</Text>
                </TouchableOpacity>
                {getAvailableYears().map((year) => (
                  <TouchableOpacity key={year} style={[styles.modalOption, selectedYear === year && styles.modalOptionActive]} onPress={() => { setSelectedYear(year); setShowYearModal(false); }}>
                    <Text style={[globalStyles.text, styles.modalOptionText, selectedYear === year && styles.modalOptionTextActive]}>{year}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TouchableOpacity style={styles.modalCloseButton} onPress={() => setShowYearModal(false)}>
                <Text style={[globalStyles.text, styles.modalCloseText]}>إغلاق</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
      <BottomBar currentRoute="calendar" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  background: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  topBar: {
    height: 60,
    justifyContent: 'center',
    alignItems: 'center', // Added to center content vertically
    paddingHorizontal: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  topBarContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center', // Added to center content horizontally
    width: '100%', // Ensure full width
  },
  topBarTitle: {
    fontSize: 24,
    color: Colors.white,
    marginLeft: 12,
    textAlign: 'center', // Center text
    ...globalStyles.text, // Applied global font style
  },
  container: {
    flex: 1,
    padding: 16,
  },
  headerContainer: {
    marginBottom: 20,
  },
  headerContent: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primaryLight + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.primary,
    flex: 1,
    textAlign: 'right',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statCard: {
    alignItems: 'center',
    padding: 12,
    backgroundColor: Colors.background,
    borderRadius: 12,
    minWidth: 80,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.primary,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
    fontWeight: '500',
  },
  selectorContainer: {
    marginBottom: 16,
  },
  selectorScroll: {
    flexGrow: 0,
  },
  selectorContent: {
    paddingVertical: 4,
  },
  selectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  selectorButtonActive: {
    backgroundColor: Colors.primary,
  },
  selectorButtonText: {
    marginLeft: 4,
    marginRight: 4,
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
  },
  selectorButtonTextActive: {
    color: Colors.white,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.error + '30',
    marginLeft: 4,
  },
  resetButtonText: {
    marginLeft: 4,
    fontSize: 13,
    fontWeight: '600',
    color: Colors.error,
  },
  filterContainer: {
    marginBottom: 20,
  },
  filterScroll: {
    flexGrow: 0,
  },
  filterContent: {
    paddingVertical: 4,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 25,
    marginRight: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  filterButtonActive: {
    backgroundColor: Colors.primary,
  },
  filterButtonText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  filterButtonTextActive: {
    color: Colors.white,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    backgroundColor: Colors.white,
    borderRadius: 16,
    marginTop: 20,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyText: {
    fontSize: 18,
    color: Colors.textSecondary,
    textAlign: 'center',
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 20,
  },
  tableContainer: {
    marginBottom: 20,
  },
  horizontalScroll: {
    flex: 1,
  },
  table: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    minWidth: width - 32,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: Colors.primary,
    paddingVertical: 16,
  },
  headerCell: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  headerCellText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.white,
    marginRight: 4,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border + '30',
    minWidth: width - 32,
  },
  tableRowEven: {
    backgroundColor: Colors.white,
  },
  tableRowOdd: {
    backgroundColor: Colors.background,
  },
  cell: {
    paddingHorizontal: 8,
    justifyContent: 'center',
  },
  cellText: {
    fontSize: 13,
    color: Colors.text,
    fontWeight: '500',
    textAlign: 'center',
  },
  dayText: {
    fontSize: 10,
    color: Colors.textSecondary,
    fontWeight: '400',
    marginTop: 2,
    textAlign: 'center',
  },
  medicineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  medicineIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.primaryLight + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusTaken: {
    backgroundColor: Colors.success + '15',
  },
  statusMissed: {
    backgroundColor: Colors.error + '15',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 20,
    width: width * 0.8,
    maxHeight: '70%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary,
    textAlign: 'center',
    marginBottom: 20,
  },
  modalScroll: {
    maxHeight: 300,
  },
  modalOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 4,
  },
  modalOptionActive: {
    backgroundColor: Colors.primary,
  },
  modalOptionText: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text,
    textAlign: 'right',
  },
  modalOptionTextActive: {
    color: Colors.white,
  },
  modalCloseButton: {
    backgroundColor: Colors.background,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 16,
    alignItems: 'center',
  },
  modalCloseText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
  },
});