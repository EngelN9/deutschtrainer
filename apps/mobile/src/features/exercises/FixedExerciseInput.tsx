import type { FixedExercise, MatchingExercise } from "@deutschtrainer/shared-types";
import { Check } from "lucide-react-native";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { colorTokens, spacingTokens } from "@deutschtrainer/ui";

interface FixedExerciseInputProps {
  disabled?: boolean;
  exercise: FixedExercise;
  onChange: (answer: unknown) => void;
  value: unknown;
}

export function FixedExerciseInput({
  disabled = false,
  exercise,
  onChange,
  value,
}: FixedExerciseInputProps) {
  switch (exercise.type) {
    case "multiple_choice":
      return (
        <View style={styles.optionList}>
          {exercise.options.map((option) => (
            <OptionButton
              disabled={disabled}
              key={option.id}
              label={option.label}
              onPress={() => onChange(option.id)}
              selected={value === option.id}
              textDe={option.textDe}
              textZhTw={option.textZhTw}
            />
          ))}
        </View>
      );
    case "multiple_select": {
      const selectedIds = stringArray(value);
      return (
        <View style={styles.optionList}>
          {exercise.options.map((option) => (
            <OptionButton
              disabled={disabled}
              key={option.id}
              label={option.label}
              onPress={() =>
                onChange(
                  selectedIds.includes(option.id)
                    ? selectedIds.filter((id) => id !== option.id)
                    : [...selectedIds, option.id],
                )
              }
              selected={selectedIds.includes(option.id)}
              textDe={option.textDe}
              textZhTw={option.textZhTw}
            />
          ))}
        </View>
      );
    }
    case "fill_blank":
    case "error_correction":
      return (
        <TextInput
          accessibilityLabel={
            exercise.type === "fill_blank" ? "輸入填空答案" : "輸入完整的正確句子"
          }
          autoCapitalize="sentences"
          autoCorrect={false}
          editable={!disabled}
          multiline={exercise.type === "error_correction"}
          onChangeText={onChange}
          placeholder={exercise.type === "fill_blank" ? "輸入德語答案" : "輸入修正後的完整句子"}
          placeholderTextColor="#6B7280"
          style={[
            styles.textInput,
            exercise.type === "error_correction" ? styles.multilineInput : null,
          ]}
          value={typeof value === "string" ? value : ""}
        />
      );
    case "sentence_order": {
      const selectedIds = stringArray(value);
      const selectedSegments = selectedIds
        .map((segmentId) => exercise.segments.find((segment) => segment.id === segmentId))
        .filter((segment) => segment !== undefined);
      const availableSegments = exercise.segments.filter(
        (segment) => !selectedIds.includes(segment.id),
      );

      return (
        <View style={styles.stack}>
          <View style={styles.answerArea}>
            <Text style={styles.areaLabel}>你的句子</Text>
            {selectedSegments.length === 0 ? (
              <Text style={styles.placeholder}>依序點選下方片段</Text>
            ) : (
              <View style={styles.segmentWrap}>
                {selectedSegments.map((segment) => (
                  <SegmentButton
                    disabled={disabled}
                    key={segment.id}
                    onPress={() => onChange(selectedIds.filter((id) => id !== segment.id))}
                    selected
                    text={segment.textDe}
                  />
                ))}
              </View>
            )}
          </View>
          <View style={styles.segmentWrap}>
            {availableSegments.map((segment) => (
              <SegmentButton
                disabled={disabled}
                key={segment.id}
                onPress={() => onChange([...selectedIds, segment.id])}
                text={segment.textDe}
              />
            ))}
          </View>
        </View>
      );
    }
    case "matching":
      return (
        <MatchingInput disabled={disabled} exercise={exercise} onChange={onChange} value={value} />
      );
  }
}

export function isExerciseAnswered(exercise: FixedExercise, value: unknown): boolean {
  switch (exercise.type) {
    case "multiple_choice":
    case "fill_blank":
    case "error_correction":
      return typeof value === "string" && value.trim().length > 0;
    case "multiple_select":
      return stringArray(value).length > 0;
    case "sentence_order":
      return stringArray(value).length === exercise.segments.length;
    case "matching":
      return Object.keys(stringRecord(value)).length === exercise.leftItems.length;
  }
}

