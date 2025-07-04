import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  Image,
  Alert,
  Platform,
  Dimensions
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { DatabaseService, Medicine, LogService } from '../services/databaseService';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../constants/Colors';
import BottomBar from './BottomBar';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Notifications from 'expo-notifications';
import { useFocusEffect } from '@react-navigation/native';
import { useDailyLog } from '../services/DailyLogContext';

const RFValue = (size: number) => {
  const scale = Dimensions.get('window').width / 375;
  return Math.round(size * scale);
};

import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const globalStyles = {
  textDefault: {
    fontFamily: 'JannaLT-Regular',
  },
  textBold: {
    fontFamily: 'JannaLTBold',
  },
};

const getResponsiveDimensions = () => {
  const { width, height } = Dimensions.get('window');
  const isPortrait = height > width;
  return { width, height, isPortrait };
};

export default function HomeScreen() {
  const [dimensions, setDimensions] = useState(getResponsiveDimensions());
  const [currentDate, setCurrentDate] = useState(new Date());
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingMedicine, setEditingMedicine] = useState<Medicine | null>(null);
  const [medicineName, setMedicineName] = useState('');
  const [medicinePhoto, setMedicinePhoto] = useState<string | null>(null);
  const [quantity, setQuantity] = useState('');
  const [exactTimes, setExactTimes] = useState<string[]>([]);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [pickerTime, setPickerTime] = useState(new Date());
  const { dailyLogs, updateDailyLog, refreshDailyLogs } = useDailyLog();

  useEffect(() => {
    const onChange = () => {
      setDimensions(getResponsiveDimensions());
    };
    const subscription = Dimensions.addEventListener('change', onChange);
    return () => subscription.remove();
  }, []);

  const requestNotificationPermissions = useCallback(async () => {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
          allowCriticalAlerts: true,
        },
      });
      finalStatus = status;
    }
    return finalStatus;
  }, []);

  const setupNotificationChannel = useCallback(async () => {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('medicine-reminders', {
        name: 'تذكير الأدوية',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
        sound: 'default',
      });
    }
  }, []);
  const formatArabicDate = (date: Date) => {
    const daysOfWeek = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    const months = [
      'جانفي', 'فيفري', 'مارس', 'أفريل', 'ماي', 'جوان',
      'جويلية', 'أوت', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
    ];
  
    const dayName = daysOfWeek[date.getDay()];
    const day = date.getDate();
    const monthName = months[date.getMonth()];
    const year = date.getFullYear();
  
    // Format time with صباح/مساء
    let hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const period = hours < 12 ? 'صباح' : 'مساء';
    hours = hours % 12 || 12; // Convert to 12-hour format
  
    return {
      dateString: `${dayName} ${day} ${monthName} ${year}`,
      timeString: `${hours}:${minutes} ${period}`
    };
  };

  const scheduleMedicineNotifications = useCallback(async (medicine: Medicine) => {
    const status = await requestNotificationPermissions();
    if (status !== 'granted') {
      console.warn('Notification permission not granted');
      return;
    }
    await setupNotificationChannel();
  
    // Cancel existing notifications for this medicine
    const existingNotifications = await Notifications.getAllScheduledNotificationsAsync();
    for (const notification of existingNotifications) {
      if (notification.identifier.startsWith(`medicine-${medicine.id}-`)) {
        await Notifications.cancelScheduledNotificationAsync(notification.identifier);
      }
    }
  
    for (const time of medicine.exactTimes) {
      const [hour, minute] = time.split(':').map(Number);
  
      // Validate time format
      if (isNaN(hour) || isNaN(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
        console.error(`Invalid time format for ${time}`);
        continue;
      }
  
      try {
        const now = new Date();
        const scheduledTime = new Date();
        scheduledTime.setHours(hour, minute, 0, 0);
  
        // If the time has already passed today, schedule for tomorrow
        if (scheduledTime <= now) {
          scheduledTime.setDate(scheduledTime.getDate() + 1);
        }
  
        // Schedule four notifications: at 0s, 30s, 60s, 90s
        for (let i = 0; i < 4; i++) {
          const offsetSeconds = i * 30; // 0, 30, 60, 90 seconds
          const notificationTime = new Date(scheduledTime.getTime() + offsetSeconds * 1000);
          const secondsUntilTrigger = Math.floor((notificationTime.getTime() - now.getTime()) / 1000);
  
          // Skip if secondsUntilTrigger is negative
          if (secondsUntilTrigger < 0) {
            console.warn(`Skipping negative trigger time for ${time}, offset ${offsetSeconds}s`);
            continue;
          }
  
          const identifier = `medicine-${medicine.id}-${time.replace(':', '-')}-${i}`;
  
          await Notifications.scheduleNotificationAsync({
            identifier,
            content: {
              title: `💊 حان وقت دواء: ${medicine.name}`,
              body: `تذكّر أن تأخذ جرعتك الآن. الكمية ${medicine.quantity}.`,
              data: { medicineId: medicine.id, time, sequence: i + 1 },
              sound: 'default',
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
              channelId: 'medicine-reminders',
              seconds: secondsUntilTrigger,
              repeats: false,
            },
          });
        }
      } catch (error) {
        console.error(`Failed to schedule notification for ${time}:`, error);
      }
    }
  }, [requestNotificationPermissions, setupNotificationChannel]);
  const scheduleAllMedicinesNotifications = useCallback(async () => {
    const currentMedicines = await DatabaseService.getMedicines();
    for (const med of currentMedicines) {
      await scheduleMedicineNotifications(med);
    }
  }, [scheduleMedicineNotifications]);

  const saveDailyLog = useCallback(async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const taken = medicines.reduce((acc, medicine) => {
        if (Object.keys(medicine.takenTimes || {}).length > 0 &&
            Object.values(medicine.takenTimes || {}).some(status => status)) {
          (acc as Record<number, any>)[medicine.id] = {
            name: medicine.name,
            takenTimes: medicine.takenTimes || {}
          };
        }
        return acc;
      }, {});
      const dailyLog = {
        date: today,
        taken
      };
      await LogService.saveDailyLog(today, dailyLog);
    } catch (error) {
      console.error('Failed to save daily log:', error);
    }
  }, [medicines]);

  const loadData = useCallback(async () => {
    const storedMedicines = await DatabaseService.getMedicines();
    setMedicines(storedMedicines);
  }, []);

  useEffect(() => {
    const timeInterval = setInterval(() => setCurrentDate(new Date()), 60000);

    const loadAndResetMedicines = async () => {
      let storedMedicines = await DatabaseService.getMedicines();
      const today = new Date().toISOString().split('T')[0];
      const medicinesToUpdateInDB: Medicine[] | { takenTimes: {}; lastTakenDate: string; id: number; name: string; photo?: string | null; quantity: number; periods: string[]; exactTimes: string[]; createdAt: string; updatedAt: string; }[] = [];
      const updatedMedicines = storedMedicines.map(med => {
        if (!med.lastTakenDate || new Date(med.lastTakenDate).toISOString().split('T')[0] !== today) {
          const resetMed = { ...med, takenTimes: {}, lastTakenDate: today };
          medicinesToUpdateInDB.push(resetMed);
          return resetMed;
        }
        return { ...med, takenTimes: med.takenTimes || {} };
      });

      for (const med of medicinesToUpdateInDB as Medicine[]) {
        try {
          await DatabaseService.updateMedicine(med.id, {
            takenTimes: med.takenTimes,
            lastTakenDate: med.lastTakenDate
          });
        } catch (dbError) {
          console.error(`Failed to update medicine:`, dbError);
        }
      }
      setMedicines(updatedMedicines);
    };

    const initializeApp = async () => {
      try {
        await loadAndResetMedicines();
        await setupNotificationChannel();
        await scheduleAllMedicinesNotifications();
      } catch (error) {
        console.error('Initialization error:', error);
      }
    };

    initializeApp();

    const notificationResponseListener = Notifications.addNotificationResponseReceivedListener(response => {
      const { data } = response.notification.request.content;
      console.log('Notification tapped with data:', data);
    });

    return () => {
      clearInterval(timeInterval);
      Notifications.removeNotificationSubscription(notificationResponseListener);
    };
  }, [scheduleAllMedicinesNotifications, setupNotificationChannel]);

  useEffect(() => {
    if (medicines.length > 0) {
      saveDailyLog();
    }
  }, [medicines, saveDailyLog]);

  const resetForm = useCallback(() => {
    setMedicineName('');
    setMedicinePhoto(null);
    setQuantity('');
    setExactTimes([]);
    setEditingMedicine(null);
    setPickerTime(new Date());
  }, []);

  const openAddModal = () => {
    resetForm();
    setIsModalVisible(true);
  };

  const openEditModal = (medicine: Medicine) => {
    setEditingMedicine(medicine);
    setMedicineName(medicine.name);
    setMedicinePhoto(medicine.photo || null);
    setQuantity(medicine.quantity.toString());
    setExactTimes(medicine.exactTimes);
    if (medicine.exactTimes.length > 0) {
      const [hour, minute] = medicine.exactTimes[0].split(':').map(Number);
      const date = new Date();
      date.setHours(hour);
      date.setMinutes(minute);
      setPickerTime(date);
    } else {
      setPickerTime(new Date());
    }
    setIsModalVisible(true);
  };

  const closeModal = () => {
    setIsModalVisible(false);
    resetForm();
  };

  const pickImage = async () => {
    Alert.alert(
      'اختيار صورة الدواء',
      'اختر من أين تريد إضافة الصورة:',
      [
        {
          text: 'التقاط صورة (كاميرا)',
          onPress: async () => {
            const permission = await ImagePicker.requestCameraPermissionsAsync();
            if (!permission.granted) {
              Alert.alert('الإذن مطلوب', 'نحتاج إلى إذن الكاميرا لالتقاط الصور.');
              return;
            }
            const result = await ImagePicker.launchCameraAsync({
              allowsEditing: true,
              aspect: [4, 3],
              quality: 1
            });
            if (!result.canceled) {
              setMedicinePhoto(result.assets[0].uri);
            }
          },
        },
        {
          text: 'اختيار من المعرض',
          onPress: async () => {
            const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!permission.granted) {
              Alert.alert('الإذن مطلوب', 'نحتاج إذن الوصول إلى المعرض لاختيار الصور.');
              return;
            }
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              allowsEditing: true,
              aspect: [4, 3],
              quality: 1
            });
            if (!result.canceled) {
              setMedicinePhoto(result.assets[0].uri);
            }
          },
        },
        { text: 'إلغاء', style: 'cancel' },
      ],
      { cancelable: true }
    );
  };

  const showTimePickerModal = () => {
    setShowTimePicker(true);
  };

  const onTimeChange = (event: any, selectedDate?: Date) => {
    const currentDate = selectedDate || pickerTime;
    setShowTimePicker(Platform.OS === 'ios');
  
    if (event.type === 'set' || Platform.OS === 'ios') {
      setPickerTime(currentDate);
  
      // Format time as HH:mm in 24-hour format for storage
      const hours = currentDate.getHours().toString().padStart(2, '0');
      const minutes = currentDate.getMinutes().toString().padStart(2, '0');
      const formattedTime = `${hours}:${minutes}`;
  
      // Display time in 12-hour format with صباح/مساء for UI
      const displayHours = currentDate.getHours() % 12 || 12; // Convert to 12-hour format
      const period = currentDate.getHours() < 12 ? 'صباح' : 'مساء';
      const displayTime = `${displayHours}:${minutes} ${period}`;
  
      if (formattedTime && !exactTimes.includes(formattedTime)) {
        setExactTimes((prevTimes) => {
          const newTimes = [...prevTimes, formattedTime];
          // Sort times chronologically by converting to minutes since midnight
          return newTimes.sort((a, b) => {
            const [aH, aM] = a.split(':').map(Number);
            const [bH, bM] = b.split(':').map(Number);
            return (aH * 60 + aM) - (bH * 60 + bM);
          });
        });
  
        // Optional: Show a temporary message with the added time
      }
    }
  };
  

  const handleSaveMedicine = async () => {
    if (!medicineName || !quantity || exactTimes.length === 0) {
      Alert.alert('خطأ', 'الرجاء ملء جميع الحقول المطلوبة (الاسم، الكمية، والأوقات).');
      return;
    }
    const parsedQuantity = parseInt(quantity, 10);
    if (isNaN(parsedQuantity) || parsedQuantity <= 0) {
      Alert.alert('خطأ', 'الرجاء إدخال كمية صحيحة وموجبة.');
      return;
    }
    if (medicineName.trim().length === 0 || medicineName.length > 50) {
      Alert.alert('خطأ', 'اسم الدواء مطلوب ويجب ألا يتجاوز 50 حرفًا.');
      return;
    }
    try {
      if (editingMedicine) {
        const updatedMedicineData = {
          name: medicineName,
          photo: medicinePhoto,
          quantity: parsedQuantity,
          exactTimes,
        };
        await DatabaseService.updateMedicine(editingMedicine.id, updatedMedicineData);
        setMedicines(medicines.map(m => (m.id === editingMedicine.id ? { ...m, ...updatedMedicineData, takenTimes: m.takenTimes, lastTakenDate: m.lastTakenDate } : m)));
        Alert.alert('نجاح', 'تم تحديث الدواء بنجاح.');
      } else {
        const newMedicine = {
          name: medicineName,
          photo: medicinePhoto,
          quantity: parsedQuantity,
          exactTimes,
          periods: []
        };
        const savedMedicine = await DatabaseService.saveMedicine(newMedicine);
        setMedicines([...medicines, savedMedicine]);
        Alert.alert('نجاح', 'تمت إضافة الدواء بنجاح.');
      }
      closeModal();
      await scheduleAllMedicinesNotifications();
      await initializeDailyLogForToday();
    } catch (error) {
      Alert.alert('خطأ', `فشل في ${editingMedicine ? 'تحديث' : 'حفظ'} الدواء.`);
    }
  };

  const handleDeleteMedicine = (medicineId: number) => {
    Alert.alert(
      "تأكيد الحذف",
      "هل أنت متأكد أنك تريد حذف هذا الدواء؟",
      [
        { text: "إلغاء", style: "cancel" },
        {
          text: "حذف",
          style: "destructive",
          onPress: async () => {
            try {
              await DatabaseService.deleteMedicine(medicineId);
              setMedicines(prev => prev.filter(m => m.id !== medicineId));
              Alert.alert('نجاح', 'تم حذف الدواء بنجاح.');
              await scheduleAllMedicinesNotifications();
            } catch (error) {
              Alert.alert('خطأ', 'فشل في حذف الدواء.');
            }
          }
        }
      ]
    );
  };

  const handleTakeMedicine = async (medicineId: number, time: string) => {
    const medicine = medicines.find(m => m.id === medicineId);
    if (!medicine) return;
    const isTaken = medicine.takenTimes?.[time] || false;
    const action = isTaken ? 'إلغاء تناول' : 'تناول';
    Alert.alert(
      `${action} الدواء`,
      `هل تريد ${action} دواء "${medicine.name}" في الساعة ${time}؟`,
      [
        { text: "إلغاء", style: "cancel" },
        {
          text: action,
          onPress: async () => {
            // Always build a full takenTimes for the day
            const updatedTakenTimes: { [key: string]: boolean } = {};
            medicine.exactTimes.forEach(t => {
              // If this is the time being toggled, flip it; otherwise, keep previous or default to false
              if (t === time) {
                updatedTakenTimes[t] = !isTaken;
              } else {
                updatedTakenTimes[t] = medicine.takenTimes?.[t] === true;
              }
            });
            const today = new Date().toISOString().split('T')[0];
            let newQuantity = medicine.quantity;
            
            try {
              await DatabaseService.updateMedicine(medicineId, {
                takenTimes: updatedTakenTimes,
                lastTakenDate: today,
                quantity: newQuantity,
              });
              setMedicines(medicines.map(m =>
                m.id === medicineId ? {
                  ...m,
                  takenTimes: updatedTakenTimes,
                  lastTakenDate: today,
                  quantity: newQuantity,
                } : m
              ));
              // Use context to update the daily log
              const todayISO = new Date().toISOString().split('T')[0];
              const currentDailyLog = dailyLogs[todayISO] || { date: todayISO, taken: {} };
              // Build a full takenTimes for the log as well
              const medLog = currentDailyLog.taken[medicineId] || { name: medicine.name, takenTimes: {} };
              medicine.exactTimes.forEach(t => {
                if (t === time) {
                  medLog.takenTimes[t] = !isTaken;
                } else {
                  medLog.takenTimes[t] = medicine.takenTimes?.[t] === true;
                }
              });
              currentDailyLog.taken[medicineId] = medLog;
              await updateDailyLog(todayISO, currentDailyLog);
              await refreshDailyLogs();
              const statusMessage = !isTaken
                ? `تم تسجيل تناول دواء "${medicine.name}" بنجاح! 💊✅ (الكمية : ${newQuantity})`
                : `تم إلغاء تسجيل تناول دواء "${medicine.name}".`;
              Alert.alert('تم', statusMessage);
              await scheduleAllMedicinesNotifications();
            } catch (error) {
              Alert.alert('خطأ', 'فشل في تحديث حالة الدواء.');
            }
          }
        }
      ]
    );
  };

  const removeExactTime = (index: number) => {
    setExactTimes(exactTimes.filter((_, i) => i !== index));
  };

  const isMedicineDueSoon = (time: string): boolean => {
    const [hour, minute] = time.split(':').map(Number);
    const medicineTime = new Date();
    medicineTime.setHours(hour);
    medicineTime.setMinutes(minute);
    medicineTime.setSeconds(0);
    medicineTime.setMilliseconds(0);
    const now = new Date();
    const timeDiff = medicineTime.getTime() - now.getTime();
    const minutesDiff = timeDiff / (1000 * 60);
    return minutesDiff <= 30 && minutesDiff >= -30;
  };

  const responsiveStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: Colors.background,
      paddingHorizontal: wp('2%'),
    },
    header: {
      paddingTop: hp('6%'), // Reduced from 8%
      paddingHorizontal: wp('5%'),
      paddingBottom: hp('2%'), // Reduced from 2.5%
      borderBottomLeftRadius: wp('7.5%'),
      borderBottomRightRadius: wp('7.5%'),
      justifyContent: 'center',
      alignItems: 'center',
      elevation: 6,
      shadowColor: Colors.primaryDark,
      shadowOffset: { 
        width: 0, 
        height: hp('0.5%') 
      },
      shadowOpacity: 0.3,
      shadowRadius: wp('1.5%'),
    },
    headerContent: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: hp('0.5%'), // Reduced from 1%
    },
    dateText: {
      fontSize: RFValue(14), // Back to original size
      color: 'rgba(255,255,255,0.9)',
      ...globalStyles.textDefault,
      textAlign: 'center',
      writingDirection: 'rtl',
    },
    timeText: {
      fontSize: RFValue(28), // Back to original size
      color: Colors.white,
      marginTop: hp('0.6%'),
      ...globalStyles.textBold,
      textAlign: 'center',
      writingDirection: 'rtl',
      // Kept subtle text shadow for readability
      textShadowColor: 'rgba(0, 0, 0, 0.15)',
      textShadowOffset: { width: 0.5, height: 0.5 },
      textShadowRadius: 2,
    },
    headerIcon: {
      position: 'absolute',
      right: wp('5%'),
      top: hp('4%'),
    },
    content: {
      flex: 1,
      padding: wp('5%'),
      marginTop: hp('-2.5%'),
    },
    emptyState: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingTop: hp('6%'),
      paddingBottom: hp('12%'),
    },
    emptyStateIcon: {
      width: wp('25%'),
      height: wp('25%'),
      borderRadius: wp('12.5%'),
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: hp('2.5%'),
      elevation: 3,
      shadowColor: Colors.primary,
      shadowOffset: { width: 0, height: hp('0.25%') },
      shadowOpacity: 0.2,
      shadowRadius: wp('0.75%'),
    },
    emptyListText: {
      fontSize: RFValue(18),
      color: Colors.textPrimary,
      marginTop: hp('1.2%'),
      ...globalStyles.textBold,
    },
    emptySubText: {
      fontSize: RFValue(14),
      color: Colors.textSecondary,
      textAlign: 'center',
      marginTop: hp('0.6%'),
      ...globalStyles.textDefault,
    },
    medicineCard: {
      marginBottom: hp('2%'),
      borderRadius: wp('3.75%'),
      overflow: 'hidden',
      elevation: 6,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: hp('0.375%') },
      shadowOpacity: 0.1,
      shadowRadius: wp('1.5%'),
      width: '100%',
    },
    cardGradient: {
      padding: wp('3.75%'),
      borderRadius: wp('3.75%'),
    },
    cardHeader: {
      flexDirection: dimensions.isPortrait ? 'row' : 'column',
      alignItems: dimensions.isPortrait ? 'center' : 'flex-start',
      marginBottom: hp('1.2%'),
      flexWrap: 'wrap',
    },
    medicineImage: {
      width: dimensions.isPortrait ? wp('35%') : wp('50%'), // Increased width while maintaining proportions
      height: hp('12%'),
      borderRadius: wp('5%'),
      marginRight: dimensions.isPortrait ? wp('4%') : 0,
      borderWidth: 1,
      borderColor: Colors.primaryLight,
      aspectRatio: 4/3, // Maintained original aspect ratio
    },
    medicineImagePlaceholder: {
      width: dimensions.isPortrait ? wp('35%') : wp('25%'), // Matching medicineImage width
      aspectRatio: 4/3,
      marginRight: dimensions.isPortrait ? wp('4%') : 0,
      backgroundColor: '#e0f2f7',
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: Colors.primary,
    },
    medicineInfo: {
      flex: 1,
      minWidth: dimensions.isPortrait ? '50%' : '100%',
      paddingRight: dimensions.isPortrait ? wp('5%') : 0,
      marginTop: dimensions.isPortrait ? 0 : hp('1.5%'),
    },
    medicineName: {
      fontSize: RFValue(16),
      color: Colors.textPrimary,
      ...globalStyles.textBold,
      marginBottom: hp('2%'), // Increased margin for better spacing
      textAlign: 'right',
      alignSelf: 'stretch', // Takes full width
      writingDirection: 'rtl', // Ensures RTL text direction
      paddingHorizontal: wp('2%'), // Add some padding
    },
    quantityContainer: {
      flexDirection: 'row-reverse', // RTL layout
      alignItems: 'center',
      alignSelf: 'stretch', // Takes full width
      paddingHorizontal: wp('2%'),
      marginBottom: hp('1%'), // Space between elements
    },
    medicineQuantity: {
      fontSize: RFValue(13),
      color: Colors.textSecondary,
      marginRight: wp('2%'), // Changed from marginLeft for RTL
      ...globalStyles.textDefault,
      writingDirection: 'rtl', // Ensures RTL text direction
      flexShrink: 1, // Allows text to shrink if needed
      flexWrap: 'wrap', // Allows text to wrap
    },
    periodsContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginBottom: hp('1.5%'),
      justifyContent: 'flex-end',
    },
    periodChip: {
      borderRadius: wp('7.5%'),
      paddingVertical: hp('0.8%'),
      paddingHorizontal: wp('10%'),
      marginRight: wp('3%'),
      marginBottom: hp('1%'),
      elevation: 1,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: hp('0.15%') },
      shadowOpacity: 0.15,
      shadowRadius: wp('0.375%'),
    },
    periodText: {
      color: Colors.white,
      fontSize: RFValue(12),
      ...globalStyles.textDefault,
    },
    timesContainer: {
      flexDirection: 'row-reverse',
      flexWrap: 'wrap',
      marginBottom: hp('0.1%'),
      justifyContent: 'flex-start',
    },
    timeButtonContainer: {
      margin: wp('1%'),
      width: 'auto',
      flex: 1,
      alignSelf: 'center',
    },
    timeButtonGradient: {
      borderRadius: wp('5%'),
      paddingVertical: hp('1.2%'),
      paddingHorizontal: wp('4%'),
      minWidth: '100%',
      alignItems: 'center',
      justifyContent: 'center',
    },
    timeDisplayRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: hp('0.5%'),
    },
    timeButtonText: {
      fontSize: RFValue(14),
      color: Colors.textPrimary,
      ...globalStyles.textBold,
    },
    timeButtonTextTaken: {
      fontSize: RFValue(14),
      color: Colors.white,
      ...globalStyles.textBold,
    },
    takeActionButton: {
      paddingVertical: hp('0.6%'),
      paddingHorizontal: wp('3.5%'),
      borderRadius: wp('20%'),
      marginTop: hp('0.5%'),
      alignSelf: 'stretch',
      alignItems: 'center',
      justifyContent: 'center',
    },
    takeActionButtonText: {
      fontSize: RFValue(14),
      color: Colors.white,
      ...globalStyles.textDefault,
    },
    progressContainer: {
      marginTop: hp('1.5%'),
      marginBottom: hp('1.5%'),
    },
    progressInfo: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: hp('0.6%'),
    },
    progressText: {
      fontSize: RFValue(11),
      color: Colors.textSecondary,
      ...globalStyles.textDefault,
    },
    progressPercentage: {
      fontSize: RFValue(11),
      color: Colors.primary,
      fontWeight: 'bold',
      ...globalStyles.textBold,
    },
    progressBar: {
      height: hp('0.8%'),
      borderRadius: wp('2%'),
      backgroundColor: '#e2e8f0',
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      borderRadius: wp('2%'),
    },
    actionButtonsContainer: {
      flexDirection: 'row-reverse',
      justifyContent: 'flex-start',
      marginTop: hp('1.5%'),
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#f8fafc',
      paddingVertical: hp('0.75%'),
      paddingHorizontal: wp('3%'),
      borderRadius: wp('5%'),
      marginLeft: wp('2%'),
      borderWidth: 1,
      borderColor: '#cbd5e1',
      minHeight: hp('4.5%'),
      minWidth: wp('15%'),
    },
    actionButtonText: {
      marginLeft: wp('1.25%'),
      fontSize: RFValue(11),
      color: Colors.primary,
      ...globalStyles.textDefault,
    },
    addButton: {
      position: 'absolute',
      bottom: hp('15%'),
      right: hp('13.5%'),
      alignSelf: 'center',
      elevation: 8,
      shadowColor: Colors.primary,
      shadowOffset: { width: 0, height: hp('0.5%') },
      shadowOpacity: 0.3,
      shadowRadius: wp('1.25%'),
      borderRadius: wp('8%'),
    },
    addButtonGradient: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: hp('1.8%'),
      paddingHorizontal: wp('8%'),
      borderRadius: wp('8%'),
    },
    addButtonText: {
      color: Colors.white,
      fontSize: RFValue(14),
      marginLeft: wp('2%'),
      ...globalStyles.textBold,
    },
  });
  // This is a completely new style object. Replace your old styles with this.
