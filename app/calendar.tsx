import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Animated, Dimensions, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../constants/Colors';
import { useDailyLog } from '../services/DailyLogContext';
import { DatabaseService, Medicine } from '../services/databaseService';
import { globalStyles } from '../services/globalstyle';

const { width } = Dimensions.get('window');

const padTime = (t: string) => {
  const [h, m] = t.split(':');
  return `${h.padStart(2, '0')}:${m.padStart(2, '0')}`;
};

// Helper function to get day name
const getDayName = (dateString: string) => {
  const date = new Date(dateString);
  const daysOfWeek = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
  return daysOfWeek[date.getDay()];
};

export default function CalendarScreen() {
  const { dailyLogs } = useDailyLog();
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [sortBy, setSortBy] = useState<'date' | 'medicine' | 'time' | 'status'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'taken' | 'missed'>('all');
  const [animatedValue] = useState(new Animated.Value(0));
  
  // Nouvelles states pour les sélecteurs
  const [selectedDay, setSelectedDay] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<number | 'all'>('all');
  const [selectedYear, setSelectedYear] = useState<number | 'all'>('all');
  const [showDayModal, setShowDayModal] = useState(false);
  const [showMonthModal, setShowMonthModal] = useState(false);
  const [showYearModal, setShowYearModal] = useState(false);

  const daysOfWeek = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
  const months = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];

  useEffect(() => {
    DatabaseService.getMedicines().then(setMedicines);
    
    // Animation d'entrée
    Animated.timing(animatedValue, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, [dailyLogs]);

  // Build a list of all (date, med, time, status) - FIXED to avoid duplicates
  const entries: { date: string; medName: string; time: string; status: boolean }[] = [];
  Object.entries(dailyLogs).forEach(([date, log]) => {
    medicines.forEach(med => {
      // Try to get the medicine log, prioritizing string version first
      const medLog = log.taken[String(med.id)] || log.taken[med.id];
      
      if (medLog) {
        med.exactTimes.forEach(time => {
          const formattedTime = padTime(time);
          const taken = medLog.takenTimes?.[formattedTime] === true;
          entries.push({ date, medName: med.name, time: formattedTime, status: taken });
        });
      } else {
        // If no log exists, create entries with false status
        med.exactTimes.forEach(time => {
          const formattedTime = padTime(time);
          entries.push({ date, medName: med.name, time: formattedTime, status: false });
        });
      }
    });
  });

  // Remove duplicates based on unique combination of date, medName, and time
  const uniqueEntries = entries.filter((entry, index, self) => 
    index === self.findIndex(e => 
      e.date === entry.date && 
      e.medName === entry.medName && 
      e.time === entry.time
    )
  );

  // Filtrer les entrées par jour, mois, année
  const filteredEntries = uniqueEntries.filter(entry => {
    const date = new Date(entry.date);
    const dayOfWeek = date.getDay();
    const month = date.getMonth();
    const year = date.getFullYear();
    
    // Filtre par jour de la semaine
    if (selectedDay !== 'all' && daysOfWeek[dayOfWeek] !== selectedDay) {
      return false;
    }
    
    // Filtre par mois
    if (selectedMonth !== 'all' && month !== selectedMonth) {
      return false;
    }
    
    // Filtre par année
    if (selectedYear !== 'all' && year !== selectedYear) {
      return false;
    }
    
    // Filtre par statut
    if (selectedFilter === 'taken') return entry.status;
    if (selectedFilter === 'missed') return !entry.status;
    return true;
  });

  // Trier les entrées
  const sortedEntries = filteredEntries.sort((a, b) => {
    let comparison = 0;
    
    switch (sortBy) {
      case 'date':
        comparison = a.date.localeCompare(b.date);
        break;
      case 'medicine':
        comparison = a.medName.localeCompare(b.medName);
        break;
      case 'time':
        comparison = a.time.localeCompare(b.time);
        break;
      case 'status':
        comparison = Number(a.status) - Number(b.status);
        break;
    }
    
    return sortOrder === 'asc' ? comparison : -comparison;
  });

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
    
    if (date.toDateString() === today.toDateString()) {
      return 'Aujourd\'hui';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Hier';
    }
    
    return date.toLocaleDateString('fr-FR', { 
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
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
          {/* Header animé */}
          <Animated.View 
            style={[
              styles.headerContainer,
              {
                opacity: animatedValue,
                transform: [{
                  translateY: animatedValue.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-50, 0],
                  }),
                }],
              }
            ]}
          >
            <View style={styles.headerContent}>
              <View style={styles.titleContainer}>
                <View style={styles.iconContainer}>
                  <Ionicons name="calendar-outline" size={28} color={Colors.primary} />
                </View>
                <Text style={[globalStyles.title, styles.title]}>
                  Calendrier des Médicaments
                </Text>
              </View>
              
              {/* Statistiques */}
              <View style={styles.statsContainer}>
                <View style={styles.statCard}>
                  <Text style={styles.statNumber}>{stats.percentage}%</Text>
                  <Text style={styles.statLabel}>Conformité</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={[styles.statNumber, { color: Colors.success }]}>
                    {stats.taken}
                  </Text>
                  <Text style={styles.statLabel}>Pris</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={[styles.statNumber, { color: Colors.error }]}>
                    {stats.missed}
                  </Text>
                  <Text style={styles.statLabel}>Manqués</Text>
                </View>
              </View>
            </View>
          </Animated.View>

          {/* Sélecteurs de jour, mois, année */}
          <Animated.View 
            style={[
              styles.selectorContainer,
              {
                opacity: animatedValue,
                transform: [{
                  translateY: animatedValue.interpolate({
                    inputRange: [0, 1],
                    outputRange: [30, 0],
                  }),
                }],
              }
            ]}
          >
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.selectorScroll}
            >
              {/* Sélecteur de jour */}
              <TouchableOpacity
                style={[styles.selectorButton, selectedDay !== 'all' && styles.selectorButtonActive]}
                onPress={() => setShowDayModal(true)}
              >
                <Ionicons 
                  name="calendar-outline" 
                  size={16} 
                  color={selectedDay !== 'all' ? Colors.white : Colors.primary} 
                />
                <Text style={[
                  styles.selectorButtonText,
                  selectedDay !== 'all' && styles.selectorButtonTextActive
                ]}>
                  {selectedDay === 'all' ? 'Jour' : selectedDay}
                </Text>
                <Ionicons 
                  name="chevron-down" 
                  size={14} 
                  color={selectedDay !== 'all' ? Colors.white : Colors.primary} 
                />
              </TouchableOpacity>

              {/* Sélecteur de mois */}
              <TouchableOpacity
                style={[styles.selectorButton, selectedMonth !== 'all' && styles.selectorButtonActive]}
                onPress={() => setShowMonthModal(true)}
              >
                <Ionicons 
                  name="calendar-outline" 
                  size={16} 
                  color={selectedMonth !== 'all' ? Colors.white : Colors.primary} 
                />
                <Text style={[
                  styles.selectorButtonText,
                  selectedMonth !== 'all' && styles.selectorButtonTextActive
                ]}>
                  {selectedMonth === 'all' ? 'Mois' : months[selectedMonth]}
                </Text>
                <Ionicons 
                  name="chevron-down" 
                  size={14} 
                  color={selectedMonth !== 'all' ? Colors.white : Colors.primary} 
                />
              </TouchableOpacity>

              {/* Sélecteur d'année */}
              <TouchableOpacity
                style={[styles.selectorButton, selectedYear !== 'all' && styles.selectorButtonActive]}
                onPress={() => setShowYearModal(true)}
              >
                <Ionicons 
                  name="calendar-outline" 
                  size={16} 
                  color={selectedYear !== 'all' ? Colors.white : Colors.primary} 
                />
                <Text style={[
                  styles.selectorButtonText,
                  selectedYear !== 'all' && styles.selectorButtonTextActive
                ]}>
                  {selectedYear === 'all' ? 'Année' : selectedYear}
                </Text>
                <Ionicons 
                  name="chevron-down" 
                  size={14} 
                  color={selectedYear !== 'all' ? Colors.white : Colors.primary} 
                />
              </TouchableOpacity>

              {/* Bouton reset */}
              <TouchableOpacity
                style={styles.resetButton}
                onPress={resetFilters}
              >
                <Ionicons name="refresh-outline" size={16} color={Colors.error} />
                <Text style={styles.resetButtonText}>Reset</Text>
              </TouchableOpacity>
            </ScrollView>
          </Animated.View>

          {/* Filtres */}
          <Animated.View 
            style={[
              styles.filterContainer,
              {
                opacity: animatedValue,
                transform: [{
                  translateY: animatedValue.interpolate({
                    inputRange: [0, 1],
                    outputRange: [50, 0],
                  }),
                }],
              }
            ]}
          >
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.filterScroll}
            >
              <TouchableOpacity
                style={[
                  styles.filterButton,
                  selectedFilter === 'all' && styles.filterButtonActive
                ]}
                onPress={() => setSelectedFilter('all')}
              >
                <Ionicons 
                  name="list-outline" 
                  size={16} 
                  color={selectedFilter === 'all' ? Colors.white : Colors.primary} 
                />
                <Text style={[
                  styles.filterButtonText,
                  selectedFilter === 'all' && styles.filterButtonTextActive
                ]}>
                  Tout ({uniqueEntries.length})
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.filterButton,
                  selectedFilter === 'taken' && styles.filterButtonActive
                ]}
                onPress={() => setSelectedFilter('taken')}
              >
                <Ionicons 
                  name="checkmark-circle-outline" 
                  size={16} 
                  color={selectedFilter === 'taken' ? Colors.white : Colors.success} 
                />
                <Text style={[
                  styles.filterButtonText,
                  selectedFilter === 'taken' && styles.filterButtonTextActive
                ]}>
                  Pris ({stats.taken})
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.filterButton,
                  selectedFilter === 'missed' && styles.filterButtonActive
                ]}
                onPress={() => setSelectedFilter('missed')}
              >
                <Ionicons 
                  name="close-circle-outline" 
                  size={16} 
                  color={selectedFilter === 'missed' ? Colors.white : Colors.error} 
                />
                <Text style={[
                  styles.filterButtonText,
                  selectedFilter === 'missed' && styles.filterButtonTextActive
                ]}>
                  Manqués ({stats.missed})
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </Animated.View>

          {/* Tableau */}
          {sortedEntries.length === 0 ? (
            <Animated.View 
              style={[
                styles.emptyContainer,
                {
                  opacity: animatedValue,
                  transform: [{
                    scale: animatedValue.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.8, 1],
                    }),
                  }],
                }
              ]}
            >
              <View style={styles.emptyIconContainer}>
                <Ionicons name="information-circle-outline" size={64} color={Colors.textSecondary} />
              </View>
              <Text style={[globalStyles.text, styles.emptyText]}>
                Aucune donnée disponible
              </Text>
              <Text style={[globalStyles.text, styles.emptySubText]}>
                Les données apparaîtront ici une fois que vous aurez commencé à prendre vos médicaments
              </Text>
            </Animated.View>
          ) : (
            <Animated.View 
              style={[
                styles.tableContainer,
                {
                  opacity: animatedValue,
                  transform: [{
                    translateY: animatedValue.interpolate({
                      inputRange: [0, 1],
                      outputRange: [100, 0],
                    }),
                  }],
                }
              ]}
            >
              <View style={styles.table}>
                {/* Header du tableau */}
                <View style={styles.tableHeader}>
                  <TouchableOpacity 
                    style={[styles.headerCell, { flex: 2 }]}
                    onPress={() => handleSort('date')}
                  >
                    <Text style={styles.headerCellText}>Date</Text>
                    <Ionicons 
                      name={getSortIcon('date')} 
                      size={14} 
                      color={Colors.white} 
                    />
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[styles.headerCell, { flex: 2.5 }]}
                    onPress={() => handleSort('medicine')}
                  >
                    <Text style={styles.headerCellText}>Médicament</Text>
                    <Ionicons 
                      name={getSortIcon('medicine')} 
                      size={14} 
                      color={Colors.white} 
                    />
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[styles.headerCell, { flex: 1.5 }]}
                    onPress={() => handleSort('time')}
                  >
                    <Text style={styles.headerCellText}>Heure</Text>
                    <Ionicons 
                      name={getSortIcon('time')} 
                      size={14} 
                      color={Colors.white} 
                    />
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[styles.headerCell, { flex: 1.5 }]}
                    onPress={() => handleSort('status')}
                  >
                    <Text style={styles.headerCellText}>Statut</Text>
                    <Ionicons 
                      name={getSortIcon('status')} 
                      size={14} 
                      color={Colors.white} 
                    />
                  </TouchableOpacity>
                </View>
                
                {/* Lignes du tableau */}
                {sortedEntries.map((item, idx) => (
                  <TouchableOpacity
                    key={`${item.date}-${item.medName}-${item.time}`}
                    style={[
                      styles.tableRow,
                      idx % 2 === 0 ? styles.tableRowEven : styles.tableRowOdd
                    ]}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.cell, { flex: 2 }]}>
                      <Text style={[globalStyles.text, styles.cellText]}>
                        {formatDate(item.date)}
                      </Text>
                      <Text style={[styles.dayText]}>
                        {getDayName(item.date)}
                      </Text>
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
                        <Text style={[globalStyles.text, styles.cellText]}>
                          {item.time}
                        </Text>
                      </View>
                    </View>
                    
                    <View style={[styles.cell, { flex: 1.5 }]}>
                      <View style={[
                        styles.statusContainer,
                        item.status ? styles.statusTaken : styles.statusMissed
                      ]}>
                        <Ionicons
                          name={item.status ? 'checkmark-circle' : 'close-circle'}
                          size={16}
                          color={item.status ? Colors.success : Colors.error}
                        />
                        <Text style={[
                          styles.statusText,
                          { color: item.status ? Colors.success : Colors.error }
                        ]}>
                          {item.status ? 'Pris' : 'Manqué'}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </Animated.View>
          )}
        </ScrollView>

        {/* Modals pour les sélecteurs */}
        
        {/* Modal Jour */}
        <Modal
          visible={showDayModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowDayModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Sélectionner un jour</Text>
              <ScrollView style={styles.modalScroll}>
                <TouchableOpacity
                  style={[styles.modalOption, selectedDay === 'all' && styles.modalOptionActive]}
                  onPress={() => {
                    setSelectedDay('all');
                    setShowDayModal(false);
                  }}
                >
                  <Text style={[
                    styles.modalOptionText,
                    selectedDay === 'all' && styles.modalOptionTextActive
                  ]}>
                    Tous les jours
                  </Text>
                </TouchableOpacity>
                {daysOfWeek.map((day, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[styles.modalOption, selectedDay === day && styles.modalOptionActive]}
                    onPress={() => {
                      setSelectedDay(day);
                      setShowDayModal(false);
                    }}
                  >
                    <Text style={[
                      styles.modalOptionText,
                      selectedDay === day && styles.modalOptionTextActive
                    ]}>
                      {day}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowDayModal(false)}
              >
                <Text style={styles.modalCloseText}>Fermer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Modal Mois */}
        <Modal
          visible={showMonthModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowMonthModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Sélectionner un mois</Text>
              <ScrollView style={styles.modalScroll}>
                <TouchableOpacity
                  style={[styles.modalOption, selectedMonth === 'all' && styles.modalOptionActive]}
                  onPress={() => {
                    setSelectedMonth('all');
                    setShowMonthModal(false);
                  }}
                >
                  <Text style={[
                    styles.modalOptionText,
                    selectedMonth === 'all' && styles.modalOptionTextActive
                  ]}>
                    Tous les mois
                  </Text>
                </TouchableOpacity>
                {months.map((month, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[styles.modalOption, selectedMonth === index && styles.modalOptionActive]}
                    onPress={() => {
                      setSelectedMonth(index);
                      setShowMonthModal(false);
                    }}
                  >
                    <Text style={[
                      styles.modalOptionText,
                      selectedMonth === index && styles.modalOptionTextActive
                    ]}>
                      {month}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowMonthModal(false)}
              >
                <Text style={styles.modalCloseText}>Fermer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Modal Année */}
        <Modal
          visible={showYearModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowYearModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Sélectionner une année</Text>
              <ScrollView style={styles.modalScroll}>
                <TouchableOpacity
                  style={[styles.modalOption, selectedYear === 'all' && styles.modalOptionActive]}
                  onPress={() => {
                    setSelectedYear('all');
                    setShowYearModal(false);
                  }}
                >
                  <Text style={[
                    styles.modalOptionText,
                    selectedYear === 'all' && styles.modalOptionTextActive
                  ]}>
                    Toutes les années
                  </Text>
                </TouchableOpacity>
                {getAvailableYears().map((year) => (
                  <TouchableOpacity
                    key={year}
                    style={[styles.modalOption, selectedYear === year && styles.modalOptionActive]}
                    onPress={() => {
                      setSelectedYear(year);
                      setShowYearModal(false);
                    }}
                  >
                    <Text style={[
                      styles.modalOptionText,
                      selectedYear === year && styles.modalOptionTextActive
                    ]}>
                      {year}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowYearModal(false)}
              >
                <Text style={styles.modalCloseText}>Fermer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
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
  filterContainer: {
    marginBottom: 20,
  },
  selectorContainer: {
    marginBottom: 16,
  },
  selectorScroll: {
    flexGrow: 0,
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
  filterScroll: {
    flexGrow: 0,
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
  table: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
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
  },
  dayText: {
    fontSize: 10,
    color: Colors.textSecondary,
    fontWeight: '400',
    marginTop: 2,
  },
  medicineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
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
  // Styles pour les modals
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