export function formatAcceptedAnswer(exercise: FixedExercise): string {
  switch (exercise.type) {
    case "multiple_choice":
      return (
        exercise.options.find((option) => option.id === exercise.answer.optionId)?.textDe ?? ""
      );
    case "multiple_select":
      return exercise.options
        .filter((option) => exercise.answer.optionIds.includes(option.id))
        .map((option) => option.textDe)
        .join("、");
    case "fill_blank":
    case "error_correction":
      return exercise.answer.acceptedAnswers[0] ?? "";
    case "sentence_order":
      return exercise.answer.segmentIds
        .map((segmentId) => exercise.segments.find((segment) => segment.id === segmentId)?.textDe)
        .filter(Boolean)
        .join(" ");
    case "matching":
      return Object.entries(exercise.answer.pairs)
        .map(([leftId, rightId]) => {
          const left = exercise.leftItems.find((item) => item.id === leftId)?.textDe ?? leftId;
          const right = exercise.rightItems.find((item) => item.id === rightId)?.textDe ?? rightId;
          return `${left} → ${right}`;
        })
        .join("；");
  }
}

interface OptionButtonProps {
  disabled: boolean;
  label: string;
  onPress: () => void;
  selected: boolean;
  textDe: string;
  textZhTw?: string;
}

function OptionButton({ disabled, label, onPress, selected, textDe, textZhTw }: OptionButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled, selected }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.option,
        selected ? styles.selectedOption : null,
        pressed ? styles.pressed : null,
        disabled ? styles.disabled : null,
      ]}
    >
      <View style={[styles.optionLabel, selected ? styles.selectedLabel : null]}>
        {selected ? (
          <Check color="#FFFFFF" size={15} strokeWidth={3} />
        ) : (
          <Text style={styles.optionLabelText}>{label}</Text>
        )}
      </View>
      <View style={styles.optionCopy}>
        <Text style={styles.optionText}>{textDe}</Text>
        {textZhTw ? <Text style={styles.optionTranslation}>{textZhTw}</Text> : null}
      </View>
    </Pressable>
  );
}

interface SegmentButtonProps {
  disabled: boolean;
  onPress: () => void;
  selected?: boolean;
  text: string;
}

function SegmentButton({ disabled, onPress, selected = false, text }: SegmentButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.segment,
        selected ? styles.selectedSegment : null,
        pressed ? styles.pressed : null,
      ]}
    >
      <Text style={[styles.segmentText, selected ? styles.selectedSegmentText : null]}>{text}</Text>
    </Pressable>
  );
}

function MatchingInput({
  disabled,
  exercise,
  onChange,
  value,
}: {
  disabled: boolean;
  exercise: MatchingExercise;
  onChange: (answer: unknown) => void;
  value: unknown;
}) {
  const pairs = stringRecord(value);

  return (
    <View style={styles.matchingList}>
      {exercise.leftItems.map((leftItem) => (
        <View key={leftItem.id} style={styles.matchingRow}>
          <Text style={styles.matchingLeft}>{leftItem.textDe}</Text>
          <View style={styles.matchingOptions}>
            {exercise.rightItems.map((rightItem) => {
              const selected = pairs[leftItem.id] === rightItem.id;
              return (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ disabled, selected }}
                  disabled={disabled}
                  key={rightItem.id}
                  onPress={() => onChange({ ...pairs, [leftItem.id]: rightItem.id })}
                  style={({ pressed }) => [
                    styles.matchingChoice,
                    selected ? styles.selectedMatchingChoice : null,
                    pressed ? styles.pressed : null,
                  ]}
                >
                  <Text
                    style={[
                      styles.matchingChoiceText,
                      selected ? styles.selectedMatchingChoiceText : null,
                    ]}
                  >
                    {rightItem.textDe}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ))}
    </View>
  );
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string")
    : [];
}

function stringRecord(value: unknown): Record<string, string> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string",
    ),
  );
}

