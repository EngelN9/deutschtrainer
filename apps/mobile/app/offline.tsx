import { useState } from "react";
import type { Href } from "expo-router";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  CloudUpload,
  HardDriveDownload,
  RefreshCw,
  RotateCcw,
  Trash2,
  Wifi,
  WifiOff,
} from "lucide-react-native";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { colorTokens, spacingTokens } from "@deutschtrainer/ui";
import { AuthGate } from "../src/features/auth/AuthGate";
import { useAuthStore } from "../src/features/auth/useAuthStore";
import { courseCatalogQueryKey } from "../src/features/courses/useCourseCatalog";
import { learningRecordsQueryKey } from "../src/features/learning-records/useLearningRecords";
import { useConnectivityStore } from "../src/features/offline/connectivityStore";
import { useOfflineStore } from "../src/features/offline/useOfflineStore";
import { ContentScreen } from "../src/components/ContentScreen";
import { IconButton } from "../src/components/IconButton";
import { MessageBanner } from "../src/components/MessageBanner";
import { PrimaryButton } from "../src/components/PrimaryButton";

export default function OfflineScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const profile = useAuthStore((state) => state.profile);
  const connectivity = useConnectivityStore((state) => state.status);
  const profileData = useOfflineStore((state) =>
    profile ? state.profiles[profile.id] : undefined,
  );
  const syncStatus = useOfflineStore((state) => state.syncStatus);
  const lastSyncError = useOfflineStore((state) =>
    state.lastSyncProfileId === profile?.id ? state.lastSyncError : undefined,
  );
  const lastSyncSummary = useOfflineStore((state) =>
    state.lastSyncProfileId === profile?.id ? state.lastSyncSummary : undefined,
  );
  const syncPendingAttempts = useOfflineStore((state) => state.syncPendingAttempts);
  const removeCourse = useOfflineStore((state) => state.removeCourse);
  const retryAttempt = useOfflineStore((state) => state.retryAttempt);
  const discardAttempt = useOfflineStore((state) => state.discardAttempt);
  const [operationError, setOperationError] = useState<string>();
  const downloads = Object.values(profileData?.downloadedCourses ?? {}).sort((left, right) =>
    left.course.level.localeCompare(right.course.level),
  );
  const attempts = Object.values(profileData?.pendingAttempts ?? {}).sort(
    (left, right) =>
      new Date(left.request.submittedAt).getTime() - new Date(right.request.submittedAt).getTime(),
  );
  const canSync = connectivity === "online" && attempts.length > 0 && syncStatus !== "syncing";

  async function syncNow() {
    if (!profile || !canSync) {
      return;
    }
    setOperationError(undefined);
    try {
      const summary = await syncPendingAttempts(profile.id);
      if (summary.syncedCount > 0) {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: learningRecordsQueryKey(profile.id) }),
          queryClient.invalidateQueries({ queryKey: courseCatalogQueryKey(profile.id) }),
        ]);
      }
    } catch (error) {
      setOperationError(error instanceof Error ? error.message : "同步失敗。");
    }
  }

  async function runOperation(operation: () => Promise<void>) {
    setOperationError(undefined);
    try {
      await operation();
    } catch (error) {
      setOperationError(error instanceof Error ? error.message : "操作失敗。");
    }
  }

  function confirmDiscard(idempotencyKey: string, exerciseTitle: string) {
    if (!profile) {
      return;
    }
    Alert.alert("捨棄待同步作答", `確定要移除「${exerciseTitle}」的本機作答嗎？`, [
      { text: "取消", style: "cancel" },
      {
        text: "捨棄",
        style: "destructive",
        onPress: () => void runOperation(() => discardAttempt(profile.id, idempotencyKey)),
      },
    ]);
  }

  return (
    <AuthGate mode="protected">
      <ContentScreen
        action={
          <IconButton
            accessibilityLabel="立即同步待上傳作答"
            disabled={!canSync}
            icon={RefreshCw}
            onPress={() => void syncNow()}
          />
        }
        description="管理已下載課程與仍保存在裝置上的作答。"
        eyebrow="裝置儲存"
        onBack={() => router.back()}
        showBack
        title="離線與同步"
      >
        <ConnectionBand status={connectivity} />
        <MessageBanner message={operationError ?? lastSyncError ?? null} tone="error" />
        <MessageBanner message={syncSummaryMessage(lastSyncSummary)} tone="info" />

        <View style={styles.section}>
          <View style={styles.sectionHeading}>
            <HardDriveDownload color={colorTokens.teal} size={20} />
            <Text style={styles.sectionTitle}>已下載課程</Text>
            <Text style={styles.count}>{downloads.length}</Text>
          </View>
          {downloads.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>目前沒有已下載課程。</Text>
              <PrimaryButton
                accessibilityLabel="前往課程頁下載課程"
                onPress={() => router.push("/courses" as Href)}
                variant="secondary"
              >
                前往課程
              </PrimaryButton>
            </View>
          ) : (
            downloads.map((download) => (
              <View key={download.course.id} style={styles.row}>
                <View style={styles.rowCopy}>
                  <Text style={styles.rowTitle}>
                    {download.course.level} · {download.course.titleZhTw}
                  </Text>
                  <Text style={styles.meta}>下載於 {formatDate(download.downloadedAt)}</Text>
                </View>
                <IconButton
                  accessibilityLabel={`移除 ${download.course.titleZhTw} 離線課程`}
                  icon={Trash2}
                  onPress={() =>
                    profile
                      ? void runOperation(async () => {
                          await removeCourse(profile.id, download.course.id);
                          await queryClient.invalidateQueries({
                            queryKey: courseCatalogQueryKey(profile.id),
                          });
                        })
                      : undefined
                  }
                  tone="danger"
                />
              </View>
            ))
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeading}>
            <CloudUpload color={colorTokens.primary} size={20} />
            <Text style={styles.sectionTitle}>待同步作答</Text>
            <Text style={styles.count}>{attempts.length}</Text>
          </View>
          {attempts.length === 0 ? (
            <Text style={styles.emptyText}>所有本機作答都已同步。</Text>
          ) : (
            attempts.map((attempt) => (
              <View key={attempt.request.idempotencyKey} style={styles.attemptRow}>
                <View style={styles.attemptHeading}>
                  <View style={styles.rowCopy}>
                    <Text style={styles.rowTitle}>{attempt.exerciseTitle}</Text>
                    <Text style={styles.meta}>
                      {attempt.lessonTitle} · {formatDate(attempt.request.submittedAt)}
                    </Text>
                  </View>
                  <Text style={[styles.status, statusStyle(attempt.status)]}>
                    {statusLabel(attempt.status)}
                  </Text>
                </View>
                {attempt.lastError ? (
                  <Text style={styles.errorText}>{attempt.lastError}</Text>
                ) : null}
                <View style={styles.attemptActions}>
                  {attempt.status === "failed" || attempt.status === "conflict" ? (
                    <InlineAction
                      icon={RotateCcw}
                      label="重試"
                      onPress={() =>
                        profile
                          ? void runOperation(() =>
                              retryAttempt(profile.id, attempt.request.idempotencyKey),
                            )
                          : undefined
                      }
                    />
                  ) : null}
                  {attempt.status !== "syncing" ? (
                    <InlineAction
                      danger
                      icon={Trash2}
                      label="捨棄"
                      onPress={() =>
                        confirmDiscard(attempt.request.idempotencyKey, attempt.exerciseTitle)
                      }
                    />
                  ) : null}
                </View>
              </View>
            ))
          )}
        </View>

        <PrimaryButton
          accessibilityLabel="同步全部待上傳作答"
          disabled={!canSync}
          loading={syncStatus === "syncing"}
          onPress={() => void syncNow()}
        >
          {connectivity === "offline" ? "等待網路連線" : "同步全部作答"}
        </PrimaryButton>
      </ContentScreen>
    </AuthGate>
  );
}

