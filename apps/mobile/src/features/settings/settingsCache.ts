import AsyncStorage from "@react-native-async-storage/async-storage";
import { userSettingsResponseSchema, type UserSettingsResponse } from "@deutschtrainer/validation";

const SETTINGS_CACHE_PREFIX = "deutschtrainer-phase12-settings";

export async function readCachedUserSettings(
  authUserId: string,
): Promise<UserSettingsResponse | undefined> {
  let raw: string | null;
  try {
    raw = await AsyncStorage.getItem(cacheKey(authUserId));
  } catch {
    return undefined;
  }
  if (!raw) {
    return undefined;
  }

  try {
    const parsed = userSettingsResponseSchema.safeParse(JSON.parse(raw) as unknown);
    return parsed.success && parsed.data.profile.authUserId === authUserId
      ? parsed.data
      : undefined;
  } catch {
    return undefined;
  }
}

export async function writeCachedUserSettings(
  authUserId: string,
  settings: UserSettingsResponse,
): Promise<void> {
  const parsed = userSettingsResponseSchema.parse(settings);
  if (parsed.profile.authUserId !== authUserId) {
    throw new Error("設定快取與登入帳號不一致。");
  }
  await AsyncStorage.setItem(cacheKey(authUserId), JSON.stringify(parsed));
}

function cacheKey(authUserId: string): string {
  return `${SETTINGS_CACHE_PREFIX}:${authUserId}`;
}
