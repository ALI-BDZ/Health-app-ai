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

  const scheduleMedicineNotifications = useCallback(async (medicine: Medicine) => {
    const status = await requestNotificationPermissions();
    if (status !== 'granted') {
      console.warn('Notification permission not granted');
      return;
    }
    await setupNotificationChannel();

    const existingNotifications = await Notifications.getAllScheduledNotificationsAsync();
    for (const notification of existingNotifications) {
      if (notification.identifier.startsWith(`medicine-${medicine.id}-`)) {
        await Notifications.cancelScheduledNotificationAsync(notification.identifier);
      }
    }

    for (const time of medicine.exactTimes) {
      const [hour, minute] = time.split(':').map(Number);
      const identifier = `medicine-${medicine.id}-${time.replace(':', '-')}`;

      try {
        // Calculate seconds until next occurrence of this time
        const now = new Date();
        const scheduledTime = new Date();
        scheduledTime.setHours(hour, minute, 0, 0);
        
        // If the time has already passed today, schedule for tomorrow
        if (scheduledTime <= now) {
          scheduledTime.setDate(scheduledTime.getDate() + 1);
        }
        
        const secondsUntilTrigger = Math.floor((scheduledTime.getTime() - now.getTime()) / 1000);

        await Notifications.scheduleNotificationAsync({
          identifier,
          content: {
            title: `💊 حان وقت دواء: ${medicine.name}`,
            body: `تذكّر أن تأخذ جرعتك الآن. الكمية المتبقية: ${medicine.quantity}.`,
            data: { medicineId: medicine.id, time },
            sound: 'default',
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
            channelId: 'medicine-reminders',
            seconds: secondsUntilTrigger,
            repeats: true,
          },
        });
      } catch (error) {
        console.error(`Failed to schedule notification:`, error);
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
      const medicinesToUpdateInDB = [];
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
              mediaTypes: ImagePicker.MediaType.Images,
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
      const hours = currentDate.getHours().toString().padStart(2, '0');
      const minutes = currentDate.getMinutes().toString().padStart(2, '0');
      const formattedTime = `${hours}:${minutes}`;
      if (formattedTime && !exactTimes.includes(formattedTime)) {
        setExactTimes((prevTimes) => {
          const newTimes = [...prevTimes, formattedTime];
          return newTimes.sort();
        });
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
            if (!isTaken && medicine.quantity > 0) {
              newQuantity = medicine.quantity - 1;
            }
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
                ? `تم تسجيل تناول دواء "${medicine.name}" بنجاح! 💊✅ (الكمية المتبقية: ${newQuantity})`
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
      paddingTop: hp('8%'),
      paddingHorizontal: wp('5%'),
      paddingBottom: hp('2.5%'),
      borderBottomLeftRadius: wp('7.5%'),
      borderBottomRightRadius: wp('7.5%'),
      justifyContent: 'center',
      alignItems: 'center',
      elevation: 5,
      shadowColor: Colors.primaryDark,
      shadowOffset: { width: 0, height: hp('0.5%') },
      shadowOpacity: 0.3,
      shadowRadius: wp('1.25%'),
    },
    headerContent: {
      alignItems: 'center',
    },
    dateText: {
      fontSize: RFValue(14),
      color: 'rgba(255,255,255,0.8)',
      ...globalStyles.textDefault,
    },
    timeText: {
      fontSize: RFValue(28),
      fontWeight: 'bold',
      color: Colors.white,
      marginTop: hp('0.6%'),
      ...globalStyles.textBold,
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
      width: dimensions.isPortrait ? wp('30%') : wp('20%'),
      height: hp('12%'),
      borderRadius: wp('5%'),
      marginRight: dimensions.isPortrait ? wp('5%') : 0,
      borderWidth: 1,
      borderColor: Colors.primaryLight,
      aspectRatio: 4/3,
    },
    medicineImagePlaceholder: {
      width: dimensions.isPortrait ? wp('30%') : wp('20%'),
      aspectRatio: 4/3,
      marginRight: dimensions.isPortrait ? wp('5%') : 0,
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
      marginBottom: hp('0.3%'),
      textAlign: 'right',
    },
    quantityContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    medicineQuantity: {
      fontSize: RFValue(13),
      color: Colors.textSecondary,
      marginLeft: wp('1.25%'),
      ...globalStyles.textDefault,
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
      marginBottom: hp('0.6%'),
      justifyContent: 'flex-start',
    },
    timeButtonContainer: {
      margin: wp('1%'),
      width: dimensions.isPortrait ? '48%' : '31%',
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
      bottom: hp('13%'),
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
    modalContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      padding: wp('5%'),
    },
    modalContent: {
      backgroundColor: Colors.background,
      borderRadius: wp('5%'),
      width: wp('90%'),
      maxHeight: hp('70%'),
      overflow: 'hidden',
      elevation: 10,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: wp('5%'),
      borderTopLeftRadius: wp('5%'),
      borderTopRightRadius: wp('5%'),
      backgroundColor: Colors.primary,
    },
    modalTitle: {
      fontSize: RFValue(18),
      fontWeight: 'bold',
      color: Colors.white,
      ...globalStyles.textBold,
    },
    modalBody: {
      padding: wp('5%'),
      flexGrow: 1,
      minHeight: hp('25%'),
    },
    label: {
      fontSize: RFValue(14),
      color: Colors.textPrimary,
      marginBottom: hp('1%'),
      marginTop: hp('1.8%'),
      ...globalStyles.textBold,
      textAlign: 'right',
    },
    input: {
      backgroundColor: '#f8fafc',
      borderWidth: 1,
      borderColor: '#cbd5e1',
      borderRadius: wp('2.5%'),
      padding: wp('3%'),
      fontSize: RFValue(14),
      color: Colors.textPrimary,
      textAlign: 'right',
      ...globalStyles.textDefault,
      height: hp('6%'),
    },
    photoButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#e0f2f7',
      padding: wp('3%'),
      borderRadius: wp('2.5%'),
      marginTop: hp('1.8%'),
      borderWidth: 1,
      borderColor: Colors.primaryLight,
    },
    photoButtonText: {
      marginLeft: wp('2.5%'),
      fontSize: RFValue(14),
      color: Colors.primary,
      ...globalStyles.textDefault,
    },
    imagePreviewContainer: {
      alignItems: 'center',
      marginTop: hp('1.8%'),
      position: 'relative',
    },
    imagePreview: {
      width: wp('40%'),
      height: wp('40%'),
      borderRadius: wp('2%'),
    },
    removeImageButton: {
      position: 'absolute',
      top: wp('2%'),
      right: wp('2%'),
      backgroundColor: 'white',
      borderRadius: wp('3.75%'),
      padding: wp('1%'),
    },
    exactTimesContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginTop: hp('0.6%'),
    },
    exactTimeChip: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#e0f2f7',
      borderRadius: wp('5%'),
      paddingVertical: hp('0.75%'),
      paddingHorizontal: wp('3%'),
      marginRight: wp('2.5%'),
      marginBottom: hp('1%'),
      borderWidth: 1,
      borderColor: Colors.primaryLight,
    },
    exactTimeText: {
      fontSize: RFValue(12),
      color: Colors.primary,
      marginRight: wp('1.25%'),
      ...globalStyles.textDefault,
    },
    removeTimeButton: {
      padding: wp('0.5%'),
    },
    addTimeButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#f0f4f8',
      borderRadius: wp('5%'),
      paddingVertical: hp('1%'),
      paddingHorizontal: wp('3.75%'),
      marginBottom: hp('1.2%'),
      borderWidth: 1,
      borderColor: '#cbd5e1',
    },
    addTimeButtonText: {
      marginLeft: wp('2%'),
      fontSize: RFValue(12),
      color: Colors.primary,
      ...globalStyles.textDefault,
    },
    saveButton: {
      marginTop: hp('2.5%'),
      marginBottom: hp('2%'),
      borderRadius: wp('7.5%'),
      overflow: 'hidden',
      elevation: 5,
      shadowColor: Colors.primary,
      shadowOffset: { width: 0, height: hp('0.375%') },
      shadowOpacity: 0.2,
      shadowRadius: wp('1%'),
    },
    saveButtonGradient: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: hp('1.8%'),
    },
    saveButtonText: {
      color: Colors.white,
      fontSize: RFValue(14),
      ...globalStyles.textBold,
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
            {currentDate.toLocaleDateString('ar-EG', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </Text>
          <Text style={responsiveStyles.timeText}>
            {currentDate.toLocaleTimeString('ar-EG', {
              hour: '2-digit',
              minute: '2-digit'
            })}
          </Text>
        </View>
      </LinearGradient>
      <ScrollView
        style={responsiveStyles.content}
        contentContainerStyle={{ paddingBottom: hp('18%') }}
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
        animationType="slide"
        transparent={true}
        onRequestClose={closeModal}
      >
        <View style={responsiveStyles.modalContainer}>
          <View style={responsiveStyles.modalContent}>
            <View style={responsiveStyles.modalHeader}>
              <Text style={responsiveStyles.modalTitle}>
                {editingMedicine ? 'تعديل الدواء' : 'إضافة دواء جديد'}
              </Text>
              <TouchableOpacity onPress={closeModal}>
                <Ionicons name="close" size={wp('6%')} color={Colors.white} />
              </TouchableOpacity>
            </View>

            <ScrollView style={responsiveStyles.modalBody}>
              <Text style={responsiveStyles.label}>اسم الدواء</Text>
              <TextInput
                style={responsiveStyles.input}
                value={medicineName}
                onChangeText={setMedicineName}
                placeholder="أدخل اسم الدواء"
                maxLength={50}
              />

              <Text style={responsiveStyles.label}>صورة الدواء</Text>
              <TouchableOpacity style={responsiveStyles.photoButton} onPress={pickImage}>
                <Ionicons name="camera" size={wp('5%')} color={Colors.primary} />
                <Text style={responsiveStyles.photoButtonText}>
                  {medicinePhoto ? 'تغيير الصورة' : 'إضافة صورة'}
                </Text>
              </TouchableOpacity>

              {medicinePhoto && (
                <View style={responsiveStyles.imagePreviewContainer}>
                  <Image
                    source={{ uri: medicinePhoto }}
                    style={responsiveStyles.imagePreview}
                    resizeMode="cover"
                  />
                  <TouchableOpacity
                    style={responsiveStyles.removeImageButton}
                    onPress={() => setMedicinePhoto(null)}
                  >
                    <Ionicons name="close-circle" size={wp('5.5%')} color={Colors.primary} />
                  </TouchableOpacity>
                </View>
              )}

              <Text style={responsiveStyles.label}>الكمية المتبقية</Text>
              <TextInput
                style={responsiveStyles.input}
                value={quantity}
                onChangeText={setQuantity}
                placeholder="مثال: 2"
                keyboardType="numeric"
              />

              <Text style={responsiveStyles.label}>الأوقات المحددة</Text>
              <View style={responsiveStyles.exactTimesContainer}>
                {exactTimes.map((time, index) => (
                  <View key={index} style={responsiveStyles.exactTimeChip}>
                    <Text style={responsiveStyles.exactTimeText}>{time}</Text>
                    <TouchableOpacity
                      style={responsiveStyles.removeTimeButton}
                      onPress={() => removeExactTime(index)}
                    >
                      <Ionicons name="close" size={wp('4%')} color={Colors.primary} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>

              <TouchableOpacity style={responsiveStyles.addTimeButton} onPress={showTimePickerModal}>
                <Ionicons name="add-circle-outline" size={wp('5%')} color={Colors.primary} />
                <Text style={responsiveStyles.addTimeButtonText}>إضافة وقت</Text>
              </TouchableOpacity>

              {showTimePicker && (
                <DateTimePicker
                  value={pickerTime}
                  mode="time"
                  is24Hour={true}
                  display="default"
                  onChange={onTimeChange}
                  textColor={Colors.primary}
                />
              )}

              <TouchableOpacity
                style={responsiveStyles.saveButton}
                onPress={handleSaveMedicine}
              >
                <LinearGradient
                  colors={[Colors.primaryLight, Colors.primary]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={responsiveStyles.saveButtonGradient}
                >
                  <Ionicons name="save-outline" size={wp('5%')} color={Colors.white} />
                  <Text style={responsiveStyles.saveButtonText}>
                    {editingMedicine ? 'تحديث الدواء' : 'حفظ الدواء'}
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
