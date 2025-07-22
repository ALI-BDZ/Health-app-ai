import React, { useRef } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors } from '../constants/Colors';
import { globalStyles } from '../services/globalstyle';
import { SafeAreaView } from 'react-native-safe-area-context';

interface Tab {
  name: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}

interface BottomBarProps {
  currentRoute: string;
}

export default function BottomBar({ currentRoute }: BottomBarProps) {
  const router = useRouter();
  const isNavigatingRef = useRef(false);

  const tabs: Tab[] = [
    { name: 'home',     label: 'الرئيسية',    icon: 'home'     },
    { name: 'calendar', label: 'متابعة',      icon: 'calendar' },
    { name: 'ai',       label: ' المدرب الذكي',     icon: 'bulb'     },  // 
    { name: 'profile',  label: ' معلوماتي', icon: 'person'   },
  ];

  const handlePress = (tabName: string, isActive: boolean) => {
    if (isActive || isNavigatingRef.current) {
      return;
    }
    isNavigatingRef.current = true;
    router.push(`/${tabName}` as any);
    setTimeout(() => {
      isNavigatingRef.current = false;
    }, 500);
  };

  return (
    <SafeAreaView style={styles.safeAreaContainer} edges={['bottom']}>
      <View style={styles.bar}>
        {tabs.map(tab => {
          const isActive = currentRoute === tab.name;
          return (
            <Pressable
              key={tab.name}
              onPress={() => handlePress(tab.name, isActive)}
              disabled={isActive || isNavigatingRef.current}
              style={({ pressed }) => [
                styles.item,
                !isActive && !isNavigatingRef.current && pressed && styles.pressedEffect
              ]}
            >
              <View style={[styles.iconContainer, isActive && styles.activeIconContainer]}>
                <Ionicons
                  name={isActive ? tab.icon : (`${tab.icon}-outline` as any)}
                  size={24}
                  color={isActive ? Colors.white : Colors.iconInactive}
                />
              </View>
              <Text
                style={[
                  styles.labelText,
                  isActive ? styles.activeLabelText : styles.inactiveLabelText
                ]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
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
  safeAreaContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  bar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 35,
    paddingVertical: 10,
    height: 70,
    width: '100%',
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
    fontSize: 11,
    marginTop: 2,
    textAlign: 'center',
  },
  inactiveLabelText: {
    ...globalStyles.textDefault,
    color: Colors.iconInactive,
  },
  activeLabelText: {
    fontFamily: 'JannaLT-Regular',
    color: Colors.primary,
  },
});