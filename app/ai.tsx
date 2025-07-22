import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BottomBar from './BottomBar';

export default function AIPage() {
  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.content}>
        <Text style={styles.title}>مرحبا بمدرب الذكاء الاصطناعي!</Text>
        <Text style={styles.subtitle}>هذه صفحة بسيطة مؤقتاً.</Text>
      </View>
      {/* ضع هنا شريط التنقل السفلي */}
      <BottomBar currentRoute="ai" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
  },
});
