import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  Dimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import BottomBar from './BottomBar';
import { DatabaseService, Patient, ResponsiblePerson } from './databaseService';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { globalStyles } from './globalstyle';

Dimensions.get('window');

export default function ProfileScreen() {
  const [patient, setPatient] = useState<Patient | null>(null);
  const [responsiblePerson, setResponsiblePerson] = useState<ResponsiblePerson | null>(null);
  const [loading, setLoading] = useState(true);

  const [fontsLoaded] = useFonts({
    'JannaLT-Regular': require('../assets/fonts/Janna LT Bold.ttf'),
  });
  
  if (!fontsLoaded) {
    return null; // Return null instead of SplashScreen component
  }

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const currentUserId = await AsyncStorage.getItem('currentUserId');
      if (!currentUserId) {
        setPatient(null);
      } else {
        const patients = await DatabaseService.getPatients();
        const found = patients.find(p => p.id.toString() === currentUserId);
        setPatient(found || null);
        if (found?.responsiblePersonId) {
          const reps = await DatabaseService.getResponsiblePersons();
          setResponsiblePerson(
            reps.find(r => r.id === found.responsiblePersonId) || null
          );
        }
      }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (e) {
      Alert.alert('خطأ', 'فشل في تحميل البيانات');
    }
    setLoading(false);
  };

  const handleDeleteAll = () => {
    Alert.alert(
      'تأكيد الحذف',
      'هل تريد حذف جميع البيانات؟',
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'حذف',
          style: 'destructive',
          onPress: async () => {
            await DatabaseService.deleteAllPatients();
            await DatabaseService.deleteAllResponsiblePersons();
            await AsyncStorage.removeItem('currentUserId');
            setPatient(null);
            setResponsiblePerson(null);
            Alert.alert('تم', 'تم حذف جميع البيانات');
          },
        },
      ]
    );
  };

  const formatDate = (d: string) => {
    try {
      return new Date(d).toLocaleString('ar-EG');
    } catch {
      return d;
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient
        colors={['#3b82f6', '#3b82f6', '#60a5fa']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <View style={styles.headerContent}>
          <View style={styles.profileAvatarContainer}>
            <View style={styles.profileAvatarInner}>
              <Image
                source={require('./../assets/images/logo.png')}
                style={styles.profileAvatar}
                resizeMode="contain"
              />
            </View>
          </View>
          <Text style={[
  globalStyles.textDefault,
  {
    fontSize: 30,
    color: '#fff',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
    marginBottom: 16,
  },
  { fontFamily: 'JannaLT-Regular', fontWeight: 'normal' }
]}>
  الملف الشخصي
</Text>
          
          
          
          
          
          
          
          
          
          
          
         
         
         
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.loadingBox}>
            <View style={styles.loadingSpinner}>
              <Ionicons name="refresh-circle" size={48} color="#667eea" />
            </View>
            <Text style={[styles.loadingText, globalStyles.textDefault]}>جاري التحميل...</Text>
          </View>
        ) : !patient ? (
          <View style={styles.emptyBox}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="person-outline" size={64} color="#cbd5e1" />
            </View>
            <Text style={[styles.emptyText, globalStyles.textDefault]}>لا توجد بيانات</Text>
            <Text style={[styles.emptySubtext, globalStyles.textDefault]}>يرجى تسجيل معلومات المريض</Text>
          </View>
        ) : (
          <>
            <View style={styles.infoCard}>
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderIcon}>
                  <Ionicons name="person-circle" size={24} color="#667eea" />
                </View>
                <Text style={[styles.cardTitle, globalStyles.textDefault]}>معلومات المريض</Text>
              </View>
              <View style={styles.cardBody}>
                <Row label="الاسم" value={`${patient.firstName} ${patient.lastName}`} icon="person" />
                <Divider />
                <Row label="الهاتف" value={patient.phoneNumber} icon="call" />
                <Divider />
                <Row
                  label=" طريقة التسجيل"
                  value={patient.registeredBy === 'patient' ? 'المريض نفسه' : 'شخص مسؤول'}
                  icon="information-circle"
                />
                <Divider />
                <Row label="تاريخ التسجيل" value={formatDate(patient.createdAt)} icon="time" />
              </View>
            </View>

            {responsiblePerson && (
              <View style={styles.infoCard}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardHeaderIcon}>
                    <Ionicons name="people-circle" size={24} color="#f093fb" />
                  </View>
                  <Text style={[styles.cardTitle, globalStyles.textDefault]}>المسؤول</Text>
                </View>
                <View style={styles.cardBody}>
                  <Row
                    label="الاسم"
                    value={`${responsiblePerson.firstName} ${responsiblePerson.lastName}`}
                    icon="person"
                  />
                  <Divider />
                  <Row label="الهاتف" value={responsiblePerson.phoneNumber} icon="call" />
                  <Divider />
                  <Row label="تاريخ التسجيل" value={formatDate(responsiblePerson.createdAt)} icon="time" />
                </View>
              </View>
            )}
          </>
        )}

        <TouchableOpacity style={styles.deleteBtn} onPress={handleDeleteAll}>
          <LinearGradient
            colors={['#ff6b6b', '#ee5a52']}
            style={styles.deleteBtnGradient}
          >
            <Ionicons name="trash" size={20} color="#fff" />
            <Text style={[styles.deleteText, globalStyles.textDefault]}>حذف الكل</Text>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>

      <BottomBar currentRoute="profile" />
    </View>
  );
}

