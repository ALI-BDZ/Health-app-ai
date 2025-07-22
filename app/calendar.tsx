import React, { useMemo, useState, useEffect } from 'react';
import { Animated, Dimensions, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../constants/Colors';
import { useDailyLog } from '../services/DailyLogContext';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import BottomBar from './BottomBar';
import { globalStyles } from '../services/globalstyle';
import { LogService } from '../services/databaseService'; // Assuming LogService is in database.ts

Dimensions.get('window');

const getDayName = (dateString: string) => {
  const date = new Date(dateString);
  const daysOfWeek = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  return daysOfWeek[date.getDay()];
};

export default function CalendarScreen() {
  // Assume refreshLogs is exposed from your context to reload data after deletion
  const { dailyLogs, refreshDailyLogs } = useDailyLog();
  const [sortBy, setSortBy] = useState<'date' | 'medicine' | 'time' | 'status'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'taken' | 'missed'>('all');
  const [animatedValue] = useState(new Animated.Value(0));
  const [selectedDay, setSelectedDay] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<number | 'all'>('all');
  const [selectedYear, setSelectedYear] = useState<number | 'all'>('all');

  // Modal visibility states
  const [showDayModal, setShowDayModal] = useState(false);
  const [, setShowMonthModal] = useState(false);
  const [, setShowYearModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // State for delete modal
  const [deleteMonth, setDeleteMonth] = useState<number>(new Date().getMonth());
  const [deleteYear, setDeleteYear] = useState<number>(new Date().getFullYear());


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
  }, [uniqueEntries, selectedDay, daysOfWeek, selectedMonth, selectedYear, selectedFilter]);

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
  }, [animatedValue]);

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
  
  const handleDeleteByMonth = async () => {
    const monthName = months[deleteMonth];
    Alert.alert(
      `حذف سجلات ${monthName} ${deleteYear}`,
      'هل أنت متأكد؟ لا يمكن التراجع عن هذا الإجراء.',
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'حذف',
          style: 'destructive',
          onPress: async () => {
            try {
              // Call the new, efficient function instead of looping
              await LogService.deleteLogsForMonth(deleteMonth, deleteYear);

              // Refresh the UI by fetching the updated logs
              if (refreshDailyLogs) {
                refreshDailyLogs();
              }

              setShowDeleteModal(false);
              Alert.alert('نجاح', `تم حذف جميع سجلات شهر ${monthName} ${deleteYear}.`);
            } catch (error) {
              console.error("Failed to delete logs for month:", error);
              Alert.alert('خطأ', 'فشل حذف السجلات. يرجى المحاولة مرة أخرى.');
            }
          },
        },
      ]
    );
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
        <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 80 }} showsVerticalScrollIndicator={true}>
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
              </TouchableOpacity>
              <TouchableOpacity style={[styles.selectorButton, selectedMonth !== 'all' && styles.selectorButtonActive]} onPress={() => setShowMonthModal(true)}>
                <Ionicons name="calendar-outline" size={16} color={selectedMonth !== 'all' ? Colors.white : Colors.primary} />
                <Text style={[globalStyles.text, styles.selectorButtonText, selectedMonth !== 'all' && styles.selectorButtonTextActive]}>
                  {selectedMonth === 'all' ? 'الشهر' : months[selectedMonth]}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.selectorButton, selectedYear !== 'all' && styles.selectorButtonActive]} onPress={() => setShowYearModal(true)}>
                <Ionicons name="calendar-outline" size={16} color={selectedYear !== 'all' ? Colors.white : Colors.primary} />
                <Text style={[globalStyles.text, styles.selectorButtonText, selectedYear !== 'all' && styles.selectorButtonTextActive]}>
                  {selectedYear === 'all' ? 'السنة' : selectedYear}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.resetButton} onPress={resetFilters}>
                <Ionicons name="refresh-outline" size={16} color={Colors.primary} />
              </TouchableOpacity>
               <TouchableOpacity style={styles.deleteButton} onPress={() => setShowDeleteModal(true)}>
                <Ionicons name="trash-outline" size={16} color={Colors.error} />
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
                <Text style={[globalStyles.text, styles.filterButtonText, selectedFilter === 'taken' && styles.filterButtonTextActive, {color: selectedFilter === 'taken' ? Colors.white : Colors.success}]}>
                  مأخوذ ({stats.taken})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.filterButton, selectedFilter === 'missed' && styles.filterButtonActive]} onPress={() => setSelectedFilter('missed')}>
                <Ionicons name="close-circle-outline" size={16} color={selectedFilter === 'missed' ? Colors.white : Colors.error} />
                <Text style={[globalStyles.text, styles.filterButtonText, selectedFilter === 'missed' && styles.filterButtonTextActive, {color: selectedFilter === 'missed' ? Colors.white : Colors.error}]}>
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
              <ScrollView horizontal showsHorizontalScrollIndicator={true}>
                <View>
                  <View style={styles.tableHeader}>
                    <TouchableOpacity style={[styles.headerCell, { width: 120 }]} onPress={() => handleSort('date')}>
                      <Text style={[globalStyles.text, styles.headerCellText]}>التاريخ</Text>
                      <Ionicons name={getSortIcon('date')} size={14} color={Colors.white} />
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.headerCell, { width: 150 }]} onPress={() => handleSort('medicine')}>
                      <Text style={[globalStyles.text, styles.headerCellText]}>الدواء</Text>
                      <Ionicons name={getSortIcon('medicine')} size={14} color={Colors.white} />
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.headerCell, { width: 90 }]} onPress={() => handleSort('time')}>
                      <Text style={[globalStyles.text, styles.headerCellText]}>الوقت</Text>
                      <Ionicons name={getSortIcon('time')} size={14} color={Colors.white} />
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.headerCell, { width: 100 }]} onPress={() => handleSort('status')}>
                      <Text style={[globalStyles.text, styles.headerCellText]}>الحالة</Text>
                      <Ionicons name={getSortIcon('status')} size={14} color={Colors.white} />
                    </TouchableOpacity>
                  </View>
                  {/* This View is crucial for the vertical scroll */}
                  <View>
                    {sortedEntries.map((item, idx) => (
                      <TouchableOpacity key={`${item.date}-${item.medName}-${item.time}`} style={[styles.tableRow, idx % 2 === 0 ? styles.tableRowEven : styles.tableRowOdd]} activeOpacity={0.7}>
                        <View style={[styles.cell, { width: 120 }]}>
                          <Text style={[globalStyles.text, styles.cellText]}>{formatDate(item.date)}</Text>
                          <Text style={[globalStyles.text, styles.dayText]}>{getDayName(item.date)}</Text>
                        </View>
                        <View style={[styles.cell, { width: 150 }]}>
                          <View style={styles.medicineContainer}>
                            <View style={styles.medicineIcon}>
                              <Ionicons name="medical-outline" size={12} color={Colors.primary} />
                            </View>
                            <Text style={[globalStyles.text, styles.cellText]} numberOfLines={1}>
                              {item.medName}
                            </Text>
                          </View>
                        </View>
                        <View style={[styles.cell, { width: 90 }]}>
                          <View style={styles.timeContainer}>
                            <Ionicons name="time-outline" size={12} color={Colors.textSecondary} />
                            <Text style={[globalStyles.text, styles.cellText]}>{item.time}</Text>
                          </View>
                        </View>
                        <View style={[styles.cell, { width: 100 }]}>
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
                </View>
              </ScrollView>
            </Animated.View>
          )}
        </ScrollView>
        {/* Day, Month, Year Modals (Unchanged) */}
        <Modal visible={showDayModal} transparent={true} animationType="fade" onRequestClose={() => setShowDayModal(false)}>
            <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPressOut={() => setShowDayModal(false)}>
              <View style={styles.modalContent}>
                <Text style={[globalStyles.title, styles.modalTitle]}>اختر يومًا</Text>
                <ScrollView>
                  <TouchableOpacity style={[styles.modalOption, selectedDay === 'all' && styles.modalOptionActive]} onPress={() => { setSelectedDay('all'); setShowDayModal(false); }}>
                    <Text style={[globalStyles.text, styles.modalOptionText, selectedDay === 'all' && styles.modalOptionTextActive]}>كل الأيام</Text>
                  </TouchableOpacity>
                  {daysOfWeek.map((day, index) => (
                    <TouchableOpacity key={index} style={[styles.modalOption, selectedDay === day && styles.modalOptionActive]} onPress={() => { setSelectedDay(day); setShowDayModal(false); }}>
                      <Text style={[globalStyles.text, styles.modalOptionText, selectedDay === day && styles.modalOptionTextActive]}>{day}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </TouchableOpacity>
        </Modal>

        {/* --- DELETE MODAL --- */}
        <Modal visible={showDeleteModal} transparent={true} animationType="fade" onRequestClose={() => setShowDeleteModal(false)}>
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPressOut={() => setShowDeleteModal(false)}>
            <View style={styles.modalContent}>
                <Text style={[globalStyles.title, styles.modalTitle]}>حذف السجلات الشهرية</Text>
                <Text style={styles.modalSubtitle}>اختر الشهر والسنة لحذف سجلاتهما</Text>
                
                {/* Month Selector */}
                <View style={styles.deleteSelector}>
                    <Text style={styles.deleteLabel}>الشهر:</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        {months.map((month, index) => (
                            <TouchableOpacity key={index} style={[styles.deleteChip, deleteMonth === index && styles.deleteChipActive]} onPress={() => setDeleteMonth(index)}>
                                <Text style={[styles.deleteChipText, deleteMonth === index && styles.deleteChipTextActive]}>{month}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                {/* Year Selector */}
                <View style={styles.deleteSelector}>
                    <Text style={styles.deleteLabel}>السنة:</Text>
                     <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        {getAvailableYears().map((year) => (
                            <TouchableOpacity key={year} style={[styles.deleteChip, deleteYear === year && styles.deleteChipActive]} onPress={() => setDeleteYear(year)}>
                                <Text style={[styles.deleteChipText, deleteYear === year && styles.deleteChipTextActive]}>{year}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                <TouchableOpacity style={styles.modalDeleteButton} onPress={handleDeleteByMonth}>
                    <Ionicons name="trash-bin-outline" size={18} color={Colors.white} />
                    <Text style={styles.modalDeleteButtonText}>حذف سجلات {months[deleteMonth]} {deleteYear}</Text>
                </TouchableOpacity>
            </View>
          </TouchableOpacity>
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
    alignItems: 'center',
    paddingHorizontal: 16,
    elevation: 4,
  },
  topBarContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  topBarTitle: {
    fontSize: 24,
    color: Colors.white,
    marginLeft: 12,
    ...globalStyles.text,
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
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
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
    flexDirection: 'row',
    alignItems: 'center'
  },
  selectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    elevation: 2,
  },
  selectorButtonActive: {
    backgroundColor: Colors.primary,
  },
  selectorButtonText: {
    marginLeft: 4,
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
  },
  selectorButtonTextActive: {
    color: Colors.white,
  },
  resetButton: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.white,
    width: 36,
    height: 36,
    borderRadius: 18,
    elevation: 2,
    marginHorizontal: 4,
  },
  deleteButton: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.error + '20',
    width: 36,
    height: 36,
    borderRadius: 18,
    elevation: 2,
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
    elevation: 2,
    borderWidth: 1,
    borderColor: Colors.border + '30',
  },
  filterButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
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
    backgroundColor: Colors.white,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: Colors.primary,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  headerCell: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
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
    borderBottomWidth: 1,
    borderBottomColor: Colors.border + '30',
  },
  tableRowEven: {
    backgroundColor: Colors.white,
  },
  tableRowOdd: {
    backgroundColor: Colors.background,
  },
  cell: {
    paddingHorizontal: 19,
    paddingVertical: 16,
    justifyContent: 'center',
    alignItems: 'center'
  },
  cellText: {
    fontSize: 12,
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
    justifyContent: 'flex-start',
    width: '100%',
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
    padding: 20,
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxHeight: '80%',
    elevation: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary,
    textAlign: 'center',
    marginBottom: 8,
  },
  modalSubtitle: {
    ...globalStyles.text,
    fontSize: 14,
    color: Colors.textSecondary,
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
    textAlign: 'center',
  },
  modalOptionTextActive: {
    color: Colors.white,
  },
  deleteSelector: {
    marginBottom: 16,
  },
  deleteLabel: {
    ...globalStyles.text,
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
    marginBottom: 8,
    textAlign: 'right',
  },
  deleteChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: Colors.background,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: Colors.border
  },
  deleteChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  deleteChipText: {
    ...globalStyles.text,
    color: Colors.primary,
    fontWeight: '500'
  },
  deleteChipTextActive: {
    color: Colors.white,
  },
  modalDeleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.error,
    paddingVertical: 14,
    borderRadius: 8,
    marginTop: 16,
  },
  modalDeleteButtonText: {
    ...globalStyles.text,
    fontSize: 16,
    fontWeight: '600',
    color: Colors.white,
    marginLeft: 8,
  },
});