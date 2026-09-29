import React, { useState, useEffect, useRef, useContext } from 'react';
import {
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  View,
  ActivityIndicator,
  ScrollView,
  Linking,
  Alert
} from 'react-native';
import { AuthContext } from '@/context/AuthContext';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';
import { API_URL } from '@/constants/api';
import { SymbolView } from 'expo-symbols';

export default function TeacherMessagingScreen() {
  const { user, token } = useContext(AuthContext);
  const theme = useTheme();

  const [contacts, setContacts] = useState([]);
  const [selectedContact, setSelectedContact] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const flatListRef = useRef(null);

  // 1. Fetch active contacts with last message preview & unread counts
  useEffect(() => {
    const fetchContacts = async () => {
      try {
        const response = await fetch(`${API_URL}/messaging/get_contacts.php`, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        });
        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data) && data.length > 0) {
            setContacts(data);
            setSelectedContact((prev) => {
              if (prev) {
                const found = data.find(c => String(c.contact_user_id) === String(prev.contact_user_id));
                if (found) return found;
              }
              // Auto-select contact with unread messages or most recent activity (data[0])
              return data[0];
            });
          }
        }
      } catch (err) {
        console.log('Failed to fetch parent/teacher contacts:', err.message);
      } finally {
        setLoadingContacts(false);
      }
    };

    fetchContacts();
  }, [token]);

  // 2. Fetch live thread messages whenever selected contact changes
  useEffect(() => {
    if (!selectedContact) return;

    let isSubscribed = true;

    const fetchMessages = async () => {
      try {
        const response = await fetch(`${API_URL}/messaging/get_messages.php?other_user_id=${selectedContact.contact_user_id}`, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        });
        if (response.ok && isSubscribed) {
          const data = await response.json();
          if (Array.isArray(data)) {
            setMessages(data);
          }
        }
      } catch (err) {
        console.log('Error fetching thread messages:', err.message);
      } finally {
        if (isSubscribed) setLoadingMessages(false);
      }
    };

    setLoadingMessages(true);
    fetchMessages();

    const interval = setInterval(fetchMessages, 3000);
    return () => {
      isSubscribed = false;
      clearInterval(interval);
    };
  }, [selectedContact, token]);

  const handleSend = async () => {
    if (!inputText.trim() || !selectedContact) return;

    const currentText = inputText.trim();
    setInputText('');

    const tempMsg = {
      id: Date.now(),
      sender_id: user?.id,
      receiver_id: selectedContact.contact_user_id,
      message_text: currentText,
      created_at: new Date().toISOString().replace('T', ' ').substring(0, 19),
    };

    // Optimistically show sent message immediately in chat list
    setMessages((prev) => [...prev, tempMsg]);
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

    // Optimistically update contact's last message snippet locally
    setContacts((prev) => prev.map(c => {
      if (String(c.contact_user_id) === String(selectedContact.contact_user_id)) {
        return { ...c, last_message: currentText, last_message_time: tempMsg.created_at };
      }
      return c;
    }));

    try {
      const response = await fetch(`${API_URL}/messaging/send_message.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          receiver_id: selectedContact.contact_user_id,
          message_text: currentText,
        }),
      });

      if (!response.ok) {
        console.warn('Backend send_message response status:', response.status);
      }
    } catch (err) {
      console.warn('Network connection interrupted while sending message:', err.message);
    }
  };

  const renderRoleBadge = (roleLabel) => {
    const label = (roleLabel || '').toUpperCase();
    let bg = '#14B8A622';
    let color = '#14B8A6';
    let text = 'Parent';

    if (label.includes('TEACHER')) {
      bg = '#8B5CF622';
      color = '#8B5CF6';
      text = 'Teacher';
    } else if (label.includes('ADMIN')) {
      bg = '#FF3B3022';
      color = '#FF3B30';
      text = 'Admin';
    } else if (label.includes('STAFF')) {
      bg = '#FF950022';
      color = '#FF9500';
      text = 'Staff';
    } else if (label.includes('PARENT')) {
      bg = '#14B8A622';
      color = '#14B8A6';
      text = 'Parent';
    } else {
      bg = '#8E8E9322';
      color = '#8E8E93';
      text = roleLabel || 'User';
    }

    return (
      <View style={[styles.roleBadge, { backgroundColor: bg }]}>
        <ThemedText style={[styles.roleBadgeText, { color }]}>
          {text}
        </ThemedText>
      </View>
    );
  };

  const filteredContacts = contacts.filter((c) => {
    const roleUpper = (c.role_label || '').toUpperCase();
    const matchesCategory =
      categoryFilter === 'Parents' ? roleUpper === 'PARENT'
      : categoryFilter === 'Teachers' ? roleUpper === 'TEACHER'
      : categoryFilter === 'Staff' ? (roleUpper === 'STAFF' || roleUpper === 'ADMIN')
      : true;
    
    const matchesSearch = !searchQuery.trim() || (
      (c.full_name && c.full_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (c.role_label && c.role_label.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (c.subtitle && c.subtitle.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    return matchesCategory && matchesSearch;
  });

  if (loadingContacts) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#14B8A6" />
      </ThemedView>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      {/* Search & Category Chips */}
      <View style={styles.contactsHeaderContainer}>
        <View style={[styles.searchBarBox, { backgroundColor: theme.backgroundElement }]}>
          <SymbolView tintColor="#14B8A6" name="magnifyingglass" size={14} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Search parents, teachers, or staff..."
            placeholderTextColor={theme.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <SymbolView tintColor={theme.textSecondary} name="xmark.circle.fill" size={14} />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.filterTabsRow}>
          {['All', 'Parents', 'Teachers', 'Staff'].map((cat) => {
            const isActive = categoryFilter === cat;
            return (
              <TouchableOpacity
                key={cat}
                onPress={() => setCategoryFilter(cat)}
                style={[
                  styles.filterTab,
                  { backgroundColor: isActive ? '#14B8A6' : theme.backgroundElement }
                ]}
              >
                <ThemedText
                  type="smallBold"
                  style={{ color: isActive ? '#ffffff' : theme.text, fontSize: 11 }}
                >
                  {cat}
                </ThemedText>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Contacts Cards Row */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.contactChipsRow}>
          {filteredContacts.map((c) => {
            const isSelected = String(selectedContact?.contact_user_id) === String(c.contact_user_id);
            return (
              <TouchableOpacity
                key={c.contact_user_id}
                onPress={() => setSelectedContact(c)}
                activeOpacity={0.7}
                style={[
                  styles.contactChip,
                  {
                    backgroundColor: isSelected ? '#14B8A615' : theme.backgroundElement,
                    borderColor: isSelected ? '#14B8A6' : '#e2e8f01a',
                  },
                ]}
              >
                <View style={[styles.chipAvatar, { backgroundColor: isSelected ? '#14B8A6' : theme.backgroundSelected }]}>
                  <ThemedText style={{ color: isSelected ? '#ffffff' : theme.text, fontWeight: 'bold', fontSize: 12 }}>
                    {(c.full_name || 'U').substring(0, 2).toUpperCase()}
                  </ThemedText>
                </View>
                <View style={{ flex: 1, maxWidth: 140 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <ThemedText type="smallBold" numberOfLines={1} style={{ color: isSelected ? '#14B8A6' : theme.text, flexShrink: 1 }}>
                      {c.full_name}
                    </ThemedText>
                    {renderRoleBadge(c.role_label)}
                  </View>
                  <ThemedText type="small" numberOfLines={1} style={{ color: theme.textSecondary, fontSize: 10, marginTop: 2 }}>
                    {c.last_message || c.subtitle || 'Contact'}
                  </ThemedText>
                </View>
                {c.unread_count > 0 && (
                  <View style={styles.unreadBadge}>
                    <ThemedText style={styles.unreadBadgeText}>{c.unread_count}</ThemedText>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Active Conversation Header */}
      {selectedContact && (
        <ThemedView type="backgroundElement" style={[styles.chatHeader, { borderColor: '#14B8A633' }]}>
          <View style={[styles.avatar, { backgroundColor: '#14B8A6' }]}>
            <ThemedText style={styles.avatarText}>
              {selectedContact.full_name.substring(0, 2).toUpperCase()}
            </ThemedText>
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <ThemedText type="smallBold">{selectedContact.full_name}</ThemedText>
              {renderRoleBadge(selectedContact.role_label)}
            </View>
            <ThemedText type="small" themeColor="textSecondary" style={{ marginTop: 2 }}>
              {selectedContact.subtitle || 'Contact'} {selectedContact.phone ? `· 📞 ${selectedContact.phone}` : ''}
            </ThemedText>
          </View>
          <TouchableOpacity
            style={styles.callBtn}
            onPress={() => {
              if (selectedContact.phone) {
                Linking.openURL(`tel:${selectedContact.phone}`);
              } else {
                Alert.alert('Phone Call', `No phone number registered for ${selectedContact.full_name}.`);
              }
            }}
          >
            <SymbolView tintColor="#14B8A6" name="phone.circle.fill" size={28} />
          </TouchableOpacity>
        </ThemedView>
      )}

      {/* Messages Thread List */}
      {loadingMessages ? (
        <ActivityIndicator size="large" color="#14B8A6" style={{ marginTop: 40 }} />
      ) : messages.length === 0 ? (
        <ThemedView type="backgroundElement" style={styles.emptyCard}>
          <SymbolView tintColor={theme.textSecondary} name="bubble.left.and.bubble.right" size={32} />
          <ThemedText type="smallBold" style={{ marginTop: 8 }}>No Messages Yet</ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={{ textAlign: 'center' }}>
            Send a direct message to start a conversation with {selectedContact?.full_name || 'contact'}.
          </ThemedText>
        </ThemedView>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
          renderItem={({ item }) => {
            const isMe = String(item.sender_id) === String(user?.id);
            const timeStr = item.created_at ? item.created_at.substring(11, 16) : '';
            return (
              <View style={[styles.messageRow, isMe ? styles.myRow : styles.otherRow]}>
                <View
                  style={[
                    styles.bubble,
                    isMe
                      ? { backgroundColor: '#14B8A6', borderBottomRightRadius: 4 }
                      : { backgroundColor: theme.backgroundElement, borderBottomLeftRadius: 4 },
                  ]}
                >
                  <ThemedText
                    type="small"
                    style={{ color: isMe ? '#ffffff' : theme.text, lineHeight: 20 }}
                  >
                    {item.message_text}
                  </ThemedText>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 4, gap: 4 }}>
                    <ThemedText
                      style={{
                        fontSize: 9,
                        color: isMe ? '#ffffffcc' : theme.textSecondary,
                      }}
                    >
                      {timeStr}
                    </ThemedText>
                    {isMe && (
                      <ThemedText style={{ fontSize: 10, color: '#ffffffcc' }}>✓✓</ThemedText>
                    )}
                  </View>
                </View>
              </View>
            );
          }}
        />
      )}

      {/* Chat Input Bar */}
      <ThemedView type="backgroundElement" style={styles.inputContainer}>
        <TextInput
          style={[styles.input, { color: theme.text, borderColor: '#14B8A644' }]}
          placeholder={`Message ${selectedContact?.full_name || 'contact'}...`}
          placeholderTextColor={theme.textSecondary}
          value={inputText}
          onChangeText={setInputText}
          multiline
        />
        <TouchableOpacity style={[styles.sendButton, { backgroundColor: '#14B8A6' }]} onPress={handleSend}>
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
  contactsHeaderContainer: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    gap: Spacing.one,
  },
  filterTabsRow: {
    flexDirection: 'row',
    gap: Spacing.one,
    marginBottom: Spacing.half,
  },
  filterTab: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: 12,
  },
  contactChipsRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    paddingVertical: Spacing.one,
  },
  contactChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.two,
    borderRadius: 14,
    borderWidth: 1.5,
    gap: Spacing.two,
    minWidth: 160,
  },
  chipAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unreadBadge: {
    backgroundColor: '#FF3B30',
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 0,
  },
  unreadBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    gap: Spacing.two,
    borderBottomWidth: 1,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  emptyCard: {
    margin: Spacing.four,
    padding: Spacing.four,
    borderRadius: 16,
    alignItems: 'center',
    gap: Spacing.one,
  },
  listContent: {
    padding: Spacing.three,
    gap: Spacing.two,
  },
  messageRow: {
    flexDirection: 'row',
    width: '100%',
    marginVertical: 3,
  },
  myRow: {
    justifyContent: 'flex-end',
  },
  otherRow: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '78%',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 16,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  inputContainer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.two,
    paddingTop: Spacing.two,
    paddingBottom: Platform.OS === 'ios' ? Spacing.three : Spacing.two,
    gap: Spacing.two,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f01a',
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 100,
    borderWidth: 1,
    borderRadius: 22,
    paddingHorizontal: Spacing.three,
    fontSize: 14,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchBarBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.two,
    borderRadius: 10,
    height: 38,
    marginBottom: Spacing.one,
    gap: Spacing.one,
    borderWidth: 1,
    borderColor: '#e2e8f01a',
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
  },
  roleBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'center',
  },
  roleBadgeText: {
    fontSize: 9,
    fontWeight: 'bold',
  },
});
