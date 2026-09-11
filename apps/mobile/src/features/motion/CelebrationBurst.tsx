import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { Star } from "lucide-react-native";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import { colorTokens, resolveDuration } from "@deutschtrainer/ui";

// 星星從中心往外散開的角度與距離。固定值即可，慶祝畫面不需要亂數。
const PARTICLES = [
  { angle: -110, distance: 74, size: 18 },
  { angle: -70, distance: 66, size: 14 },
  { angle: -145, distance: 58, size: 13 },
  { angle: -35, distance: 58, size: 13 },
  { angle: -170, distance: 44, size: 11 },
  { angle: -10, distance: 44, size: 11 },
] as const;

interface CelebrationBurstProps {
  /** false 時完全不播放，例如分數不足以慶祝。 */
  enabled?: boolean;
}

export function CelebrationBurst({ enabled = true }: CelebrationBurstProps) {
  if (!enabled) {
    return null;
  }

  return (
    <View pointerEvents="none" style={styles.layer}>
      {PARTICLES.map((particle, index) => (
        <Particle
          angle={particle.angle}
          distance={particle.distance}
          index={index}
          key={particle.angle}
          size={particle.size}
        />
      ))}
    </View>
  );
}

interface ParticleProps {
  angle: number;
  distance: number;
  index: number;
  size: number;
}

function Particle({ angle, distance, index, size }: ParticleProps) {
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      index * resolveDuration("quick", reduceMotion),
      withTiming(1, { duration: resolveDuration("celebrate", reduceMotion) }),
    );
  }, [index, progress, reduceMotion]);

  const radians = (angle * Math.PI) / 180;
  const targetX = Math.cos(radians) * distance;
  const targetY = Math.sin(radians) * distance;

  const animatedStyle = useAnimatedStyle(() => ({
    // 前 60% 淡入、後 40% 淡出，散到最遠時剛好消失。
    opacity: progress.value < 0.6 ? progress.value / 0.6 : (1 - progress.value) / 0.4,
    transform: [
      { translateX: targetX * progress.value },
      { translateY: targetY * progress.value },
      { scale: 0.6 + progress.value * 0.4 },
    ],
  }));

  return (
    <Animated.View style={[styles.particle, animatedStyle]}>
      <Star color={colorTokens.warning} fill={colorTokens.warning} size={size} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  layer: {
    alignItems: "center",
    bottom: 0,
    justifyContent: "center",
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  particle: {
    position: "absolute",
  },
});