const styles = StyleSheet.create({
  answerArea: {
    backgroundColor: colorTokens.subtle,
    borderColor: colorTokens.border,
    borderRadius: 8,
    borderStyle: "dashed",
    borderWidth: 1,
    gap: spacingTokens.sm,
    minHeight: 112,
    padding: spacingTokens.md,
  },
  areaLabel: {
    color: colorTokens.mutedText,
    fontSize: 13,
    fontWeight: "700",
  },
  disabled: {
    opacity: 0.72,
  },
  matchingChoice: {
    backgroundColor: colorTokens.surface,
    borderColor: colorTokens.border,
    borderRadius: 6,
    borderWidth: 1,
    minHeight: 40,
    justifyContent: "center",
    paddingHorizontal: spacingTokens.sm,
    paddingVertical: spacingTokens.xs,
  },
  matchingChoiceText: {
    color: colorTokens.text,
    fontSize: 14,
    lineHeight: 20,
  },
  matchingLeft: {
    color: colorTokens.text,
    fontSize: 16,
    fontWeight: "800",
    lineHeight: 23,
  },
  matchingList: {
    gap: spacingTokens.md,
  },
  matchingOptions: {
    gap: spacingTokens.sm,
  },
  matchingRow: {
    borderBottomColor: colorTokens.border,
    borderBottomWidth: 1,
    gap: spacingTokens.sm,
    paddingBottom: spacingTokens.md,
  },
  multilineInput: {
    minHeight: 112,
    textAlignVertical: "top",
  },
  option: {
    alignItems: "flex-start",
    backgroundColor: colorTokens.surface,
    borderColor: colorTokens.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacingTokens.md,
    minHeight: 58,
    padding: spacingTokens.md,
  },
  optionCopy: {
    flex: 1,
    gap: spacingTokens.xs,
  },
  optionLabel: {
    alignItems: "center",
    borderColor: colorTokens.border,
    borderRadius: 6,
    borderWidth: 1,
    height: 28,
    justifyContent: "center",
    width: 28,
  },
  optionLabelText: {
    color: colorTokens.mutedText,
    fontSize: 13,
    fontWeight: "800",
  },
  optionList: {
    gap: spacingTokens.sm,
  },
  optionText: {
    color: colorTokens.text,
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 23,
  },
  optionTranslation: {
    color: colorTokens.mutedText,
    fontSize: 14,
    lineHeight: 20,
  },
  placeholder: {
    color: colorTokens.mutedText,
    fontSize: 15,
  },
  pressed: {
    opacity: 0.74,
  },
  segment: {
    backgroundColor: colorTokens.surface,
    borderColor: colorTokens.border,
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: spacingTokens.sm,
    paddingVertical: spacingTokens.sm,
  },
  segmentText: {
    color: colorTokens.text,
    fontSize: 15,
    lineHeight: 21,
  },
  segmentWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacingTokens.sm,
  },
  selectedLabel: {
    backgroundColor: colorTokens.primary,
    borderColor: colorTokens.primary,
  },
  selectedMatchingChoice: {
    backgroundColor: "#E8F0FE",
    borderColor: colorTokens.primary,
  },
  selectedMatchingChoiceText: {
    color: colorTokens.primaryDark,
    fontWeight: "700",
  },
  selectedOption: {
    backgroundColor: "#F4F7FF",
    borderColor: colorTokens.primary,
  },
  selectedSegment: {
    backgroundColor: colorTokens.primary,
    borderColor: colorTokens.primary,
  },
  selectedSegmentText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  stack: {
    gap: spacingTokens.md,
  },
  textInput: {
    backgroundColor: colorTokens.surface,
    borderColor: colorTokens.border,
    borderRadius: 8,
    borderWidth: 1,
    color: colorTokens.text,
    fontSize: 17,
    lineHeight: 25,
    minHeight: 52,
    paddingHorizontal: spacingTokens.md,
    paddingVertical: spacingTokens.sm,
  },
});