// It's designed for the "Modern Card" UI and is RTL-first.

const creativeStyles = StyleSheet.create({
  // --- Modal Structure ---
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end', // ✨ NEW: Modal slides up from the bottom
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#f8fafc', // ✨ CHANGED: A slightly off-white base
    borderTopLeftRadius: wp('8%'), // ✨ NEW: Only top corners are rounded
    borderTopRightRadius: wp('8%'),
    width: '100%',
    maxHeight: hp('90%'), // Can take more of the screen
    padding: wp('5%'),
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row-reverse', // ✨ RTL: Ensures layout is right-to-left
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: hp('2%'),
    marginBottom: hp('2%'),
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    writingDirection: 'rtl', // Explicitly set writing direction
  },
  modalTitle: {
    fontSize: RFValue(20),
    fontWeight: 'bold',
    color: Colors.textPrimary, // ✨ CHANGED: Dark text on a light header
    ...globalStyles.textBold,
  },
  closeButton: {
    backgroundColor: '#e2e8f0',
    borderRadius: 50,
    padding: wp('1%'),
  },
  modalBody: {
    // ScrollView styles are applied directly to the component
  },

  // --- ✨ NEW: Input Card System ---
  inputCard: {
    backgroundColor: Colors.white,
    borderRadius: wp('4%'),
    padding: wp('4%'),
    marginBottom: hp('2%'), // Space between cards
    borderWidth: 1,
    borderColor: '#e2e8f0',
    elevation: 2,
    shadowColor: '#94a3b8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  label: {
    fontSize: RFValue(14),
    color: Colors.textPrimary,
    ...globalStyles.textBold,
    textAlign: 'right',
    marginBottom: hp('1.5%'), // Space between label and input
    writingDirection: 'rtl',
  },
  inputWrapper: {
    flexDirection: 'row', // Items will flow based on language direction (RTL)
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: wp('2.5%'),
    paddingHorizontal: wp('3%'),
  },
  input: {
    flex: 1,
    paddingVertical: hp('1.5%'),
    fontSize: RFValue(14),
    color: Colors.textPrimary,
    textAlign: 'right',
    ...globalStyles.textDefault,
    writingDirection: 'rtl',
  },
  inputIcon: {
    // For RTL, this margin pushes the icon away from the text on its left
    marginLeft: wp('3%'),
  },

  // --- ✨ NEW: Visual Photo Uploader ---
  photoUploadContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: hp('20%'),
    borderRadius: wp('4%'),
    borderWidth: 2,
    borderColor: Colors.primaryLight,
    borderStyle: 'dashed',
    backgroundColor: '#e0f2f7',
    marginBottom: hp('2%'),
    overflow: 'hidden', // Ensures the preview image respects the border radius
  },
  photoUploadText: {
    fontSize: RFValue(14),
    color: Colors.primary,
    ...globalStyles.textBold,
    marginTop: hp('1%'),
  },
  imagePreview: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  removeImageButton: {
    position: 'absolute',
    top: wp('2%'),
    right: wp('2%'), // RTL friendly
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 50,
    padding: wp('1%'),
    elevation: 5,
  },

  // --- Time Chips & Add Button ---
  timesContainer: {
    // This is an inputCard itself
  },
  exactTimesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    writingDirection: 'rtl',
    marginTop: hp('1%'),
  },
  exactTimeChip: {
    flexDirection: 'row-reverse', // Icon on the left side of text
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: wp('5%'),
    paddingVertical: hp('1%'),
    paddingHorizontal: wp('3%'),
    margin: wp('1%'),
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  exactTimeText: {
    fontSize: RFValue(13),
    color: Colors.primary,
    ...globalStyles.textDefault,
    marginRight: wp('2%'),
  },

  // --- ✨ NEW: Prominent Save Button ---
  saveButton: {
    marginTop: hp('2%'),
    borderRadius: wp('4%'),
    overflow: 'hidden',
    elevation: 5,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  saveButtonGradient: {
    flexDirection: 'row-reverse', // Icon on the right
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: hp('2%'),
  },
  saveButtonText: {
    color: Colors.white,
    fontSize: RFValue(16),
    ...globalStyles.textBold,
    marginRight: wp('3%'), // Space between icon and text in RTL
  },
});
  useFocusEffect(
    useCallback(() => {
      loadData();
      // setSelectedDayInfo(normalizeDateToDayStart(new Date())); // Uncomment if you have this function/variable
      return () => {};
    }, [loadData])
  );

  // New function to save today's state to the historical log (can be called at midnight or with a button)
  const saveTodayToHistory = useCallback(async () => {
    try {
      const todayISO = new Date().toISOString().split('T')[0];
      const taken = medicines.reduce((acc, medicine) => {
        if (Object.keys(medicine.takenTimes || {}).length > 0 &&
            Object.values(medicine.takenTimes || {}).some(status => status)) {
          (acc as Record<number, any>)[medicine.id] = {
            name: medicine.name,
            takenTimes: medicine.takenTimes || {}
          };
        }
        return acc;
      }, {});
      const dailyLog = {
        date: todayISO,
        taken
      };
      await LogService.saveDailyLog(todayISO, dailyLog);
      Alert.alert('تم', 'تم حفظ حالة اليوم في السجل التاريخي.');
    } catch (error) {
      Alert.alert('خطأ', 'فشل في حفظ حالة اليوم في السجل التاريخي.');
    }
  }, [medicines]);

  // Initialize today's log: for each medicine, for each time, ensure takenTimes[time] is set to false if not present
  const initializeDailyLogForToday = useCallback(async () => {
    const today = new Date().toISOString().split('T')[0];
    const storedMedicines = await DatabaseService.getMedicines();
    let changed = false;
    const updatedMedicines = storedMedicines.map(med => {
      const updatedTakenTimes: { [key: string]: boolean } = { ...med.takenTimes };
      med.exactTimes.forEach(time => {
        if (updatedTakenTimes[time] !== true) {
          updatedTakenTimes[time] = false;
        }
      });
      if (JSON.stringify(updatedTakenTimes) !== JSON.stringify(med.takenTimes)) {
        changed = true;
        return { ...med, takenTimes: updatedTakenTimes };
      }
      return med;
    });
    if (changed) {
      for (const med of updatedMedicines) {
        await DatabaseService.updateMedicine(med.id, { takenTimes: med.takenTimes });
      }
      setMedicines(updatedMedicines);
    }
    // Build and save a complete daily log for today
    const taken: Record<number, any> = {};
    updatedMedicines.forEach(med => {
      taken[med.id] = {
        name: med.name,
        takenTimes: { ...med.takenTimes }
      };
    });
    const dailyLog = { date: today, taken };
    await LogService.saveDailyLog(today, dailyLog);
    await refreshDailyLogs();
  }, [refreshDailyLogs]);

  // Call this on app load
  useEffect(() => {
    initializeDailyLogForToday();
  }, [initializeDailyLogForToday]);

  return (
    <View style={responsiveStyles.container}>
      <StatusBar style="light" />
      <LinearGradient
  colors={[Colors.primaryDark, Colors.primary]}
  start={{x: 0, y: 0}}
  end={{x: 1, y: 1}}
  style={responsiveStyles.header}
>
  <View style={responsiveStyles.headerContent}>
    <Text style={responsiveStyles.dateText}>
      {formatArabicDate(currentDate).dateString}
    </Text>
    <Text style={responsiveStyles.timeText}>
      {formatArabicDate(currentDate).timeString}
    </Text>
  </View>
</LinearGradient>
      <ScrollView
        style={responsiveStyles.content}
        contentContainerStyle={{ paddingBottom: hp('25%') }}
        showsVerticalScrollIndicator={false}
      >
        {medicines.length === 0 ? (
          <View style={responsiveStyles.emptyState}>
            <LinearGradient
              colors={[Colors.primaryLight, Colors.primary]}
              start={{x: 0, y: 0}}
              end={{x: 1, y: 1}}
              style={responsiveStyles.emptyStateIcon}
            >
              <Ionicons name="medical-outline" size={wp('12.5%')} color="white" />
            </LinearGradient>
            <Text style={responsiveStyles.emptyListText}>لم يتم إضافة أي أدوية بعد</Text>
            <Text style={responsiveStyles.emptySubText}>اضغط على زر الإضافة لبدء تتبع أدويتك</Text>
          </View>
        ) : (
          medicines.map((medicine) => (
            <View key={medicine.id} style={responsiveStyles.medicineCard}>
              <LinearGradient
                colors={['#ffffff', '#f1f5f9']}
                start={{x: 0, y: 0}}
                end={{x: 1, y: 1}}
                style={responsiveStyles.cardGradient}
              >
                <View style={responsiveStyles.cardHeader}>
                  {medicine.photo ? (
                    <Image
                      source={{ uri: medicine.photo }}
                      style={responsiveStyles.medicineImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={responsiveStyles.medicineImagePlaceholder}>
                      <Ionicons name="medkit-outline" size={wp('7.5%')} color={Colors.primary} />
                    </View>
                  )}
                  <View style={responsiveStyles.medicineInfo}>
                    <Text style={responsiveStyles.medicineName}>{medicine.name}</Text>
                    <View style={responsiveStyles.quantityContainer}>
                      <Ionicons name="albums-outline" size={wp('3.5%')} color="#64748b" />
                      <Text style={responsiveStyles.medicineQuantity}>الكمية: {medicine.quantity}</Text>
                    </View>
                  </View>
                </View>

                <View style={responsiveStyles.timesContainer}>
                  {medicine.exactTimes.map((time, timeIndex) => {
                    const isTaken = medicine.takenTimes?.[time] || false;
                    const isDueSoon = isMedicineDueSoon(time);
                    return (
                      <View
                        key={timeIndex}
                        style={responsiveStyles.timeButtonContainer}
                      >
                        <LinearGradient
                          colors={
                            isTaken
                              ? ['#4CAF50', '#45a049']
                              : isDueSoon
                                ? ['#ff6b6b', '#ee5a52']
                                : ['#e2e8f0', '#cbd5e1']
                          }
                          start={{x: 0, y: 0}}
                          end={{x: 1, y: 1}}
                          style={responsiveStyles.timeButtonGradient}
                        >
                          <View style={responsiveStyles.timeDisplayRow}>
                            <Text style={
                              isTaken || isDueSoon
                                ? responsiveStyles.timeButtonTextTaken
                                : responsiveStyles.timeButtonText
                            }>
                              {time}
                            </Text>
                            {isTaken && (
                              <Ionicons
                                name="checkmark-circle"
                                size={wp('4%')}
                                color="white"
                                style={{ marginLeft: wp('0.75%') }}
                              />
                            )}
                            {!isTaken && isDueSoon && (
                              <Ionicons
                                name="time"
                                size={wp('4%')}
                                color="white"
                                style={{ marginLeft: wp('0.75%') }}
                              />
                            )}
                          </View>
                          <TouchableOpacity
                            onPress={() => handleTakeMedicine(medicine.id, time)}
                            style={[
                              responsiveStyles.takeActionButton,
                              {
                                backgroundColor: isTaken
                                  ? 'rgba(255,255,255,0.2)'
                                  : 'rgba(0,0,0,0.1)',
                              }
                            ]}
                          >
                            <Text style={responsiveStyles.takeActionButtonText}>
                              {isTaken ? 'تراجع' : 'تناول الدواء'}
                            </Text>
                          </TouchableOpacity>
                        </LinearGradient>
                      </View>
                    );
                  })}
                </View>

                <View style={responsiveStyles.progressContainer}>
                  <View style={responsiveStyles.progressInfo}>
                    <Text style={responsiveStyles.progressText}>
                      التقدم اليومي: {Object.values(medicine.takenTimes || {}).filter(Boolean).length} / {medicine.exactTimes.length}
                    </Text>
                    <Text style={responsiveStyles.progressPercentage}>
                      {medicine.exactTimes.length > 0
                        ? `${Math.round((Object.values(medicine.takenTimes || {}).filter(Boolean).length / medicine.exactTimes.length) * 100)}%`
                        : '0%'}
                    </Text>
                  </View>
                  <View style={responsiveStyles.progressBar}>
                    <LinearGradient
                      colors={['#4CAF50', '#45a049']}
                      start={{x: 0, y: 0}}
                      end={{x: 1, y: 0}}
                      style={[
                        responsiveStyles.progressFill,
                        {
                          width: medicine.exactTimes.length > 0
                            ? `${(Object.values(medicine.takenTimes || {}).filter(Boolean).length / medicine.exactTimes.length) * 100}%`
                            : '0%'
                        }
                      ]}
                    />
                  </View>
                </View>

                <View style={responsiveStyles.actionButtonsContainer}>
                  <TouchableOpacity onPress={() => openEditModal(medicine)} style={responsiveStyles.actionButton}>
                    <Ionicons name="create-outline" size={wp('4.5%')} color={Colors.primary} />
                    <Text style={responsiveStyles.actionButtonText}>تعديل</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleDeleteMedicine(medicine.id)}
                    style={[responsiveStyles.actionButton, { marginLeft: wp('2%') }]}
                  >
                    <Ionicons name="trash-outline" size={wp('4.5%')} color="#ff6b6b" />
                    <Text style={[responsiveStyles.actionButtonText, { color: '#ff6b6b' }]}>حذف</Text>
                  </TouchableOpacity>
                </View>
              </LinearGradient>
            </View>
          ))
        )}
      </ScrollView>

      <BottomBar currentRoute="home" />

      <TouchableOpacity style={responsiveStyles.addButton} onPress={openAddModal}>
        <LinearGradient
          colors={[Colors.primaryLight, Colors.primary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={responsiveStyles.addButtonGradient}
        >
          <Ionicons name="add" size={wp('6%')} color={Colors.white} />
          <Text style={responsiveStyles.addButtonText}>إضافة دواء</Text>
        </LinearGradient>
      </TouchableOpacity>

      
      <Modal
  visible={isModalVisible}
  animationType="slide" // "slide" works perfectly with justifyContent: 'flex-end'
  transparent={true}
  onRequestClose={closeModal}
>
  <View style={creativeStyles.modalContainer}>
    <View style={creativeStyles.modalContent}>
      
      <View style={creativeStyles.modalHeader}>
        <Text style={creativeStyles.modalTitle}>
          {editingMedicine ? 'تعديل الدواء' : 'إضافة دواء جديد'}
        </Text>
        <TouchableOpacity onPress={closeModal} style={creativeStyles.closeButton}>
          <Ionicons name="close" size={wp('5%')} color={Colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Card 1: Medicine Name */}
        <View style={creativeStyles.inputCard}>
          <Text style={creativeStyles.label}>اسم الدواء</Text>
          <View style={creativeStyles.inputWrapper}>
            <TextInput
              style={creativeStyles.input}
              value={medicineName}
              onChangeText={setMedicineName}
              placeholder="مثال: بانادول"
              maxLength={50}
            />
            <Ionicons name="medkit-outline" size={wp('5%')} color={Colors.primary} style={creativeStyles.inputIcon}/>
          </View>
        </View>

        {/* Card 2: Quantity */}
        <View style={creativeStyles.inputCard}>
          <Text style={creativeStyles.label}>الكمية  (حبة)</Text>
          <View style={creativeStyles.inputWrapper}>
            <TextInput
              style={creativeStyles.input}
              value={quantity}
              onChangeText={setQuantity}
              placeholder="مثال: 30"
              keyboardType="numeric"
            />
            <Ionicons name="albums-outline" size={wp('5%')} color={Colors.primary} style={creativeStyles.inputIcon} />
          </View>
        </View>

        {/* Card 3: Photo Upload */}
        <View style={creativeStyles.inputCard}>
            <Text style={creativeStyles.label}>صورة الدواء (اختياري)</Text>
            <TouchableOpacity style={creativeStyles.photoUploadContainer} onPress={pickImage}>
                {medicinePhoto ? (
                    <>
                        <Image source={{ uri: medicinePhoto }} style={creativeStyles.imagePreview} resizeMode="cover" />
                        <TouchableOpacity style={creativeStyles.removeImageButton} onPress={() => setMedicinePhoto(null)}>
                            <Ionicons name="trash-outline" size={wp('5%')} color={Colors.primary} />
                        </TouchableOpacity>
                    </>
                ) : (
                    <>
                        <Ionicons name="camera-outline" size={wp('10%')} color={Colors.primary} />
                        <Text style={creativeStyles.photoUploadText}>إضافة صورة</Text>
                    </>
                )}
            </TouchableOpacity>
        </View>

        {/* Card 4: Timing */}
        <View style={creativeStyles.inputCard}>
            <View style={{flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center'}}>
                <Text style={creativeStyles.label}>أوقات الجرعات</Text>
                <TouchableOpacity onPress={showTimePickerModal}>
                    <Ionicons name="add-circle" size={wp('8%')} color={Colors.primary} />
                </TouchableOpacity>
            </View>
            <View style={creativeStyles.exactTimesContainer}>
              {exactTimes.map((time, index) => (
                <View key={index} style={creativeStyles.exactTimeChip}>
                  <Text style={creativeStyles.exactTimeText}>{time}</Text>
                  <TouchableOpacity onPress={() => removeExactTime(index)}>
                    <Ionicons name="close-circle-outline" size={wp('5%')} color={Colors.primary} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
        </View>

        {showTimePicker && (
          <DateTimePicker
            value={pickerTime}
            mode="time"
            is24Hour={true}
            display="default"
            onChange={onTimeChange}
          />
        )}

        <TouchableOpacity style={creativeStyles.saveButton} onPress={handleSaveMedicine}>
          <LinearGradient
            colors={[Colors.primaryLight, Colors.primary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={creativeStyles.saveButtonGradient}
          >
            <Ionicons name="save-outline" size={wp('6%')} color={Colors.white} />
            <Text style={creativeStyles.saveButtonText}>
              {editingMedicine ? 'تحديث البيانات' : 'حفظ الدواء'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </View>
  </View>
</Modal>
    </View>
  );
}
