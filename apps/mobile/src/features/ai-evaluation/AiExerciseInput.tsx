import type { AiEvaluatedExercise } from "@deutschtrainer/shared-types";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { colorTokens, spacingTokens } from "@deutschtrainer/ui";

interface AiExerciseInputProps {
  disabled: boolean;
  exercise: AiEvaluatedExercise;
  onChange: (value: string) => void;
  value: string;
}

export function AiExerciseInput({ disabled, exercise, onChange, value }: AiExerciseInputProps) {
  const characterCount = Array.from(value).length;
  const validLength =
    characterCount >= exercise.minimumCharacters && characterCount <= exercise.maximumCharacters;

  return (
    <View style={styles.container}>
      <TextInput
        accessibilityLabel="德語自由回答"
        editable={!disabled}
        maxLength={exercise.maximumCharacters}
        multiline
        onChangeText={onChange}
        placeholder={exercise.responsePlaceholderZhTw}
        placeholderTextColor={colorTokens.mutedText}
        style={[styles.input, disabled ? styles.disabled : null]}
        textAlignVertical="top"
        value={value}
      />
      <Text style={[styles.counter, validLength ? null : styles.counterWarning]}>
        {characterCount} / {exercise.minimumCharacters}-{exercise.maximumCharacters}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacingTokens.xs,
  },
  counter: {
    alignSelf: "flex-end",
    color: colorTokens.mutedText,
    fontSize: 12,
    fontWeight: "700",
  },
  counterWarning: {
    color: colorTokens.danger,
  },
  disabled: {
    backgroundColor: "#F4F6F8",
  },
  input: {
    backgroundColor: colorTokens.surface,
    borderColor: colorTokens.border,
    borderRadius: 8,
    borderWidth: 1,
    color: colorTokens.text,
    fontSize: 17,
    lineHeight: 26,
    minHeight: 150,
    padding: spacingTokens.md,
  },
});
