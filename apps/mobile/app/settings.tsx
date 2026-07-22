import { useEffect, useState } from "react";
import { Bell, BellOff, Clock3, Settings as SettingsIcon } from "lucide-react-native";
import { Linking, Pressable, StyleSheet, Switch, Text, View } from "react-native";
import type { UpdateNotificationPreferencesRequest } from "@deutschtrainer/validation";
import { colorTokens, spacingTokens } from "@deutschtrainer/ui";
import { AuthGate } from "../src/features/auth/AuthGate";
import { ContentScreen } from "../src/components/ContentScreen";
import { MessageBanner } from "../src/components/MessageBanner";
import { PrimaryButton } from "../src/components/PrimaryButton";
import { StatePanel } from "../src/components/StatePanel";
import {
  getNotificationPermissionState,
  requestNotificationPermission,
} from "../src/features/notifications/notificationRuntime";
import type { NotificationPermissionState } from "../src/features/notifications/notificationTypes";
import {
  useUpdateNotificationPreferences,
  useUserSettings,
} from "../src/features/settings/useUserSettings";
import { useAuthStore } from "../src/features/auth/useAuthStore";

const reminderTimes = ["18:00", "20:00", "21:30"] as const;
const inactivityDayOptions = [2, 3, 7, 14] as const;