function ConnectionBand({ status }: { status: "offline" | "online" | "unknown" }) {
  const online = status === "online";
  const Icon = online ? Wifi : WifiOff;
  return (
    <View style={[styles.connectionBand, online ? styles.onlineBand : styles.offlineBand]}>
      <Icon color={online ? colorTokens.success : colorTokens.warning} size={21} />
      <Text style={styles.connectionText}>
        {online ? "網路已連線" : status === "offline" ? "目前離線" : "正在確認網路"}
      </Text>
    </View>
  );
}

function InlineAction({
  danger = false,
  icon: Icon,
  label,
  onPress,
}: {
  danger?: boolean;
  icon: typeof Trash2;
  label: string;
  onPress: () => void;
}) {
  const color = danger ? colorTokens.danger : colorTokens.primary;
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.inlineAction, pressed ? styles.pressed : null]}
    >
      <Icon color={color} size={17} />
      <Text style={[styles.inlineActionText, { color }]}>{label}</Text>
    </Pressable>
  );
}

function statusLabel(status: "conflict" | "failed" | "pending" | "syncing") {
  return {
    conflict: "需處理",
    failed: "同步失敗",
    pending: "等待同步",
    syncing: "同步中",
  }[status];
}

function statusStyle(status: "conflict" | "failed" | "pending" | "syncing") {
  return status === "pending" || status === "syncing" ? styles.statusPending : styles.statusError;
}

