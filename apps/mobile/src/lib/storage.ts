import AsyncStorage from '@react-native-async-storage/async-storage';
import { createMemoryStorage, type Storage } from '@reps/client';

/**
 * The platform adapter for the Storage port.
 *
 * AsyncStorage rather than MMKV: MMKV has no web support at all, and this app
 * ships on web from the same codebase. Because the port exists, swapping in a
 * native-only MMKV adapter later is a one-file change.
 *
 * Falls back to memory if the native module is missing, so a broken storage
 * layer degrades to "forgets on restart" instead of a crash on launch.
 */
export const storage: Storage = AsyncStorage
  ? {
      getItem: (key) => AsyncStorage.getItem(key),
      setItem: (key, value) => AsyncStorage.setItem(key, value),
      removeItem: (key) => AsyncStorage.removeItem(key),
    }
  : createMemoryStorage();
