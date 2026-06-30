import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "happy-dom",
    include: [
      "lib/blockchain/group-verification.test.ts",
      "lib/utils/stellar-address.test.ts",
      "components/GroupVerificationBadge.test.tsx",
    ],
    globals: false,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