function syncSummaryMessage(
  summary:
    | {
        adjustedCount: number;
        conflictCount: number;
        failedCount: number;
        syncedCount: number;
      }
    | undefined,
): string | null {
  if (!summary || summary.syncedCount + summary.conflictCount + summary.failedCount === 0) {
    return null;
  }
  const parts = [`已同步 ${summary.syncedCount} 筆`];
  if (summary.adjustedCount > 0) parts.push(`${summary.adjustedCount} 筆由伺服器校正`);
  if (summary.conflictCount > 0) parts.push(`${summary.conflictCount} 筆需處理`);
  if (summary.failedCount > 0) parts.push(`${summary.failedCount} 筆失敗`);
  return parts.join(" · ");
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("zh-TW", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

const styles = StyleSheet.create({
  attemptActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacingTokens.sm,
  },
  attemptHeading: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacingTokens.md,
  },
  attemptRow: {
    borderBottomColor: colorTokens.border,
    borderBottomWidth: 1,
    gap: spacingTokens.sm,
    paddingBottom: spacingTokens.md,
  },
  connectionBand: {
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacingTokens.sm,
    minHeight: 52,
    paddingHorizontal: spacingTokens.md,
  },
  connectionText: {
    color: colorTokens.text,
    fontSize: 15,
    fontWeight: "800",
  },
  count: {
    color: colorTokens.mutedText,
    fontSize: 14,
    fontWeight: "700",
  },
  emptyState: {
    gap: spacingTokens.md,
  },
  emptyText: {
    color: colorTokens.mutedText,
    fontSize: 14,
    lineHeight: 21,
  },
  errorText: {
    color: colorTokens.danger,
    fontSize: 13,
    lineHeight: 19,
  },
  inlineAction: {
    alignItems: "center",
    borderColor: colorTokens.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacingTokens.sm,
    minHeight: 40,
    paddingHorizontal: spacingTokens.md,
  },
  inlineActionText: {
    fontSize: 14,
    fontWeight: "800",
  },
  meta: {
    color: colorTokens.mutedText,
    fontSize: 13,
    lineHeight: 18,
  },
  offlineBand: {
    backgroundColor: "#FFF7ED",
    borderColor: "#FDBA74",
  },
  onlineBand: {
    backgroundColor: "#ECFDF3",
    borderColor: "#86C99A",
  },
  pressed: {
    opacity: 0.72,
  },
  row: {
    alignItems: "center",
    borderBottomColor: colorTokens.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: spacingTokens.md,
    paddingBottom: spacingTokens.md,
  },
  rowCopy: {
    flex: 1,
    gap: spacingTokens.xs,
  },
  rowTitle: {
    color: colorTokens.text,
    fontSize: 15,
    fontWeight: "800",
    lineHeight: 21,
  },
  section: {
    gap: spacingTokens.md,
  },
  sectionHeading: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacingTokens.sm,
  },
  sectionTitle: {
    color: colorTokens.text,
    flex: 1,
    fontSize: 18,
    fontWeight: "800",
  },
  status: {
    borderRadius: 6,
    fontSize: 12,
    fontWeight: "800",
    overflow: "hidden",
    paddingHorizontal: spacingTokens.sm,
    paddingVertical: spacingTokens.xs,
  },
  statusError: {
    backgroundColor: "#FEF2F2",
    color: colorTokens.danger,
  },
  statusPending: {
    backgroundColor: "#EFF6FF",
    color: colorTokens.primary,
  },
});
