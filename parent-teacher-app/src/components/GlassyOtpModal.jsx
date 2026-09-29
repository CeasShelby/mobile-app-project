import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Modal,
  TouchableOpacity,
  TextInput,
  Animated,
  Easing,
  TouchableWithoutFeedback,
} from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { SymbolView } from 'expo-symbols';
import { Spacing } from '@/constants/theme';

export function GlassyOtpModal({
  visible = false,
  onClose,
  onVerifySuccess,
  userEmail = 'user@example.com',
}) {
  const theme = useTheme();

  const [otp, setOtp] = useState(['', '', '', '']);
  const [timer, setTimer] = useState(38);
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const inputRefs = [useRef(null), useRef(null), useRef(null), useRef(null)];
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  // Countdown timer effect
  useEffect(() => {
    let interval = null;
    if (visible && timer > 0 && !verified) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [visible, timer, verified]);

  // Rotation animation for verifying state
  useEffect(() => {
    if (verifying) {
      const loop = Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 1200,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );
      loop.start();
      return () => loop.stop();
    }
  }, [verifying]);

  const triggerShake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const handleDigitChange = (text, index) => {
    setErrorMsg(null);
    const cleaned = text.replace(/[^0-9]/g, '');
    const newOtp = [...otp];

    if (cleaned.length > 0) {
      newOtp[index] = cleaned[cleaned.length - 1];
      setOtp(newOtp);
      // Auto-advance to next input
      if (index < 3 && inputRefs[index + 1].current) {
        inputRefs[index + 1].current.focus();
      }
    } else {
      newOtp[index] = '';
      setOtp(newOtp);
    }
  };

  const handleKeyPress = (e, index) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs[index - 1].current.focus();
    }
  };

  const handleVerify = async () => {
    const code = otp.join('');
    if (code.length < 4) {
      setErrorMsg('Please enter all 4 digits of your security code.');
      triggerShake();
      return;
    }

    setVerifying(true);
    setErrorMsg(null);

    // Simulate authentication verification API delay
    setTimeout(() => {
      setVerifying(false);
      setVerified(true);

      // Pulse animation on success
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.1, duration: 200, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();

      // Trigger completion callback after success animation
      setTimeout(() => {
        if (onVerifySuccess) onVerifySuccess();
      }, 1200);
    }, 1500);
  };

  const handleResend = () => {
    setTimer(45);
    setOtp(['5', '6', '1', '4']);
    setErrorMsg(null);
  };

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <Animated.View
              style={[
                styles.glassCard,
                { transform: [{ translateX: shakeAnim }, { scale: pulseAnim }] },
              ]}
            >
              {/* Top Key Badge */}
              <View style={styles.iconCircle}>
                <SymbolView
                  name={verified ? 'checkmark.shield.fill' : 'key.fill'}
                  size={26}
                  tintColor={verified ? '#34C759' : '#F59E0B'}
                />
              </View>

              {/* Title & Subtitle */}
              {verified ? (
                <>
                  <ThemedText style={styles.titleVerified}>Verified Successfully</ThemedText>
                  <ThemedText style={styles.subtitleVerified}>
                    Your security verification code has been confirmed.
                  </ThemedText>
                </>
              ) : (
                <>
                  <View style={styles.titleRow}>
                    <ThemedText style={styles.titleText}>Verify </ThemedText>
                    <ThemedText style={styles.titleHighlight}>OTP</ThemedText>
                  </View>
                  <ThemedText style={styles.subtitleText}>
                    Enter the 4-digit security code sent to your device
                  </ThemedText>
                </>
              )}

              {/* 4 OTP Digit Input Boxes */}
              <View style={styles.otpRow}>
                {otp.map((digit, idx) => (
                  <View
                    key={idx}
                    style={[
                      styles.otpBox,
                      digit ? styles.otpBoxFilled : null,
                      verified ? styles.otpBoxVerified : null,
                    ]}
                  >
                    <TextInput
                      ref={inputRefs[idx]}
                      style={styles.otpInput}
                      keyboardType="number-pad"
                      maxLength={1}
                      value={digit}
                      onChangeText={(text) => handleDigitChange(text, idx)}
                      onKeyPress={(e) => handleKeyPress(e, idx)}
                      editable={!verifying && !verified}
                      selectionColor="#14B8A6"
                    />
                  </View>
                ))}
              </View>

              {/* Error Message */}
              {errorMsg ? (
                <ThemedText style={styles.errorText}>{errorMsg}</ThemedText>
              ) : null}

              {/* Resend Code Link */}
              {!verified ? (
                <TouchableOpacity
                  disabled={timer > 0}
                  onPress={handleResend}
                  style={styles.resendRow}
                >
                  <ThemedText style={styles.resendText}>
                    Didn't receive the code?{' '}
                    <ThemedText style={styles.resendHighlight}>
                      {timer > 0 ? `Resend in 00:${timer < 10 ? '0' : ''}${timer}` : 'Resend Now'}
                    </ThemedText>
                  </ThemedText>
                </TouchableOpacity>
              ) : null}

              {/* Main Action Button */}
              <TouchableOpacity
                onPress={verified ? onVerifySuccess : handleVerify}
                disabled={verifying}
                activeOpacity={0.8}
                style={[
                  styles.actionBtn,
                  verifying ? styles.btnVerifying : null,
                  verified ? styles.btnVerified : styles.btnNormal,
                ]}
              >
                {verifying ? (
                  <View style={styles.verifyingRow}>
                    <Animated.View style={{ transform: [{ rotate: spin }] }}>
                      <SymbolView name="arrow.triangle.2.circlepath" size={18} tintColor="#F59E0B" />
                    </Animated.View>
                    <ThemedText style={styles.btnVerifyingText}>Verifying Code...</ThemedText>
                  </View>
                ) : verified ? (
                  <View style={styles.verifyingRow}>
                    <SymbolView name="checkmark.circle.fill" size={20} tintColor="#FFFFFF" />
                    <ThemedText style={styles.btnVerifiedText}>Verified & Secured</ThemedText>
                  </View>
                ) : (
                  <View style={styles.verifyingRow}>
                    <ThemedText style={styles.btnNormalText}>Verify & Proceed</ThemedText>
                    <SymbolView name="arrow.right" size={16} tintColor="#FFFFFF" />
                  </View>
                )}
              </TouchableOpacity>
            </Animated.View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: '#000000bb',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.four,
  },
  glassCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#0F172Aee',
    borderRadius: 32,
    borderWidth: 1.5,
    borderColor: '#33415599',
    padding: Spacing.four,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 12,
  },
  iconCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#F59E0B20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.three,
    borderWidth: 1,
    borderColor: '#F59E0B44',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  titleText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  titleHighlight: {
    fontSize: 22,
    fontWeight: '800',
    color: '#F59E0B',
  },
  titleVerified: {
    fontSize: 22,
    fontWeight: '800',
    color: '#34C759',
  },
  subtitleText: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 6,
    marginBottom: Spacing.three,
    paddingHorizontal: 8,
  },
  subtitleVerified: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 6,
    marginBottom: Spacing.three,
  },
  otpRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: Spacing.three,
  },
  otpBox: {
    width: 60,
    height: 60,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#334155',
    backgroundColor: '#1E293B99',
    justifyContent: 'center',
    alignItems: 'center',
  },
  otpBoxFilled: {
    borderColor: '#F59E0B',
    backgroundColor: '#F59E0B15',
  },
  otpBoxVerified: {
    borderColor: '#34C759',
    backgroundColor: '#34C75915',
  },
  otpInput: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    width: '100%',
    height: '100%',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: Spacing.two,
  },
  resendRow: {
    marginBottom: Spacing.three,
  },
  resendText: {
    fontSize: 13,
    color: '#94A3B8',
  },
  resendHighlight: {
    color: '#F59E0B',
    fontWeight: '700',
  },
  actionBtn: {
    width: '100%',
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.one,
  },
  btnNormal: {
    backgroundColor: '#14B8A6',
  },
  btnVerifying: {
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#F59E0B66',
  },
  btnVerified: {
    backgroundColor: '#34C759',
  },
  verifyingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  btnNormalText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  btnVerifyingText: {
    color: '#F59E0B',
    fontSize: 15,
    fontWeight: '700',
  },
  btnVerifiedText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