export default function SettingsScreen() {
  const authMode = useAuthStore((state) => state.authMode);
  const settingsQuery = useUserSettings();
  const updateMutation = useUpdateNotificationPreferences();
  const [draft, setDraft] = useState<UpdateNotificationPreferencesRequest>();
  const [permission, setPermission] = useState<NotificationPermissionState>("undetermined");
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const notifications = settingsQuery.data?.notifications;
    if (notifications) {
      setDraft({
        notificationsEnabled: notifications.notificationsEnabled,
        dailyReminderEnabled: notifications.dailyReminderEnabled,
        dailyReminderTime: notifications.dailyReminderTime,
        reviewReminderEnabled: notifications.reviewReminderEnabled,
        inactivityReminderEnabled: notifications.inactivityReminderEnabled,
        inactivityDays: notifications.inactivityDays,
        writingCompleteEnabled: notifications.writingCompleteEnabled,
        newCourseEnabled: notifications.newCourseEnabled,
        goalCompleteEnabled: notifications.goalCompleteEnabled,
        timezone: notifications.timezone,
      });
    }
  }, [settingsQuery.data?.notifications]);

  useEffect(() => {
    void getNotificationPermissionState()
      .then(setPermission)
      .catch(() => setPermission("denied"));
  }, []);

  const save = async () => {
    if (!draft) {
      return;
    }
    setNotice(null);
    let nextPermission = permission;
    if (draft.notificationsEnabled) {
      nextPermission = await requestNotificationPermission().catch(() => "denied" as const);
      setPermission(nextPermission);
    }
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || draft.timezone;
    try {
      await updateMutation.mutateAsync({ ...draft, timezone });
      setNotice(
        nextPermission === "denied" ? "偏好已保存；系統通知權限目前關閉。" : "通知偏好已保存。",
      );
    } catch {
      setNotice(null);
    }
  };

  return (
    <AuthGate mode="protected">
      <ContentScreen
        description="管理學習節奏、到期複習與重要學習事件的提醒。"
        eyebrow="個人設定"
        showBack
        title="通知與提醒"
      >
        <MessageBanner message={notice} tone="info" />
        <MessageBanner
          message={authMode === "demo" ? "Demo 設定只保存在這台裝置。" : null}
          tone="info"
        />
        <MessageBanner message={updateMutation.error?.message ?? null} tone="error" />

        {settingsQuery.isError ? (
          <StatePanel
            message={settingsQuery.error.message}
            onRetry={() => void settingsQuery.refetch()}
            state="error"
            title="無法載入設定"
          />
        ) : settingsQuery.isLoading || !draft ? (
          <StatePanel message="正在載入通知偏好..." state="loading" title="同步設定" />
        ) : (
          <>
            <View style={styles.masterBand}>
              <View style={styles.masterIcon}>
                {draft.notificationsEnabled ? (
                  <Bell color="#FFFFFF" size={22} />
                ) : (
                  <BellOff color="#FFFFFF" size={22} />
                )}
              </View>
              <View style={styles.switchCopy}>
                <Text style={styles.masterTitle}>學習通知</Text>
                <Text style={styles.masterMeta}>{permissionLabel(permission)}</Text>
              </View>
              <Switch
                accessibilityLabel="切換全部學習通知"
                disabled={updateMutation.isPending}
                onValueChange={(value) => setDraft({ ...draft, notificationsEnabled: value })}
                value={draft.notificationsEnabled}
              />
            </View>

            <SettingsSection icon={Clock3} title="排程提醒">
              <ToggleRow
                disabled={!draft.notificationsEnabled}
                label="每日學習提醒"
                onValueChange={(value) => setDraft({ ...draft, dailyReminderEnabled: value })}
                value={draft.dailyReminderEnabled}
              />
              <ToggleRow
                disabled={!draft.notificationsEnabled}
                label="到期複習提醒"
                onValueChange={(value) => setDraft({ ...draft, reviewReminderEnabled: value })}
                value={draft.reviewReminderEnabled}
              />
              <ToggleRow
                disabled={!draft.notificationsEnabled}
                label="多日未學習提醒"
                onValueChange={(value) => setDraft({ ...draft, inactivityReminderEnabled: value })}
                value={draft.inactivityReminderEnabled}
              />

              <ControlGroup label="提醒時間">
                <View accessibilityRole="radiogroup" style={styles.segmentedControl}>
                  {reminderTimes.map((time) => (
                    <SegmentButton
                      disabled={!draft.notificationsEnabled}
                      key={time}
                      label={time}
                      onPress={() => setDraft({ ...draft, dailyReminderTime: time })}
                      selected={draft.dailyReminderTime === time}
                    />
                  ))}
                </View>
              </ControlGroup>

              <ControlGroup label="未學習天數">
                <View accessibilityRole="radiogroup" style={styles.segmentedControl}>
                  {inactivityDayOptions.map((days) => (
                    <SegmentButton
                      disabled={!draft.notificationsEnabled || !draft.inactivityReminderEnabled}
                      key={days}
                      label={`${days} 天`}
                      onPress={() => setDraft({ ...draft, inactivityDays: days })}
                      selected={draft.inactivityDays === days}
                    />
                  ))}
                </View>
              </ControlGroup>
            </SettingsSection>

            <SettingsSection icon={Bell} title="學習事件">
              <ToggleRow
                disabled={!draft.notificationsEnabled}
                label="作文批改完成"
                onValueChange={(value) => setDraft({ ...draft, writingCompleteEnabled: value })}
                value={draft.writingCompleteEnabled}
              />
              <ToggleRow
                disabled={!draft.notificationsEnabled}
                label="新課程發布"
                onValueChange={(value) => setDraft({ ...draft, newCourseEnabled: value })}
                value={draft.newCourseEnabled}
              />
              <ToggleRow
                disabled={!draft.notificationsEnabled}
                label="每日目標完成"
                onValueChange={(value) => setDraft({ ...draft, goalCompleteEnabled: value })}
                value={draft.goalCompleteEnabled}
              />
            </SettingsSection>

            <View style={styles.systemRow}>
              <View style={styles.switchCopy}>
                <Text style={styles.systemLabel}>排程時區</Text>
                <Text style={styles.systemValue}>{draft.timezone}</Text>
              </View>
              {permission === "denied" ? (
                <Pressable
                  accessibilityLabel="開啟系統通知設定"
                  accessibilityRole="button"
                  onPress={() => void Linking.openSettings()}
                  style={({ pressed }) => [styles.settingsButton, pressed ? styles.pressed : null]}
                >
                  <SettingsIcon color={colorTokens.primary} size={18} />
                  <Text style={styles.settingsButtonText}>系統設定</Text>
                </Pressable>
              ) : null}
            </View>

            <PrimaryButton
              accessibilityLabel="保存通知偏好"
              loading={updateMutation.isPending}
              onPress={() => void save()}
            >
              保存設定
            </PrimaryButton>
          </>
        )}
      </ContentScreen>
    </AuthGate>
  );
}

