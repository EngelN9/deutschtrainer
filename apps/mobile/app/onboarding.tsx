import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { CefrLevel, LearningGoal } from "@deutschtrainer/shared-types";
import { SUPPORTED_LEVELS } from "@deutschtrainer/shared-types";
import type { OnboardingRequest } from "@deutschtrainer/validation";
import { onboardingRequestSchema } from "@deutschtrainer/validation";
import { colorTokens, radiusTokens, spacingTokens } from "@deutschtrainer/ui";
import { AppScreen } from "../src/components/AppScreen";
import { MessageBanner } from "../src/components/MessageBanner";
import { PrimaryButton } from "../src/components/PrimaryButton";
import { AuthGate } from "../src/features/auth/AuthGate";
import { useAuthStore } from "../src/features/auth/useAuthStore";

const dailyMinuteOptions = [15, 20, 30, 45, 60] as const;

const learningGoalOptions: Array<{ label: string; value: LearningGoal }> = [
  { label: "檢定準備", value: "exam_preparation" },
  { label: "工作溝通", value: "work" },
  { label: "留學學術", value: "study" },
  { label: "移民生活", value: "immigration" },
  { label: "日常生活", value: "daily_life" },
];

export default function OnboardingScreen() {
  const completeOnboarding = useAuthStore((state) => state.completeOnboarding);
  const errorMessage = useAuthStore((state) => state.errorMessage);
  const noticeMessage = useAuthStore((state) => state.noticeMessage);
  const status = useAuthStore((state) => state.status);
  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
    setValue,
    watch,
  } = useForm<OnboardingRequest>({
    defaultValues: {
      currentLevel: "B1",
      dailyMinutes: 20,
      learningGoals: ["exam_preparation"],
      notificationsEnabled: true,
      targetLevel: "B2",
    },
    resolver: zodResolver(onboardingRequestSchema),
  });
  const currentLevel = watch("currentLevel");
  const targetLevel = watch("targetLevel");
  const dailyMinutes = watch("dailyMinutes");
  const learningGoals = watch("learningGoals");

  return (
    <AuthGate mode="onboarding">
      <AppScreen
        description="先告訴我們你的程度與使用情境，今天就完成第一輪德文輸出。支援 B1 到 C2。"
        title="先決定今天怎麼練"
      >
        <MessageBanner message={errorMessage} tone="error" />
        <MessageBanner message={noticeMessage} tone="info" />

        <View style={styles.journeyCard}>
          <Text style={styles.journeyEyebrow}>第一次訓練只做三步</Text>
          <JourneyStep number={1} text="寫一段符合程度的德文" />
          <JourneyStep number={2} text="先看三個最重要的問題" />
          <JourneyStep number={3} text="重寫並比較自己改善了什麼" />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. 你現在大約在哪個程度？</Text>
          <Text style={styles.helperText}>不確定時可先選 B1，之後能在設定中調整。</Text>
          <View style={styles.optionRow}>
            {SUPPORTED_LEVELS.map((level) => (
              <SelectablePill
                accessibilityLabel={`目前程度 ${level}`}
                key={level}
                label={level}
                onPress={() => setValue("currentLevel", level, { shouldValidate: true })}
                selected={currentLevel === level}
              />
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. 你最想在哪些情境用德文？</Text>
          <Text style={styles.helperText}>可複選；這會保留在你的學習設定中。</Text>
          <View style={styles.optionRow}>
            {learningGoalOptions.map((goal) => (
              <SelectablePill
                accessibilityLabel={`切換學習目標 ${goal.label}`}
                key={goal.value}
                label={goal.label}
                onPress={() => {
                  const nextGoals = learningGoals.includes(goal.value)
                    ? learningGoals.filter((value: LearningGoal) => value !== goal.value)
                    : [...learningGoals, goal.value];
                  setValue("learningGoals", nextGoals, { shouldValidate: true });
                }}
                selected={learningGoals.includes(goal.value)}
              />
            ))}
          </View>
          {errors.learningGoals?.message ? (
            <Text style={styles.errorText}>{errors.learningGoals.message}</Text>
          ) : null}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>你的目標程度</Text>
          <View style={styles.optionRow}>
            {SUPPORTED_LEVELS.map((level) => (
              <SelectablePill
                accessibilityLabel={`目標程度 ${level}`}
                key={level}
                label={level}
                onPress={() => setValue("targetLevel", level, { shouldValidate: true })}
                selected={targetLevel === level}
              />
            ))}
          </View>
          {errors.targetLevel?.message ? (
            <Text style={styles.errorText}>{errors.targetLevel.message}</Text>
          ) : null}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. 今天可以投入多少時間？</Text>
          <View style={styles.optionRow}>
            {dailyMinuteOptions.map((minutes) => (
              <SelectablePill
                accessibilityLabel={`每日 ${minutes} 分鐘`}
                key={minutes}
                label={`${minutes} 分`}
                onPress={() => setValue("dailyMinutes", minutes, { shouldValidate: true })}
                selected={dailyMinutes === minutes}
              />
            ))}
          </View>
        </View>

        <View style={styles.todayCard}>
          <Text style={styles.todayLabel}>設定完成後的第一個行動</Text>
          <Text style={styles.todayTitle}>完成一次 {currentLevel} 德文輸出訓練</Text>
          <Text style={styles.todayText}>
            約 {dailyMinutes} 分鐘。你會先寫、只看三個重點，再重寫比較，不需要先瀏覽所有功能。
          </Text>
        </View>

        <Controller
          control={control}
          name="notificationsEnabled"
          render={({ field }) => (
            <View style={styles.switchRow}>
              <View style={styles.switchTextGroup}>
                <Text style={styles.sectionTitle}>學習提醒</Text>
                <Text style={styles.helperText}>之後可在個人設定關閉。</Text>
              </View>
              <Pressable
                aria-checked={field.value}
                accessibilityLabel="切換學習提醒"
                accessibilityRole="switch"
                accessibilityState={{ checked: field.value }}
                onPress={() => field.onChange(!field.value)}
                style={styles.switchHitArea}
              >
                <View style={[styles.switchTrack, field.value ? styles.switchTrackEnabled : null]}>
                  <View
                    style={[styles.switchThumb, field.value ? styles.switchThumbEnabled : null]}
                  />
                </View>
              </Pressable>
            </View>
          )}
        />

        <PrimaryButton
          accessibilityLabel="完成設定並開始德文輸出訓練"
          loading={isSubmitting || status === "loading"}
          onPress={handleSubmit((values) => {
            void completeOnboarding(values);
          })}
        >
          完成設定，開始輸出訓練
        </PrimaryButton>
      </AppScreen>
    </AuthGate>
  );
}

function JourneyStep({ number, text }: { number: number; text: string }) {
  return (
    <View style={styles.journeyStep}>
      <View style={styles.journeyNumber}>
        <Text style={styles.journeyNumberText}>{number}</Text>
      </View>
      <Text style={styles.journeyText}>{text}</Text>
    </View>
  );
}

interface SelectablePillProps {
  accessibilityLabel: string;
  label: CefrLevel | string;
  onPress: () => void;
  selected: boolean;
}

function SelectablePill({ accessibilityLabel, label, onPress, selected }: SelectablePillProps) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.pill, selected ? styles.pillSelected : null]}
    >
      <Text style={[styles.pillText, selected ? styles.pillTextSelected : null]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  errorText: {
    color: colorTokens.danger,
    fontSize: 13,
    lineHeight: 18,
  },
  helperText: {
    color: colorTokens.mutedText,
    fontSize: 13,
    lineHeight: 20,
  },
  journeyCard: {
    backgroundColor: colorTokens.primarySoft,
    borderColor: "#B8D0FF",
    borderRadius: radiusTokens.lg,
    borderWidth: 1,
    gap: spacingTokens.md,
    padding: spacingTokens.lg,
  },
  journeyEyebrow: {
    color: colorTokens.teal,
    fontSize: 14,
    fontWeight: "900",
  },
  journeyNumber: {
    alignItems: "center",
    backgroundColor: colorTokens.accent,
    borderRadius: radiusTokens.pill,
    height: 28,
    justifyContent: "center",
    width: 28,
  },
  journeyNumberText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900",
  },
  journeyStep: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacingTokens.sm,
  },
  journeyText: {
    color: colorTokens.text,
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 22,
  },
  optionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacingTokens.sm,
  },
  pill: {
    alignItems: "center",
    backgroundColor: colorTokens.surface,
    borderColor: colorTokens.borderStrong,
    borderRadius: radiusTokens.md,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: spacingTokens.md,
    paddingVertical: spacingTokens.sm,
  },
  pillSelected: {
    backgroundColor: colorTokens.primary,
    borderColor: colorTokens.primary,
  },
  pillText: {
    color: colorTokens.text,
    fontSize: 15,
    fontWeight: "700",
  },
  pillTextSelected: {
    color: "#FFFFFF",
  },
  section: {
    gap: spacingTokens.sm,
  },
  sectionTitle: {
    color: colorTokens.text,
    fontSize: 16,
    fontWeight: "800",
    lineHeight: 23,
  },
  switchRow: {
    alignItems: "center",
    backgroundColor: colorTokens.surface,
    borderColor: colorTokens.border,
    borderRadius: radiusTokens.lg,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    padding: spacingTokens.md,
  },
  switchHitArea: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
    minWidth: 44,
  },
  switchThumb: {
    backgroundColor: colorTokens.onStrong,
    borderRadius: radiusTokens.pill,
    height: 20,
    width: 20,
  },
  switchThumbEnabled: {
    transform: [{ translateX: 20 }],
  },
  switchTrack: {
    backgroundColor: "#94A3B8",
    borderRadius: radiusTokens.pill,
    justifyContent: "center",
    padding: 2,
    width: 44,
  },
  switchTrackEnabled: {
    backgroundColor: colorTokens.primary,
  },
  switchTextGroup: {
    flex: 1,
    gap: spacingTokens.xs,
    paddingRight: spacingTokens.md,
  },
  todayCard: {
    backgroundColor: "#173E7C",
    borderRadius: radiusTokens.lg,
    gap: spacingTokens.sm,
    padding: spacingTokens.lg,
  },
  todayLabel: {
    color: "#D7E6FF",
    fontSize: 13,
    fontWeight: "800",
  },
  todayText: {
    color: "#E8F0FF",
    fontSize: 14,
    lineHeight: 21,
  },
  todayTitle: {
    color: "#FFFFFF",
    fontSize: 19,
    fontWeight: "900",
    lineHeight: 26,
  },
});