// Reusable row
function Row({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <View style={styles.row}>
      <View style={styles.rowIconContainer}>
        <Ionicons name={icon as any} size={18} color="#667eea" />
      </View>
      <Text style={[styles.rowLabel, globalStyles.textDefault]}>{label}</Text>
      <Text style={[styles.rowValue, globalStyles.textDefault]}>{value}</Text>
    </View>
  );
}

// Divider component
function Divider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc'
  },
  headerGradient: {
    height: 200,
    paddingTop: 50,
    paddingHorizontal: 20,
    borderBottomRightRadius: 35,
    borderBottomLeftRadius: 35,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  headerContent: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center'
  },
  profileAvatarContainer: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
    marginBottom: 15,
  },
  profileAvatarInner: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.8)',
  },
  profileAvatar: {
    width: 65,
    height: 65,
  },
  screenTitle: {
    fontSize: 24,
    color: '#fff',
    fontWeight: '800',
    marginBottom: 5,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  screenSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
    textAlign: 'center',
  },
  scrollContainer: {
    padding: 20,
    paddingTop: 25,
    paddingBottom: 100
  },
  loadingBox: {
    alignItems: 'center',
    marginTop: 60,
    backgroundColor: '#fff',
    borderRadius: 25,
    padding: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  loadingSpinner: {
    marginBottom: 15,
  },
  loadingText: {
    fontSize: 16,
    color: '#667eea',
    fontWeight: '600'
  },
  emptyBox: {
    alignItems: 'center',
    marginTop: 60,
    backgroundColor: '#fff',
    borderRadius: 25,
    padding: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  emptyIconContainer: {
    backgroundColor: '#f1f5f9',
    borderRadius: 50,
    padding: 20,
    marginBottom: 20,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 25,
    marginBottom: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(102, 126, 234, 0.1)',
  },
  cardHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  cardHeaderIcon: {
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    borderRadius: 15,
    padding: 8,
    marginLeft: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    flex: 1,
  },
  cardBody: {
    paddingHorizontal: 5
  },
  row: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingVertical: 15,
    minHeight: 50,
  },
  rowIconContainer: {
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    borderRadius: 12,
    padding: 8,
    marginLeft: 15,
  },
  rowLabel: {
    width: 90,
    fontSize: 14,
    color: '#64748b',
    textAlign: 'right',
    fontWeight: '600',
  },
  rowValue: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
    textAlign: 'right',
    lineHeight: 22,
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginHorizontal: 10,
  },
  deleteBtn: {
    marginTop: 20,
    borderRadius: 25,
    shadowColor: '#ff6b6b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  deleteBtnGradient: {
    flexDirection: 'row-reverse',
    paddingVertical: 16,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteText: {
    color: '#fff',
    fontSize: 16,
    marginRight: 10,
    fontWeight: '700',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});