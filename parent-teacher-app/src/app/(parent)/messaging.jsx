import React, { useState, useEffect, useRef, useContext } from 'react';
import {
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  View,
  ActivityIndicator
} from 'react-native';
import { AuthContext } from '@/context/AuthContext';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';
import { API_URL } from '@/constants/api';
import { SymbolView } from 'expo-symbols';

export default function MessagingScreen() {
  const { user, token } = useContext(AuthContext);
  const theme = useTheme();

  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const flatListRef = useRef(null);

  const TEACHER_USER_ID = 2;

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const response = await fetch(`${API_URL}/messaging/get_messages.php?other_user_id=${TEACHER_USER_ID}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error(`API server error: ${response.status}`);
        }

        const data = await response.json();
        if (Array.isArray(data)) {
          setMessages(data);
        }
      } catch (err) {
        console.log('Error fetching parent messages:', err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();

    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, [token, user]);

  const handleSend = async () => {
    if (!inputText.trim()) return;

    const currentText = inputText;
    setInputText('');

    const tempMsg = {
      id: Date.now(),
      sender_id: user?.id || 3,
      receiver_id: TEACHER_USER_ID,
      message_text: currentText,
      created_at: new Date().toISOString().replace('T', ' ').substring(0, 19),
    };
    setMessages((prev) => [...prev, tempMsg]);
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      const response = await fetch(`${API_URL}/messaging/send_message.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          receiver_id: TEACHER_USER_ID,
          message_text: currentText,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }
    } catch (err) {
      console.error('Failed to send message to database:', err.message);
    }
  };

  if (loading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#208AEF" />
      </ThemedView>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.select({ ios: 90, android: 100 })}
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <ThemedView type="backgroundElement" style={styles.chatHeader}>
        <View style={styles.avatar}>
          <ThemedText style={styles.avatarText}>SC</ThemedText>
        </View>
        <View>
          <ThemedText type="smallBold">Sarah Connor</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">Class Teacher (Jimmy Doe)</ThemedText>
        </View>
      </ThemedView>

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
        renderItem={({ item }) => {
          const isMe = item.sender_id === user?.id;
          return (
            <View style={[styles.messageRow, isMe ? styles.myRow : styles.otherRow]}>
              <View
                style={[
                  styles.bubble,
                  isMe
                    ? { backgroundColor: '#208AEF' }
                    : { backgroundColor: theme.backgroundElement },
                ]}
              >
                <ThemedText
                  type="small"
                  style={{ color: isMe ? '#ffffff' : theme.text }}
                >
                  {item.message_text}
                </ThemedText>
              </View>
            </View>
          );
        }}
      />

      <ThemedView type="backgroundElement" style={styles.inputContainer}>
        <TextInput
          style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
          placeholder="Type your message..."
          placeholderTextColor={theme.textSecondary}
          value={inputText}
          onChangeText={setInputText}
        />
        <TouchableOpacity style={styles.sendButton} onPress={handleSend}>
          <SymbolView tintColor="#ffffff" name="paperplane.fill" size={18} />
        </TouchableOpacity>
      </ThemedView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.two,
    gap: Spacing.two,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f01a',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#34C75922',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#34C759',
    fontWeight: 'bold',
    fontSize: 14,
  },
  listContent: {
    padding: Spacing.three,
    gap: Spacing.two,
  },
  messageRow: {
    flexDirection: 'row',
    width: '100%',
    marginVertical: 2,
  },
  myRow: {
    justifyContent: 'flex-end',
  },
  otherRow: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '75%',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: Spacing.two,
    gap: Spacing.two,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f01a',
  },
  input: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderRadius: 22,
    paddingHorizontal: Spacing.three,
    fontSize: 14,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#208AEF',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
