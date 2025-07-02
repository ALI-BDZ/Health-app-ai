import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Image, Animated, Easing } from 'react-native';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { router } from 'expo-router';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

export default function AppSplashScreen() {
  const [fadeAnim] = useState(new Animated.Value(0));
  const [logoFloatAnim] = useState(new Animated.Value(0));
  const [titleFadeAnim] = useState(new Animated.Value(0));
  const [taglineFadeAnim] = useState(new Animated.Value(0));
  
  // Create separate animated values for each floating icon
  const [iconAnims] = useState([
    new Animated.Value(0), // First icon
    new Animated.Value(0), // Second icon
    new Animated.Value(0), // Third icon
  ]);

  // Load the custom font
  const [fontsLoaded] = useFonts({
    'JannaLT-Regular': require('../assets/fonts/Janna LT Bold.ttf'),
    'JannaLTBold': require('../assets/fonts/Janna LT Bold.ttf'),
    'SpaceMono-Regular': require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (!fontsLoaded) {
      return;
    }

    // Hide the splash screen once fonts are loaded
    SplashScreen.hideAsync();

    // Start the main logo fade in immediately
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();

    // Start logo floating animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(logoFloatAnim, {
          toValue: 1,
          duration: 3000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(logoFloatAnim, {
          toValue: 0,
          duration: 3000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Staggered text animations - title appears after logo
    setTimeout(() => {
      Animated.timing(titleFadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }).start();
    }, 600);

    // Tagline appears after title
    setTimeout(() => {
      Animated.timing(taglineFadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }).start();
    }, 1200);

    // Start random floating animations for icons with different delays and speeds
    iconAnims.forEach((anim, index) => {
      const randomDelay = Math.random() * 2000 + 500; // Random delay between 500-2500ms
      const randomDuration = Math.random() * 1500 + 2000; // Random duration between 2000-3500ms
      
      setTimeout(() => {
        const createRandomAnimation = () => {
          Animated.loop(
            Animated.sequence([
              Animated.timing(anim, {
                toValue: 1,
                duration: randomDuration,
                easing: Easing.inOut(Easing.ease),
                useNativeDriver: true,
              }),
              Animated.timing(anim, {
                toValue: 0,
                duration: randomDuration,
                easing: Easing.inOut(Easing.ease),
                useNativeDriver: true,
              }),
            ])
          ).start();
        };
        
        createRandomAnimation();
      }, randomDelay);
    });

    const timer = setTimeout(() => {
      router.replace('/info-form');
    }, 4000); // Increased timeout to see all animations

    return () => clearTimeout(timer);
  }, [fadeAnim, fontsLoaded, iconAnims, logoFloatAnim, taglineFadeAnim, titleFadeAnim]);

  if (!fontsLoaded) {
    return null; // Return null instead of AppLoading
  }

  const logoFloatInterpolation = logoFloatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-8, 8],
  });

  // Create different interpolations for each icon with varying ranges
  const iconInterpolations = iconAnims.map((anim, index) => {
    const range = 15 + (index * 5); // Different floating ranges: 15, 20, 25
    return anim.interpolate({
      inputRange: [0, 1],
      outputRange: [-range, range],
    });
  });

  const floatingIcons = [
    {
      source: require('../assets/images/clock.png'),
      top: 12,
      left: 15,
      width: 45,
      height: 45,
    },
    {
      source: require('../assets/images/doc.png'),
      top: 20,
      right: 20,
      width: 40,
      height: 40,
    },
    {
      source: require('../assets/images/pill.png'),
      top: 35,
      left: 25,
      width: 38,
      height: 38,
    },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.backgroundCircles}>
        <View style={[styles.circle, styles.circle1]} />
        <View style={[styles.circle, styles.circle2]} />
        <View style={[styles.circle, styles.circle3]} />
      </View>

      {floatingIcons.map((item, index) => (
        <Animated.View
          key={index}
          style={[
            styles.floatingIcon,
            {
              top: `${item.top}%`,
              left: item.left !== undefined ? `${item.left}%` : undefined,
              right: item.right !== undefined ? `${item.right}%` : undefined,
              opacity: fadeAnim, // Icons fade in with logo but float independently
              transform: [
                {
                  translateY: iconInterpolations[index]
                }
              ]
            }
          ]}
        >
          <Image
            source={item.source}
            style={{ width: item.width, height: item.height }}
            resizeMode="contain"
          />
        </Animated.View>
      ))}

      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        <Animated.Image
          source={require('../assets/images/logo.png')}
          style={[
            styles.logo, 
            { transform: [{ translateY: logoFloatInterpolation }] }
          ]}
        />
        
        {/* Title with separate fade animation */}
        <Animated.Text 
          style={[styles.appName, { opacity: titleFadeAnim }]}
        >
          Jouraa
        </Animated.Text>
        
        {/* Tagline with separate fade animation */}
        <Animated.Text 
          style={[styles.tagline, { opacity: taglineFadeAnim }]}
        >
          جرعة رفيقك الصحي
        </Animated.Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f1f5f9', // Light blue-gray background
    overflow: 'hidden',
  },
  backgroundCircles: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  circle: {
    position: 'absolute',
    borderRadius: 500,
    opacity: 0.08, // Reduced opacity for subtlety
  },
  circle1: {
    width: 400,
    height: 400,
    backgroundColor: '#1e40af', // Deep blue
    top: -100,
    left: -100,
  },
  circle2: {
    width: 300,
    height: 300,
    backgroundColor: '#3b82f6', // Medium blue
    bottom: -50,
    right: -50,
  },
  circle3: {
    width: 200,
    height: 200,
    backgroundColor: '#60a5fa', // Light blue
    top: '30%',
    right: -50,
  },
  content: {
    alignItems: 'center',
    zIndex: 10,
    marginTop: 40,
  },
  logo: {
    width: 180,
    height: 180,
    resizeMode: 'contain',
    marginBottom: 20,
  },
  appName: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#60a5fa', // Changed to pure blue
    fontFamily: 'JannaLTBold',
    textShadowColor: 'rgba(30, 64, 175, 0.1)', // Blue shadow
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
    marginBottom: 8,
  },
  tagline: {
    fontSize: 22,
    color: '#475569', // Blue-gray for secondary text
    fontFamily: 'JannaLT-Regular',
    textShadowColor: 'rgba(71, 85, 105, 0.05)', // Subtle blue-gray shadow
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  floatingIcon: {
    position: 'absolute',
    zIndex: 5,
  },
});