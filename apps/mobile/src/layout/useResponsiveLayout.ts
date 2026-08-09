import { useWindowDimensions } from "react-native";
import { getResponsiveLayout } from "./responsiveLayout";

export function useResponsiveLayout() {
  const { height, width } = useWindowDimensions();
  return { height, width, ...getResponsiveLayout(width) };
}
