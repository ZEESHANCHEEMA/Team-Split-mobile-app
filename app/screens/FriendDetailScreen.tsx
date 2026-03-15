import React, { useCallback, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/useTheme';
import type { Colors } from '../theme/colors';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { auth } from '../services/firebaseConfig';
import {
  getFriend,
  addFriendBill,
  toggleFriendBillPaid,
  getFriendBalance,
  deleteFriend,
} from '../services/friendsFirestore';
import type { Friend, FriendBill } from '../types/firestore';
import { useCurrency } from '../theme/useCurrency';
import { shareContent } from '../utils/shareUtils';
import { generateFriendPDF, getFriendSummaryText } from '../utils/pdfExport';
import { AnimatedFadeInUp } from '../components/animations';
import { showToast } from '../utils/toast';

type Props = NativeStackScreenProps<RootStackParamList, 'FriendDetail'>;

const FriendDetailScreen: React.FC<Props> = ({ navigation, route }) => {
  const { friendId } = route.params;
  const { colors, radius } = useTheme();
  const styles = useMemo(() => makeStyles(colors, radius), [colors, radius]);
  const CURRENCY = useCurrency();
  const [friend, setFriend] = useState<Friend | null>(null);
  const [loading, setLoading] = useState(true);
  const [billModalVisible, setBillModalVisible] = useState(false);
  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState('');
  const [iPaid, setIPaid] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const load = useCallback(async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      setFriend(null);
      setLoading(false);
      return;
    }
    try {
      const f = await getFriend(uid, friendId);
      setFriend(f);
    } catch {
      setFriend(null);
    } finally {
      setLoading(false);
    }
  }, [friendId]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [load])
  );

  const handleAddBill = async () => {
    const num = parseFloat(amount.replace(/,/g, '.'));
    if (!desc.trim() || !Number.isFinite(num) || num <= 0) {
      showToast('Enter description and valid amount', 'error');
      return;
    }
    const uid = auth.currentUser?.uid;
    if (!uid || !friend) return;
    setActionLoading(true);
    try {
      await addFriendBill(uid, friendId, desc.trim(), num, iPaid);
      setDesc('');
      setAmount('');
      setBillModalVisible(false);
      showToast('Bill added');
      load();
    } catch {
      showToast('Could not add bill', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleTogglePaid = async (billId: string, memberId: string) => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    try {
      await toggleFriendBillPaid(uid, friendId, billId, memberId);
      load();
    } catch {
      showToast('Could not update', 'error');
    }
  };

  const handleDownloadPDF = async () => {
    if (!friend) return;
    try {
      await generateFriendPDF(friend);
      showToast('PDF ready to share');
    } catch {
      showToast('Could not generate PDF', 'error');
    }
  };

  const handleShare = () => {
    if (!friend) return;
    const text = getFriendSummaryText(friend, CURRENCY);
    shareContent(text, `Bills with ${friend.name}`);
  };

  const handleRemoveFriend = () => {
    const uid = auth.currentUser?.uid;
    if (!uid || !friend) return;
    Alert.alert(
      'Remove friend?',
      `Remove ${friend.name} and all bill history? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true);
            try {
              await deleteFriend(uid, friendId);
              showToast('Friend removed');
              navigation.goBack();
            } catch {
              showToast('Could not remove friend', 'error');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  if (loading && !friend) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!friend) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.errorText}>Friend not found</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const balance = getFriendBalance(friend);
  const net = balance.theyOweMe - balance.iOweThem;
  const sortedBills = [...friend.bills].sort(
    (a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0)
  );

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <AnimatedFadeInUp delay={0} duration={400}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Ionicons name="chevron-back" size={24} color={colors.text} />
            </TouchableOpacity>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{friend.name.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={styles.headerCenter}>
              <Text style={styles.name}>{friend.name}</Text>
              {friend.phone ? <Text style={styles.phone}>{friend.phone}</Text> : null}
            </View>
            <TouchableOpacity style={styles.iconBtn} onPress={handleDownloadPDF}>
              <Ionicons name="download-outline" size={22} color={colors.mutedText} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn} onPress={handleShare}>
              <Ionicons name="share-outline" size={22} color={colors.mutedText} />
            </TouchableOpacity>
          </View>
        </AnimatedFadeInUp>

        <AnimatedFadeInUp delay={60} duration={380}>
          <View style={[styles.balanceCard, net > 0 && styles.balancePositive, net < 0 && styles.balanceNegative]}>
            <Text style={styles.balanceLabel}>
              {net > 0 ? `${friend.name} owes you` : net < 0 ? `You owe ${friend.name}` : 'All settled up!'}
            </Text>
            <Text style={[styles.balanceAmount, net > 0 && styles.amountPositive, net < 0 && styles.amountNegative]}>
              {CURRENCY} {Math.abs(net).toFixed(2)}
            </Text>
          </View>
        </AnimatedFadeInUp>

        <AnimatedFadeInUp delay={120} duration={360}>
          <TouchableOpacity style={styles.addBillButton} onPress={() => setBillModalVisible(true)}>
            <Ionicons name="add" size={22} color={colors.primaryTextOnPrimary} />
            <Text style={styles.addBillButtonText}>Add Bill</Text>
          </TouchableOpacity>
        </AnimatedFadeInUp>

        <TouchableOpacity
          style={styles.removeFriendButton}
          onPress={handleRemoveFriend}
          disabled={actionLoading}
        >
          {actionLoading ? (
            <ActivityIndicator size="small" color={colors.danger} />
          ) : (
            <>
              <Ionicons name="person-remove-outline" size={18} color={colors.danger} />
              <Text style={styles.removeFriendButtonText}>Remove friend</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>History</Text>
          {sortedBills.length === 0 ? (
            <Text style={styles.emptyBills}>No bills yet</Text>
          ) : (
            sortedBills.map((bill) => {
              const allPaid = bill.splits.every((s) => s.paid);
              return (
                <View key={bill.id} style={styles.billCard}>
                  <View style={styles.billRow}>
                    <View style={styles.billLeft}>
                      <Text style={styles.billDesc}>{bill.description}</Text>
                      <Text style={styles.billMeta}>
                        {bill.paidBy === 'me' ? 'You' : friend.name} paid · {bill.createdAt?.seconds ? new Date(bill.createdAt.seconds * 1000).toLocaleDateString() : '—'}
                      </Text>
                    </View>
                    <View style={styles.billRight}>
                      <Text style={styles.billTotal}>{CURRENCY} {bill.totalAmount.toFixed(2)}</Text>
                      <View style={[styles.statusPill, allPaid ? styles.statusSettled : styles.statusPending]}>
                        <Ionicons name={allPaid ? 'checkmark' : 'time'} size={12} color={allPaid ? colors.success : colors.warning} />
                        <Text style={[styles.statusText, allPaid ? styles.statusSettledText : styles.statusPendingText]}>
                          {allPaid ? 'Settled' : 'Pending'}
                        </Text>
                      </View>
                    </View>
                  </View>
                  {bill.splits.map((split) => (
                    <TouchableOpacity
                      key={split.memberId}
                      style={styles.splitRow}
                      onPress={() => handleTogglePaid(bill.id, split.memberId)}
                    >
                      <View style={[styles.checkbox, split.paid && styles.checkboxPaid]}>
                        {split.paid && <Ionicons name="checkmark" size={14} color={colors.primaryTextOnPrimary} />}
                      </View>
                      <Text style={[styles.splitLabel, split.paid && styles.splitLabelPaid]}>
                        {split.memberId === 'me' ? 'You' : friend.name}
                      </Text>
                      <Text style={styles.splitAmount}>{CURRENCY} {split.amount.toFixed(2)}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      <Modal visible={billModalVisible} transparent animationType="fade">
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setBillModalVisible(false)} />
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>New Bill with {friend.name}</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              placeholder="Description"
              placeholderTextColor={colors.mutedText}
              value={desc}
              onChangeText={setDesc}
            />
            <TextInput
              style={[styles.input, styles.amountInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              placeholder={`Amount (${CURRENCY})`}
              placeholderTextColor={colors.mutedText}
              value={amount}
              onChangeText={(t) => setAmount(t.replace(/[^0-9.]/g, ''))}
              keyboardType="decimal-pad"
            />
            <Text style={[styles.whoPaidLabel, { color: colors.mutedText }]}>Who paid?</Text>
            <View style={styles.whoPaidRow}>
              <TouchableOpacity
                style={[styles.whoPaidButton, iPaid && { backgroundColor: colors.primary }]}
                onPress={() => setIPaid(true)}
              >
                <Text style={[styles.whoPaidButtonText, iPaid && { color: colors.primaryTextOnPrimary }]}>I paid</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.whoPaidButton, !iPaid && { backgroundColor: colors.primary }]}
                onPress={() => setIPaid(false)}
              >
                <Text style={[styles.whoPaidButtonText, !iPaid && { color: colors.primaryTextOnPrimary }]}>{friend.name} paid</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: colors.primary }]}
              onPress={handleAddBill}
              disabled={actionLoading || !desc.trim() || !amount || parseFloat(amount) <= 0}
            >
              {actionLoading ? <ActivityIndicator color={colors.primaryTextOnPrimary} /> : <Text style={styles.modalButtonText}>Split 50/50</Text>}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

function makeStyles(colors: Colors, radius: { xl: number; lg: number }) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    centered: { justifyContent: 'center', alignItems: 'center' },
    scroll: { flex: 1 },
    scrollContent: { paddingHorizontal: 20, paddingTop: 56, paddingBottom: 100 },
    header: { flexDirection: 'row', alignItems: 'center', marginBottom: 24, gap: 12 },
    backButton: { padding: 4 },
    avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(232, 92, 58, 0.15)', alignItems: 'center', justifyContent: 'center' },
    avatarText: { fontSize: 20, fontWeight: '700', color: colors.primary },
    headerCenter: { flex: 1, minWidth: 0 },
    name: { fontSize: 20, fontWeight: '700', color: colors.text },
    phone: { fontSize: 12, color: colors.mutedText, marginTop: 2 },
    iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
    balanceCard: { borderRadius: radius.xl, padding: 20, marginBottom: 24, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card },
    balancePositive: { backgroundColor: 'rgba(34, 197, 94, 0.1)', borderColor: 'rgba(34, 197, 94, 0.3)' },
    balanceNegative: { backgroundColor: 'rgba(232, 92, 58, 0.1)', borderColor: 'rgba(232, 92, 58, 0.3)' },
    balanceLabel: { fontSize: 14, color: colors.mutedText },
    balanceAmount: { fontSize: 28, fontWeight: '700', color: colors.text, marginTop: 4 },
    amountPositive: { color: colors.success },
    amountNegative: { color: colors.primary },
    addBillButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 48, borderRadius: radius.lg, backgroundColor: colors.primary, marginBottom: 24 },
    addBillButtonText: { fontSize: 16, fontWeight: '600', color: colors.primaryTextOnPrimary },
    removeFriendButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      marginBottom: 24,
      paddingVertical: 14,
      borderWidth: 1,
      borderColor: colors.danger,
      borderRadius: radius.lg,
    },
    removeFriendButtonText: { fontSize: 15, fontWeight: '600', color: colors.danger },
    section: {},
    sectionTitle: { fontSize: 18, fontWeight: '600', color: colors.text, marginBottom: 12 },
    emptyBills: { textAlign: 'center', color: colors.mutedText, paddingVertical: 24 },
    billCard: { backgroundColor: colors.card, borderRadius: radius.xl, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.border },
    billRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    billLeft: { flex: 1, minWidth: 0 },
    billDesc: { fontSize: 16, fontWeight: '600', color: colors.text },
    billMeta: { fontSize: 12, color: colors.mutedText, marginTop: 4 },
    billRight: { alignItems: 'flex-end' },
    billTotal: { fontSize: 16, fontWeight: '700', color: colors.text },
    statusPill: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, alignSelf: 'flex-end' },
    statusSettled: { backgroundColor: 'rgba(34, 197, 94, 0.15)' },
    statusPending: { backgroundColor: 'rgba(245, 158, 11, 0.15)' },
    statusText: { fontSize: 11, fontWeight: '600' },
    statusSettledText: { color: colors.success },
    statusPendingText: { color: colors.warning },
    splitRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12, paddingVertical: 8, paddingHorizontal: 8 },
    checkbox: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
    checkboxPaid: { backgroundColor: colors.success, borderColor: colors.success },
    splitLabel: { flex: 1, fontSize: 14, color: colors.text },
    splitLabelPaid: { textDecorationLine: 'line-through', color: colors.mutedText },
    splitAmount: { fontSize: 14, fontWeight: '600', color: colors.text },
    errorText: { color: colors.mutedText, marginBottom: 16 },
    backBtn: { paddingVertical: 12, paddingHorizontal: 20, backgroundColor: colors.primary, borderRadius: radius.lg },
    backBtnText: { color: colors.primaryTextOnPrimary, fontWeight: '600' },
    modalOverlay: { flex: 1, justifyContent: 'center', padding: 24 },
    modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
    modalContent: { borderRadius: radius.xl, padding: 24 },
    modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 20 },
    input: { height: 48, borderRadius: radius.lg, paddingHorizontal: 16, marginBottom: 16, borderWidth: 1 },
    amountInput: { fontSize: 18, fontWeight: '700' },
    whoPaidLabel: { fontSize: 14, fontWeight: '500', marginBottom: 8 },
    whoPaidRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
    whoPaidButton: { flex: 1, height: 44, borderRadius: radius.lg, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
    whoPaidButtonText: { fontSize: 14, fontWeight: '600', color: colors.text },
    modalButton: { height: 48, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
    modalButtonText: { fontSize: 16, fontWeight: '600', color: colors.primaryTextOnPrimary },
  });
}

export default FriendDetailScreen;