function SettingsSection({
  children,
  icon: Icon,
  title,
}: {
  children: React.ReactNode;
  icon: typeof Bell;
  title: string;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeading}>
        <Icon color={colorTokens.teal} size={20} />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function ToggleRow({
  disabled,
  label,
  onValueChange,
  value,
}: {
  disabled: boolean;
  label: string;
  onValueChange: (value: boolean) => void;
  value: boolean;
}) {
  return (
    <View style={[styles.toggleRow, disabled ? styles.disabled : null]}>
      <Text style={styles.toggleLabel}>{label}</Text>
      <Switch
        accessibilityLabel={`切換${label}`}
        disabled={disabled}
        onValueChange={onValueChange}
        value={value}
      />
    </View>
  );
}

function ControlGroup({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <View style={styles.controlGroup}>
      <Text style={styles.controlLabel}>{label}</Text>
      {children}
    </View>
  );
}

function SegmentButton({
  disabled,
  label,
  onPress,
  selected,
}: {
  disabled: boolean;
  label: string;
  onPress: () => void;
  selected: boolean;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.segment,
        selected ? styles.segmentSelected : null,
        disabled ? styles.disabled : null,
        pressed ? styles.pressed : null,
      ]}
    >
      <Text style={[styles.segmentText, selected ? styles.segmentTextSelected : null]}>
        {label}
      </Text>
    </Pressable>
  );
}

function permissionLabel(permission: NotificationPermissionState): string {
  if (permission === "granted") return "系統權限已開啟";
  if (permission === "denied") return "系統權限已關閉";
  if (permission === "unsupported") return "此平台不支援系統通知";
  return "尚未要求系統權限";
}

const styles = StyleSheet.create({
  controlGroup: {
    gap: spacingTokens.sm,
    paddingVertical: spacingTokens.sm,
  },
  controlLabel: {
    color: colorTokens.mutedText,
    fontSize: 13,
    fontWeight: "700",
  },
  disabled: {
    opacity: 0.45,
  },
  masterBand: {
    alignItems: "center",
    backgroundColor: "#113B36",
    borderRadius: 8,
    flexDirection: "row",
    gap: spacingTokens.md,
    padding: spacingTokens.md,
  },
  masterIcon: {
    alignItems: "center",
    backgroundColor: colorTokens.teal,
    borderRadius: 8,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  masterMeta: {
    color: "#D7ECE8",
    fontSize: 13,
  },
  masterTitle: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "800",
  },
  pressed: {
    opacity: 0.72,
  },
  section: {
    borderBottomColor: colorTokens.border,
    borderBottomWidth: 1,
    gap: spacingTokens.sm,
    paddingBottom: spacingTokens.lg,
  },
  sectionHeading: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacingTokens.sm,
  },
  sectionTitle: {
    color: colorTokens.text,
    fontSize: 18,
    fontWeight: "800",
  },
  segment: {
    alignItems: "center",
    borderColor: colorTokens.border,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: 44,
    minWidth: 0,
    paddingHorizontal: spacingTokens.sm,
  },
  segmentSelected: {
    backgroundColor: "#E8F0FE",
    borderColor: colorTokens.primary,
  },
  segmentText: {
    color: colorTokens.mutedText,
    fontSize: 14,
    fontWeight: "700",
  },
  segmentTextSelected: {
    color: colorTokens.primary,
  },
  segmentedControl: {
    borderRadius: 8,
    flexDirection: "row",
    overflow: "hidden",
  },
  settingsButton: {
    alignItems: "center",
    borderColor: colorTokens.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacingTokens.xs,
    minHeight: 42,
    paddingHorizontal: spacingTokens.md,
  },
  settingsButtonText: {
    color: colorTokens.primary,
    fontSize: 14,
    fontWeight: "800",
  },
  switchCopy: {
    flex: 1,
    gap: spacingTokens.xs,
  },
  systemLabel: {
    color: colorTokens.mutedText,
    fontSize: 13,
    fontWeight: "700",
  },
  systemRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacingTokens.md,
  },
  systemValue: {
    color: colorTokens.text,
    fontSize: 16,
    fontWeight: "700",
  },
  toggleLabel: {
    color: colorTokens.text,
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
  },
  toggleRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacingTokens.md,
    minHeight: 48,
  },
});
