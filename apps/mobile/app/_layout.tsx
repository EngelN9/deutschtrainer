import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { NotificationCoordinator } from "../src/features/notifications/NotificationCoordinator";
import { OfflineCoordinator } from "../src/features/offline/OfflineCoordinator";

const queryClient = new QueryClient();

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <OfflineCoordinator />
      <NotificationCoordinator />
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      />
    </QueryClientProvider>
  );
}
