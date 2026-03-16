import type { Friend } from '../types/firestore';
import { getFriendBalance } from '../services/friendsFirestore';
import { shareContent } from './shareUtils';
import { EXPENSE_CATEGORIES } from '../constants/categories';

const CURRENCY = 'Rs';

function getCategoryEmoji(category?: string): string {
  const cat = EXPENSE_CATEGORIES.find((c) => c.value === (category || 'general'));
  return cat?.emoji ?? '📦';
}

function billRowsHtml(friend: Friend): string {
  const sorted = [...(friend.bills || [])].sort(
    (a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0)
  );
  return sorted
    .map((b, i) => {
      const payer = b.paidBy === 'me' ? 'You' : friend.name;
      const date = b.createdAt?.seconds
        ? new Date(b.createdAt.seconds * 1000).toLocaleDateString()
        : '—';
      const status = b.splits.every((s) => s.paid) ? 'Settled' : 'Pending';
      const half = (b.totalAmount / 2).toFixed(2);
      const emoji = getCategoryEmoji(b.category);
      const rowBg = i % 2 === 0 ? '#ffffff' : '#f5f5f5';
      return `<tr style="background: ${rowBg};"><td style="padding: 8px;">${emoji} ${escapeHtml(b.description)}</td><td style="padding: 8px;">${CURRENCY} ${b.totalAmount.toFixed(2)}</td><td style="padding: 8px;">${escapeHtml(payer)}</td><td style="padding: 8px;">${CURRENCY} ${half} each</td><td style="padding: 8px;">${status}</td><td style="padding: 8px;">${date}</td></tr>`;
    })
    .join('');
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function generateFriendPDF(friend: Friend): Promise<void> {
  const summaryText = getFriendSummaryText(friend, CURRENCY);
  try {
    const Print = await import('expo-print');
    const Sharing = await import('expo-sharing');
    const balance = getFriendBalance(friend);
    const net = balance.theyOweMe - balance.iOweThem;
    const rows = billRowsHtml(friend);
    const totalBills = (friend.bills || []).length;
    const generatedDate = new Date().toLocaleDateString(undefined, { dateStyle: 'medium' });
    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<style>
  @media print { .footer { position: fixed; bottom: 0; left: 0; right: 0; text-align: center; font-size: 10px; color: #666; padding: 8px; } }
</style>
</head>
<body style="font-family: system-ui, -apple-system, sans-serif; margin: 0; padding: 0;">
  <div style="background: linear-gradient(135deg, #E85C3A 0%, #d94a2a 100%); color: #fff; padding: 16px 20px; margin-bottom: 0;">
    <div style="font-size: 20px; font-weight: 700; letter-spacing: -0.5px;">TeamSplit</div>
    <div style="font-size: 12px; opacity: 0.95; margin-top: 4px;">Bills with ${escapeHtml(friend.name)}</div>
  </div>
  <div style="padding: 16px 20px;">
    <div style="display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 16px;">
      <div style="flex: 1; min-width: 120px; background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 12px;">
        <div style="font-size: 11px; color: #0369a1; font-weight: 600;">Total bills</div>
        <div style="font-size: 18px; font-weight: 700; color: #0c4a6e;">${totalBills}</div>
      </div>
      <div style="flex: 1; min-width: 120px; background: ${net >= 0 ? '#f0fdf4' : '#fef2f2'}; border: 1px solid ${net >= 0 ? '#bbf7d0' : '#fecaca'}; border-radius: 8px; padding: 12px;">
        <div style="font-size: 11px; color: #666; font-weight: 600;">Balance</div>
        <div style="font-size: 18px; font-weight: 700; color: ${net >= 0 ? '#166534' : '#991b1b'};">
          ${net > 0 ? `${CURRENCY} ${net.toFixed(2)}` : net < 0 ? `-${CURRENCY} ${Math.abs(net).toFixed(2)}` : 'Settled'}
        </div>
      </div>
    </div>
    ${friend.phone ? `<p style="font-size: 12px; color: #666; margin-bottom: 12px;">Phone: ${escapeHtml(friend.phone)}</p>` : ''}
    <table style="width: 100%; border-collapse: collapse; font-size: 11px; border: 1px solid #e5e7eb;">
      <thead><tr style="background: #E85C3A; color: #fff;">
        <th style="text-align: left; padding: 10px;">Description</th>
        <th style="padding: 10px;">Total</th>
        <th style="padding: 10px;">Paid By</th>
        <th style="padding: 10px;">Split</th>
        <th style="padding: 10px;">Status</th>
        <th style="padding: 10px;">Date</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <p style="margin-top: 16px; font-weight: 700; font-size: 14px;">${net > 0 ? `${friend.name} owes you ${CURRENCY} ${net.toFixed(2)}` : net < 0 ? `You owe ${friend.name} ${CURRENCY} ${Math.abs(net).toFixed(2)}` : 'All settled!'}</p>
  </div>
  <div class="footer">TeamSplit · Generated ${generatedDate}</div>
</body>
</html>`;
    const { uri } = await Print.printToFileAsync({ html });
    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: `Bills with ${friend.name}` });
  } catch {
    // ExpoPrint native module not available (e.g. in Expo Go) — share text summary instead
    await shareContent(summaryText, `Bills with ${friend.name}`);
  }
}

export function getFriendSummaryText(friend: Friend, currency: string): string {
  const balance = getFriendBalance(friend);
  const net = balance.theyOweMe - balance.iOweThem;
  const lines = friend.bills.map(
    (b) =>
      `${b.description}: ${currency} ${b.totalAmount.toFixed(2)} (${b.paidBy === 'me' ? 'I paid' : friend.name + ' paid'})`
  );
  const balanceLine =
    net > 0
      ? `${friend.name} owes you ${currency} ${net.toFixed(2)}`
      : net < 0
        ? `You owe ${friend.name} ${currency} ${Math.abs(net).toFixed(2)}`
        : 'All settled!';
  return `TeamSplit – Bills with ${friend.name}\n\nBalance: ${balanceLine}\n\n${lines.join('\n')}`;
}
