import { useEffect } from "react";
import type { ReactNode } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { durationTokens, resolveDuration, springTokens } from "@deutschtrainer/ui";

type MotionTone = "pop" | "shake";

interface MotionRevealProps {
  children: ReactNode;
  /** 用列表索引做 stagger；減少動態效果時延遲自動歸零。 */
  index?: number;
  style?: StyleProp<ViewStyle>;
  /** 重新播放動效的依賴值，例如同一畫面換到下一題。 */
  replayKey?: string | number;
  tone?: MotionTone;
}

export function MotionReveal({
  children,
  index = 0,
  style,
  replayKey,
  tone = "pop",
}: MotionRevealProps) {
  const reduceMotion = useReducedMotion();
  const opacity = useSharedValue(0);
  const scale = useSharedValue(tone === "pop" ? 0.92 : 1);
  const translateX = useSharedValue(0);

  useEffect(() => {
    const delay = index * resolveDuration("quick", reduceMotion);

    opacity.value = withDelay(
      delay,
      withTiming(1, { duration: resolveDuration("base", reduceMotion) }),
    );

    if (reduceMotion) {
      scale.value = 1;
      translateX.value = 0;
      return;
    }

    if (tone === "pop") {
      scale.value = 0.92;
      scale.value = withDelay(delay, withSpring(1, springTokens.feedback));
      return;
    }

    // 搖晃的每一段用 quick 的一半，維持與其他動效同一組節奏來源。
    const step = durationTokens.quick / 2;
    translateX.value = withSequence(
      withTiming(-8, { duration: step }),
      withTiming(8, { duration: step }),
      withTiming(-4, { duration: step }),
      withTiming(0, { duration: step }),
    );
  }, [index, opacity, reduceMotion, replayKey, scale, tone, translateX]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }, { translateX: translateX.value }],
  }));

  return <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>;
}
