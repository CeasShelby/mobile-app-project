import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Animated, Easing } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
import { SymbolView } from 'expo-symbols';

export function CustomLoader({ message = 'Loading live database...', fullScreen = false, size = 'medium' }) {
  const theme = useTheme();
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Rotation animation
    const rotateLoop = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 1500,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    // Pulsing animation
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
          duration: 750,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 750,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
      ])
    );

    rotateLoop.start();
    pulseLoop.start();

    return () => {
      rotateLoop.stop();
      pulseLoop.stop();
    };
  }, [rotateAnim, pulseAnim]);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const reverseSpin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['360deg', '0deg'],
  });

  const containerSize = size === 'small' ? 40 : size === 'large' ? 80 : 60;
  const iconSize = size === 'small' ? 18 : size === 'large' ? 32 : 24;

  const content = (
    <View style={styles.centerContainer}>
      <View style={{ width: containerSize, height: containerSize, justifyContent: 'center', alignItems: 'center' }}>
        {/* Outer Rotating Teal Ring */}
        <Animated.View
          style={[
            styles.ring,
            {
              width: containerSize,
              height: containerSize,
              borderRadius: containerSize / 2,
              borderColor: '#14B8A6',
              borderTopColor: 'transparent',
              transform: [{ rotate: spin }],
            },
          ]}
        />

        {/* Inner Counter-Rotating Violet Ring */}
        <Animated.View
          style={[
            styles.ring,
            {
              width: containerSize * 0.75,
              height: containerSize * 0.75,
              borderRadius: (containerSize * 0.75) / 2,
              borderColor: '#8B5CF6',
              borderBottomColor: 'transparent',
              position: 'absolute',
              transform: [{ rotate: reverseSpin }],
            },
          ]}
        />

        {/* Center Pulsing School Icon */}
        <Animated.View
          style={{
            position: 'absolute',
            transform: [{ scale: pulseAnim }],
          }}
        >
          <SymbolView name="graduationcap.fill" size={iconSize} tintColor="#14B8A6" />
        </Animated.View>
      </View>

      {message ? (
        <ThemedText type="small" themeColor="textSecondary" style={styles.messageText}>
          {message}
        </ThemedText>
      ) : null}
    </View>
  );

  if (fullScreen) {
    return (
      <ThemedView style={[styles.fullScreenWrapper, { backgroundColor: theme.background }]}>
        {content}
      </ThemedView>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  fullScreenWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  centerContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 16,
  },
  ring: {
    borderWidth: 3,
  },
  messageText: {
    marginTop: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});
