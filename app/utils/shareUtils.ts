import { Share } from 'react-native';

export async function shareContent(message: string, title?: string): Promise<void> {
  try {
    await Share.share({
      message,
      title: title ?? 'TeamSplit',
    });
  } catch {
    // User cancelled or error
  }
}
