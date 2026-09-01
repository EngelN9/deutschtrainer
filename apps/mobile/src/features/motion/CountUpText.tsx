import { useEffect, useState } from "react";
import type { StyleProp, TextStyle } from "react-native";
import { Text } from "react-native";
import {
  runOnJS,
  useDerivedValue,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { resolveDuration } from "@deutschtrainer/ui";

interface CountUpTextProps {
  /** 無障礙標籤固定唸終值，不跟著計數過程改變。 */
  accessibilityLabel?: string;
  style?: StyleProp<TextStyle>;
  value: number;
}

export function CountUpText({ accessibilityLabel, style, value }: CountUpTextProps) {
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(reduceMotion ? value : 0);
  const [displayed, setDisplayed] = useState(reduceMotion ? value : 0);

  useEffect(() => {
    progress.value = withTiming(value, {
      duration: resolveDuration("celebrate", reduceMotion),
    });
  }, [progress, reduceMotion, value]);

  // ponytail: 每幀一次 setState 把數字推回 JS thread。單一數字、單一畫面可接受；
  // 若之後要同時跑很多計數，改成 Animated.createAnimatedComponent(TextInput) + useAnimatedProps。
  useDerivedValue(() => {
    runOnJS(setDisplayed)(Math.round(progress.value));
  }, [progress]);

  return (
    <Text accessibilityLabel={accessibilityLabel ?? String(value)} style={style}>
      {displayed}
    </Text>
  );
}
