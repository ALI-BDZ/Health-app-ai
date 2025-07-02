import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage'; // Add this line
// Remove unused Button import
import { DatabaseService, Patient } from './databaseService';
import { globalStyles } from './globalstyle'; // Import globalStyles

type RegistrationType = 'patient' | 'responsible';

interface FormData {
  firstName: string;
  lastName: string;
  phoneNumber: string;
  registrationType: RegistrationType | null;
}

interface ResponsibleFormData {
  firstName: string;
  lastName: string;
  phoneNumber: string;
}

export default function InfoSubmitScreen() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  // eslint-disable-next-line no-empty-pattern
  const [] = useState(false);

  // Main form data
  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    phoneNumber: '',
    registrationType: 'patient',
  });

  // Responsible person form data
  const [responsibleData, setResponsibleData] = useState<ResponsibleFormData>({
    firstName: '',
    lastName: '',
    phoneNumber: '',
  });

  useEffect(() => {
  const initialize = async () => {
    try {
      const patients = await DatabaseService.getPatients();

      if (patients.length === 1) {
        // Save the ID to AsyncStorage just in case it's not already there
        await AsyncStorage.setItem('currentUserId', patients[0].id.toString());
        router.replace('/home'); // ✅ valid one patient
      } else if (patients.length > 1) {
        // ❌ Corrupt state — delete them all and clear stored ID
        await DatabaseService.deleteAllPatients();
        await AsyncStorage.removeItem('currentUserId');
      } else {
        // ⛔ Zero patients → just proceed to form normally
      }
    } catch (error) {
      console.error("Error initializing patient data:", error);
      // Optional: show fallback or alert
    }
  };

  initialize();
}, [router]);


  // Animation values
  const slideAnim = new Animated.Value(0);
  const fadeAnim = new Animated.Value(1);

  const handleChange = (type: 'patient' | 'responsible', field: string, value: string) => {
    if (type === 'patient') {
      setFormData(prev => ({ ...prev, [field]: value }));
    } else {
      setResponsibleData(prev => ({ ...prev, [field]: value }));
    }
  };

  const handleSave = async () => {
    try {
      let responsiblePersonId = null;
      if (formData.registrationType === 'responsible') {
        const newResponsiblePerson = await DatabaseService.saveResponsiblePerson(responsibleData);
        responsiblePersonId = newResponsiblePerson.id;
      }

      const newPatient: Omit<Patient, 'id' | 'createdAt' | 'updatedAt'> = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        phoneNumber: formData.phoneNumber,
        registeredBy: formData.registrationType || 'patient',
        responsiblePersonId,
      };

     const savedPatient = await DatabaseService.savePatient(newPatient);
    await AsyncStorage.setItem('currentUserId', savedPatient.id.toString());

     
     

      Alert.alert('نجاح', 'تم حفظ بياناتك بنجاح', [
        {
          text: 'موافق',
          onPress: () => router.replace('/home'), // Changed from '/' to '/home'
        },
      ]);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      Alert.alert('Error', 'Failed to save information');
    }
  };

  const renderRegistrationForm = () => (
    <Animated.View
      style={[
        styles.formContainer,
        {
          transform: [{
            translateX: slideAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, -400],
            }),
          }],
          opacity: fadeAnim,
        }
      ]}
    >
      <View style={styles.headerContainer}>
        <Ionicons name="person-add" size={40} color="#60a5fa" />
        <Text style={[styles.title, globalStyles.textDefault]}>تسجيل بيانات المريض</Text>
        <Text style={[styles.subtitle, globalStyles.textDefault]}>املأ البيانات المطلوبة بعناية</Text>
      </View>
      <View style={styles.inputContainer}>
        <Text style={[styles.label, globalStyles.textDefault]}>اسم المريض</Text>
        <View style={styles.inputWrapper}>
          <Ionicons name="person" size={20} color="#64748b" style={styles.inputIcon} />
          <TextInput
            style={[styles.input, globalStyles.textDefault]}
            placeholder="الاسم الأول"
            value={formData.firstName}
            onChangeText={(text) => handleChange('patient', 'firstName', text)}
            placeholderTextColor="#94a3b8"
          />
        </View>

        <View style={styles.inputWrapper}>
          <Ionicons name="person" size={20} color="#64748b" style={styles.inputIcon} />
          <TextInput
            style={[styles.input, globalStyles.textDefault]}
            placeholder="اسم العائلة"
            value={formData.lastName}
            onChangeText={(text) => handleChange('patient', 'lastName', text)}
            placeholderTextColor="#94a3b8"
          />
        </View>
      </View>
      <View style={styles.inputContainer}>
        <Text style={[styles.label, globalStyles.textDefault]}>رقم الهاتف</Text>
        <View style={styles.inputWrapper}>
          <Ionicons name="call" size={20} color="#64748b" style={styles.inputIcon} />
          <TextInput
            style={[styles.input, globalStyles.textDefault]}
            placeholder="05xxxxxxxx"
            value={formData.phoneNumber}
            onChangeText={(text) => handleChange('patient', 'phoneNumber', text)}
            keyboardType="phone-pad"
            placeholderTextColor="#94a3b8"
          />
        </View>
      </View>
      <View style={styles.inputContainer}>
        <Text style={[styles.label, globalStyles.textDefault]}>من يقوم بالتسجيل؟</Text>

        <TouchableOpacity
          style={[
            styles.optionButton,
            formData.registrationType === 'patient' && styles.optionButtonSelected
          ]}
          onPress={() => setFormData(prev => ({ ...prev, registrationType: 'patient' }))}
        >
          <LinearGradient
            colors={
              formData.registrationType === 'patient'
                ? ['#60a5fa', '#60a5fa']
                : ['#f8fafc', '#f1f5f9']
            }
            style={styles.optionGradient}
          >
            <Ionicons
              name="medical"
              size={24}
              color={formData.registrationType === 'patient' ? '#ffffff' : '#64748b'}
            />
            <Text
              style={[
                styles.optionText,
                formData.registrationType === 'patient' && styles.optionTextSelected,
                globalStyles.textDefault
              ]}
            >
              المريض نفسه
            </Text>
          </LinearGradient>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.optionButton,
            formData.registrationType === 'responsible' && styles.optionButtonSelected
          ]}
          onPress={() => {
            setFormData(prev => ({ ...prev, registrationType: 'responsible' }));
            setCurrentStep(2);
          }}
        >
          <LinearGradient
            colors={
              formData.registrationType === 'responsible'
                ? ['#60a5fa', '#60a5fa']
                : ['#60a5fa', '#60a5fa']
            }
            style={styles.optionGradient}
          >
            <Ionicons
              name="people"
              size={24}
              color={formData.registrationType === 'responsible' ? '#ffffff' : '#ffffff'}
            />
            <Text
              style={[
                styles.optionText,
                formData.registrationType === 'responsible' && styles.optionTextSelected,
                globalStyles.textDefault
              ]}
            >
              المسؤول عن المريض
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
      <View style={styles.buttonContainer}>
        {formData.registrationType === 'responsible' && currentStep === 2 && (
          <TouchableOpacity
            style={[
              styles.optionButton,
              // No specific selection state for this button, so no optionButtonSelected
            ]}
            onPress={() => setCurrentStep(1)}
          >
            <LinearGradient
              colors={['#f8fafc', '#f1f5f9']} // Assuming a default unselected color for 'outlined' style
              style={styles.optionGradient}
            >
              <Text style={[styles.optionText, globalStyles.textDefault]}>عودة</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[
            styles.optionButton,
            // Apply selected style if it's the 'save' or 'next' button and is conceptually 'active'
            (formData.registrationType === 'responsible' && currentStep === 1) ||
            (formData.registrationType !== 'responsible' && currentStep === 1)
              ? styles.optionButtonSelected // Apply selected style for primary action
              : null
          ]}
          onPress={() => {
            if (formData.registrationType === 'responsible' && currentStep === 1) {
              setCurrentStep(2);
            } else {
              handleSave();
            }
          }}
        >
          <LinearGradient
            colors={
              (formData.registrationType === 'responsible' && currentStep === 1) ||
              (formData.registrationType !== 'responsible' && currentStep === 1)
                ? ['#60a5fa', '#60a5fa'] // Selected color for primary action
                : ['#f8fafc', '#f1f5f9'] // Unselected color
            }
            style={styles.optionGradient}
          >
            <Text
              style={[
                styles.optionText,
                (formData.registrationType === 'responsible' && currentStep === 1) ||
                (formData.registrationType !== 'responsible' && currentStep === 1)
                  ? styles.optionTextSelected
                  : null,
                globalStyles.textDefault
              ]}
            >
              {formData.registrationType === 'responsible' && currentStep === 1 ? 'التالي' : 'حفظ'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );

  const renderResponsibleForm = () => (
    <Animated.View style={styles.formContainer}>
      <View style={styles.headerContainer}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => setCurrentStep(1)}
        >
          <Ionicons name="arrow-back" size={24} color="#6366f1" />
        </TouchableOpacity>
        <Ionicons name="shield-checkmark" size={40} color="#60a5fa" />
        <Text style={[styles.title, globalStyles.textDefault]}>بيانات المسؤول</Text>
        <Text style={[styles.subtitle, globalStyles.textDefault]}>املأ بيانات الشخص المسؤول عن المريض</Text>
      </View>
      <View style={styles.inputContainer}>
        <Text style={[styles.label, globalStyles.textDefault]}>اسم المسؤول</Text>
        <View style={styles.inputWrapper}>
          <Ionicons name="person-circle" size={20} color="#60a5fa" style={styles.inputIcon} />
          <TextInput
            style={[styles.input, globalStyles.textDefault]}
            placeholder="الاسم الأول"
            value={responsibleData.firstName}
            onChangeText={(text) => handleChange('responsible', 'firstName', text)}
            placeholderTextColor="#94a3b8"
          />
        </View>

        <View style={styles.inputWrapper}>
          <Ionicons name="person-circle" size={20} color="#60a5fa" style={styles.inputIcon} />
          <TextInput
            style={[styles.input, globalStyles.textDefault]}
            placeholder="اسم العائلة"
            value={responsibleData.lastName}
            onChangeText={(text) => handleChange('responsible', 'lastName', text)}
            placeholderTextColor="#94a3b8"
          />
        </View>
      </View>
      <View style={styles.inputContainer}>
        <Text style={[styles.label, globalStyles.textDefault]}>رقم هاتف المسؤول</Text>
        <View style={styles.inputWrapper}>
          <Ionicons name="call" size={20} color="#64748b" style={styles.inputIcon} />
          <TextInput
            style={[styles.input, globalStyles.textDefault]}
            placeholder="05xxxxxxxx"
            value={responsibleData.phoneNumber}
            onChangeText={(text) => handleChange('responsible', 'phoneNumber', text)}
            keyboardType="phone-pad"
            placeholderTextColor="#94a3b8"
          />
        </View>
      </View>
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[
            styles.optionButton,
            styles.optionButtonSelected // This button is always the primary action
          ]}
          onPress={handleSave}
        >
          <LinearGradient
            colors={['#60a5fa', '#60a5fa']} // Always selected color for primary action
            style={styles.optionGradient}
          >
            <Text style={[styles.optionText, styles.optionTextSelected, globalStyles.textDefault]}>
              حفظ وإنهاء التسجيل
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );


  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <LinearGradient
          colors={['#f8fafc', '#eef2ff']}
          style={styles.gradientBackground}
        >
          <ScrollView contentContainerStyle={styles.scrollContainer}>
            {currentStep === 1 ? renderRegistrationForm() : renderResponsibleForm()}
          </ScrollView>
        </LinearGradient>
      </KeyboardAvoidingView>
      <StatusBar style="auto" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#60a5fa',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  gradientBackground: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 20,
  },
  formContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  backButton: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000000',
    marginTop: 10,
  },
  subtitle: {
    fontSize: 14,
    color: '#000000',
    marginTop: 5,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    color: '#1e293b',
    marginBottom: 8,
    fontWeight: '600',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: 50,
    color: '#1e293b',
    textAlign: 'right',
  },
  optionButton: {
    borderRadius: 10,
    marginBottom: 10,
    overflow: 'hidden',
  },
  optionGradient: {
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionText: {
    color: '#ffffff',
    fontSize: 16,
    marginRight: 10,
  },
  optionTextSelected: {
    color: '#ffffff',
  },
  optionButtonSelected: {
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  button: {
    marginHorizontal: 10,
    minWidth: 120,
  },
});
