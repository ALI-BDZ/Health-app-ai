import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors } from '../constants/Colors'; // Your color constants
import { globalStyles } from '../services/globalstyle'; // Your global styles
// 🚨 Import SafeAreaView from 'react-native-safe-area-context'
import { SafeAreaView } from 'react-native-safe-area-context';


// Define the structure for each navigation tab
interface Tab {
  name: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}

// Re-introducing the props interface to accept 'currentRoute'
interface BottomBarProps {
  currentRoute: string;
}

/**
 * A sleek bottom navigation bar for Expo Router that accepts a 'currentRoute' prop.
 */
export default function BottomBar({ currentRoute }: BottomBarProps) {
  const router = useRouter();

  const tabs: Tab[] = [
    { name: 'home', label: 'الرئيسية', icon: 'home' },
    { name: 'calendar', label: 'متابعة', icon: 'calendar' },
    { name: 'profile', label: 'الملف الشخصي', icon: 'person' },
  ];

  return (
    // 🚀 Wrap the entire container in SafeAreaView
    // Apply `edges={['bottom']}` to only apply padding to the bottom edge
    <SafeAreaView style={styles.safeAreaContainer} edges={['bottom']}>
      <View style={styles.bar}>
        {tabs.map(tab => {
          // *** FIX: The logic now uses the passed 'currentRoute' prop ***
          const isActive = currentRoute === tab.name;

          return (
            <Pressable
              key={tab.name}
              onPress={() => router.push(`/${tab.name}` as any)}
              style={({ pressed }) => [styles.item, pressed && styles.pressedEffect]}
            >
              {/* Icon Container */}
              <View style={[styles.iconContainer, isActive && styles.activeIconContainer]}>
                <Ionicons
                  name={isActive ? tab.icon : (`${tab.icon}-outline` as any)}
                  size={24}
                  color={isActive ? Colors.white : Colors.iconInactive}
                />
              </View>
              {/* Label */}
              <Text style={[styles.labelText, isActive ? styles.activeLabelText : styles.inactiveLabelText]}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // ❌ Remove the old container style completely
  // container: {
  //   position: 'absolute',
  //   bottom: 25,
  //   left: 20,
  //   right: 20,
  //   alignItems: 'center',
  // },

  // ✅ New style for SafeAreaView
  safeAreaContainer: {
    position: 'absolute', // Keep it absolute to float above content
    bottom: 0, // Set to 0 so SafeAreaView can calculate the correct inset
    left: 0, // Span full width
    right: 0, // Span full width
    alignItems: 'center',
    // We remove the specific 'bottom' offset here and let SafeAreaView handle it
    // The padding will be applied by SafeAreaView internally
    paddingHorizontal: 20, // Add horizontal padding directly to the SafeAreaView
  },
  bar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 35,
    paddingVertical: 10,
    // ❗️ Remove paddingHorizontal from here as it's now on safeAreaContainer
    // paddingHorizontal: 15,
    height: 70,
    width: '100%', // Ensure it takes 100% of the safeAreaContainer's width
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 12,
    borderWidth: 1,
    borderColor: '#EFEFEF',
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 5,
    borderRadius: 30,
  },
  pressedEffect: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  iconContainer: {
    width: 50,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  activeIconContainer: {
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  labelText: {
    fontSize: 12,
    marginTop: 2,
  },
  inactiveLabelText: {
    ...globalStyles.textDefault,
    color: Colors.iconInactive,
  },
  activeLabelText: {
    fontFamily: 'JannaLT-Regular', // Using direct font family name instead of non-existent global style
    color: Colors.primary,
  },
});