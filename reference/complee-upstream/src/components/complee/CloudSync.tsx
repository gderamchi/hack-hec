// Mounted once at the app root so cloud sync runs while AuthProvider is alive.
import { useCloudSync } from "@/hooks/useCloudSync";

export function CloudSync() {
  useCloudSync();
  return null;
}
