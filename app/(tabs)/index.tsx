import React from 'react';
import { Image, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

export default function HomeScreen() {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Image
          source={require('@/assets/images/logo.png')}
          style={styles.reactLogo}
        />
      </View>

      <View style={styles.titleContainer}>
        <Text style={styles.title}>Welcome!</Text>
        <Text style={styles.wave}>👋</Text>
      </View>

      <View style={styles.stepContainer}>
        <Text style={styles.subtitle}>Step 1: Try it</Text>
        <Text>
          Edit <Text style={styles.bold}>app/(tabs)/index.tsx</Text> to see changes. Press{' '}
          <Text style={styles.bold}>
            {Platform.select({
              ios: 'cmd + d',
              android: 'cmd + m',
              web: 'F12',
            })}
          </Text>{' '}
          to open developer tools.
        </Text>
      </View>

      <View style={styles.stepContainer}>
        <Text style={styles.subtitle}>Step 2: Explore</Text>
        <Text>Tap the Explore tab to learn more about what's included in this starter app.</Text>
      </View>

      <View style={styles.stepContainer}>
        <Text style={styles.subtitle}>Step 3: Get a fresh start</Text>
        <Text>
          When you're ready, run <Text style={styles.bold}>npm run reset-project</Text> to get a fresh{' '}
          <Text style={styles.bold}>app</Text> directory. This will move the current{' '}
          <Text style={styles.bold}>app</Text> to <Text style={styles.bold}>app-example</Text>.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff', // light theme
    padding: 16,
  },
  header: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reactLogo: {
    height: 178,
    width: 290,
    resizeMode: 'contain',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  wave: {
    fontSize: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  stepContainer: {
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 4,
  },
  bold: {
    fontWeight: 'bold',
  },
});
