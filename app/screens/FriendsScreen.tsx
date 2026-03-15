import React, { useCallback, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Contacts from 'expo-contacts';
import { useTheme } from '../theme/useTheme';
import type { Colors } from '../theme/colors';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { RootStackParamList, MainTabParamList } from '../navigation/AppNavigator';
import { rootNavigationRef } from '../navigation/navigationRef';
import { auth } from '../services/firebaseConfig';
import { getFriends, addFriend, getFriendBalance } from '../services/friendsFirestore';
import type { Friend } from '../types/firestore';
import { useCurrency } from '../theme/useCurrency';
import { AnimatedFadeInUp } from '../components/animations';
import { showToast } from '../utils/toast';

type FriendsNav = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Friends'>,
  NativeStackNavigationProp<RootStackParamList>
>;

const FriendsScreen: React.FC = () => {
  const navigation = useNavigation<FriendsNav>();
  const { colors, radius } = useTheme();
  const styles = useMemo(() => makeStyles(colors, radius), [colors, radius]);
  const CURRENCY = useCurrency();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  const load = useCallback(async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      setFriends([]);
      setLoading(false);
      return;
    }
    try {
      const list = await getFriends(uid);
      setFriends(list);
    } catch {
      setFriends([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [load])
  );

  const handleAddFriend = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      showToast('Enter a name', 'error');
      return;
    }
    const uid = auth.currentUser?.uid;
    if (!uid) {
      showToast('Not signed in', 'error');
      return;
    }
    try {
      await addFriend(uid, trimmedName, phone.trim() || undefined);
      setName('');
      setPhone('');
      setModalVisible(false);
      showToast('Friend added');
      load();
    } catch {
      showToast('Could not add friend', 'error');
    }
  };

  const handlePickContact = async () => {
    try {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Allow contacts access to add friends from your contacts.');
        return;
      }
      const { data } = await Contacts.getContactsAsync({ fields: [Contacts.Fields.Name, Contacts.Fields.PhoneNumbers] });
      if (data.length === 0) {
        showToast('No contacts found');
        return;
      }
      const contact = data[0];
      const contactName = contact.name ?? 'Unknown';
      const contactPhone = contact.phoneNumbers?.[0]?.number ?? '';
      const uid = auth.currentUser?.uid;
      if (!uid) return;
      await addFriend(uid, contactName, contactPhone || undefined);
      showToast('Friend added from contacts');
      load();
    } catch {
      showToast('Could not pick contact', 'error');
    }
  };

  const handleFriendPress = (friendId: string) => {
    if (rootNavigationRef.isReady()) {
      rootNavigationRef.navigate('FriendDetail', { friendId });
    }
  };

  if (loading && friends.length === 0) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AnimatedFadeInUp delay={0} duration={400}>
        <View style={styles.headerRow}>
          <Text style={[styles.title, { color: colors.text }]}>Friends</Text>
          <View style={styles.headerButtons}>
            <TouchableOpacity style={styles.iconButton} onPress={handlePickContact}>
              <Ionicons name="people-outline" size={22} color={colors.primaryTextOnPrimary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
              <Ionicons name="person-add" size={22} color={colors.primaryTextOnPrimary} />
            </TouchableOpacity>
          </View>
        </View>
      </AnimatedFadeInUp>

      {friends.length === 0 ? (
        <View style={styles.emptyWrapper}>
          <AnimatedFadeInUp delay={80} duration={400} style={styles.emptyInner}>
            <Ionicons name="people-outline" size={48} color={colors.text} style={{ opacity: 0.6 }} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No friends yet</Text>
            <Text style={[styles.emptySubtext, { color: colors.mutedText }]}>Add a friend to split bills 50/50</Text>
            <TouchableOpacity style={[styles.emptyButton, { backgroundColor: colors.primary }]} onPress={() => setModalVisible(true)}>
              <Text style={[styles.emptyButtonText, { color: colors.primaryTextOnPrimary }]}>Add Friend</Text>
            </TouchableOpacity>
          </AnimatedFadeInUp>
        </View>
      ) : (
        <AnimatedFadeInUp delay={80} duration={400} style={{ flex: 1 }}>
          <FlatList
            data={friends}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            ItemSeparatorComponent={() => <View style={styles.spacer} />}
            renderItem={({ item }) => {
              const balance = getFriendBalance(item);
              const net = balance.theyOweMe - balance.iOweThem;
              return (
                <TouchableOpacity
                  style={styles.card}
                  onPress={() => handleFriendPress(item.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={styles.cardMiddle}>
                    <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
                    <Text style={styles.cardSubtext}>
                      {item.bills.length} bill{item.bills.length !== 1 ? 's' : ''}
                      {item.phone ? ` · ${item.phone}` : ''}
                    </Text>
                  </View>
                  <View style={styles.cardRight}>
                    {net !== 0 && (
                      <Text style={[styles.cardAmount, net > 0 && styles.amountPositive, net < 0 && styles.amountNegative]}>
                        {net > 0 ? `+${CURRENCY}${net.toFixed(0)}` : `-${CURRENCY}${Math.abs(net).toFixed(0)}`}
                      </Text>
                    )}
                    {net === 0 && item.bills.length > 0 && <Text style={styles.settledText}>Settled</Text>}
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.mutedText} />
                </TouchableOpacity>
              );
            }}
          />
        </AnimatedFadeInUp>
      )}

      <Modal visible={modalVisible} transparent animationType="fade">
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setModalVisible(false)} />
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Add Friend</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              placeholder="Name"
              placeholderTextColor={colors.mutedText}
              value={name}
              onChangeText={setName}
            />
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              placeholder="Phone (optional)"
              placeholderTextColor={colors.mutedText}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />
            <TouchableOpacity style={[styles.modalButton, { backgroundColor: colors.primary }]} onPress={handleAddFriend} disabled={!name.trim()}>
              <Text style={styles.modalButtonText}>Add Friend</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

function makeStyles(colors: Colors, radius: { xl: number; lg: number }) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: 20, paddingTop: 56 },
    centered: { justifyContent: 'center', alignItems: 'center' },
    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
    title: { fontSize: 24, fontWeight: '700', color: colors.text },
    headerButtons: { flexDirection: 'row', gap: 12 },
    iconButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
    fab: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
    listContent: { paddingBottom: 100 },
    spacer: { height: 12 },
    card: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: radius.xl, padding: 16, borderWidth: 1, borderColor: colors.border },
    avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(232, 92, 58, 0.15)', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    avatarText: { fontSize: 18, fontWeight: '700', color: colors.primary },
    cardMiddle: { flex: 1, minWidth: 0 },
    cardName: { fontSize: 17, fontWeight: '600', color: colors.text },
    cardSubtext: { fontSize: 13, color: colors.mutedText, marginTop: 2 },
    cardRight: { marginRight: 8 },
    cardAmount: { fontSize: 15, fontWeight: '700' },
    amountPositive: { color: colors.success },
    amountNegative: { color: colors.primary },
    settledText: { fontSize: 12, color: colors.mutedText },
    emptyWrapper: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    emptyInner: {
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 28,
    },
    emptyTitle: { fontSize: 18, fontWeight: '600', color: colors.text, marginTop: 16 },
    emptySubtext: { fontSize: 14, color: colors.mutedText, marginTop: 8 },
    emptyButton: { marginTop: 24, paddingVertical: 14, paddingHorizontal: 24, backgroundColor: colors.primary, borderRadius: radius.lg },
    emptyButtonText: { fontSize: 16, fontWeight: '600', color: colors.primaryTextOnPrimary },
    modalOverlay: { flex: 1, justifyContent: 'center', padding: 24 },
    modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
    modalContent: { borderRadius: radius.xl, padding: 24 },
    modalTitle: { fontSize: 20, fontWeight: '700', marginBottom: 20 },
    input: { height: 48, borderRadius: radius.lg, paddingHorizontal: 16, marginBottom: 16, borderWidth: 1 },
    modalButton: { height: 48, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
    modalButtonText: { fontSize: 16, fontWeight: '600', color: colors.primaryTextOnPrimary },
  });
}

export default FriendsScreen;
