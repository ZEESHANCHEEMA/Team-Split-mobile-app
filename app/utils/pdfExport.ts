import type { Friend } from '../types/firestore';
import { getFriendBalance } from '../services/friendsFirestore';
import { shareContent } from './shareUtils';

const CURRENCY = 'Rs';

function billRowsHtml(friend: Friend): string {
  const sorted = [...friend.bills].sort(
    (a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0)
  );
  return sorted
    .map((b) => {
      const payer = b.paidBy === 'me' ? 'You' : friend.name;
      const date = b.createdAt?.seconds
        ? new Date(b.createdAt.seconds * 1000).toLocaleDateString()
        : '—';
      const status = b.splits.every((s) => s.paid) ? 'Settled' : 'Pending';
      const half = (b.totalAmount / 2).toFixed(2);
      return `<tr><td>${escapeHtml(b.description)}</td><td>${CURRENCY} ${b.totalAmount.toFixed(2)}</td><td>${escapeHtml(payer)}</td><td>${CURRENCY} ${half} each</td><td>${status}</td><td>${date}</td></tr>`;
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
    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1.0"/></head>
<body style="font-family: system-ui; padding: 16px;">
<h1 style="font-size: 18px;">Bills with ${escapeHtml(friend.name)}</h1>
<p style="color: #666; font-size: 12px;">Generated on ${new Date().toLocaleDateString()}</p>
${friend.phone ? `<p style="font-size: 12px;">Phone: ${escapeHtml(friend.phone)}</p>` : ''}
<table style="width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 12px;">
<thead><tr style="background: #E85C3A; color: #fff;">
<th style="text-align: left; padding: 8px;">Description</th>
<th style="padding: 8px;">Total</th>
<th style="padding: 8px;">Paid By</th>
<th style="padding: 8px;">Split</th>
<th style="padding: 8px;">Status</th>
<th style="padding: 8px;">Date</th>
</tr></thead>
<tbody>${rows}</tbody>
</table>
<p style="margin-top: 16px; font-weight: 700;">Balance: ${net > 0 ? `${friend.name} owes you ${CURRENCY} ${net.toFixed(2)}` : net < 0 ? `You owe ${friend.name} ${CURRENCY} ${Math.abs(net).toFixed(2)}` : 'All settled!'}</p>
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
