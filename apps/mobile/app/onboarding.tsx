import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { Pressable, StyleSheet, Switch, Text, View } from "react-native";
import type { CefrLevel, LearningGoal } from "@deutschtrainer/shared-types";
import { SUPPORTED_LEVELS } from "@deutschtrainer/shared-types";
import type { OnboardingRequest } from "@deutschtrainer/validation";
import { onboardingRequestSchema } from "@deutschtrainer/validation";
import { colorTokens, spacingTokens } from "@deutschtrainer/ui";
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
        description="先設定目前程度、目標程度與每日學習節奏。課程內容會從 B1 到 C2，但不包含 A1/A2。"
        title="初次設定"
      >
        <MessageBanner message={errorMessage} tone="error" />
        <MessageBanner message={noticeMessage} tone="info" />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>目前程度</Text>
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
          <Text style={styles.sectionTitle}>目標程度</Text>
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
          <Text style={styles.sectionTitle}>每日學習時間</Text>
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

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>學習目標</Text>
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

        <Controller
          control={control}
          name="notificationsEnabled"
          render={({ field }) => (
            <View style={styles.switchRow}>
              <View style={styles.switchTextGroup}>
                <Text style={styles.sectionTitle}>學習提醒</Text>
                <Text style={styles.helperText}>之後可在個人設定關閉。</Text>
              </View>
              <Switch
                accessibilityLabel="切換學習提醒"
                onValueChange={field.onChange}
                value={field.value}
              />
            </View>
          )}
        />

        <PrimaryButton
          accessibilityLabel="完成初次設定"
          loading={isSubmitting || status === "loading"}
          onPress={handleSubmit((values) => {
            void completeOnboarding(values);
          })}
        >
          完成設定
        </PrimaryButton>
      </AppScreen>
    </AuthGate>
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
  },
  optionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacingTokens.sm,
  },
  pill: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#CBD5E1",
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 44,
    justifyContent: "center",
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
  },
  switchRow: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#CBD5E1",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    padding: spacingTokens.md,
  },
  switchTextGroup: {
    flex: 1,
    gap: spacingTokens.xs,
    paddingRight: spacingTokens.md,
  },
});
