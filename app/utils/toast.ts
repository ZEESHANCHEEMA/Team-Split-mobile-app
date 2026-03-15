import Toast from 'react-native-toast-message';

type ToastType = 'success' | 'error';

export const showToast = (message: string, type: ToastType = 'success') => {
  if (!message) {
    return;
  }

  Toast.show({
    type,
    text1: message,
  });
};

