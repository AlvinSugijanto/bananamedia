/**
 * Network Configuration
 *
 * Configure your IOTA networks and package IDs here
 */

import { getFullnodeUrl } from "@iota/iota-sdk/client";
import { createNetworkConfig } from "@iota/dapp-kit";

// Package IDs
export const DEVNET_PACKAGE_ID = "";
// Update this after deploying your contract
// Run: cd contract/social_media && iota move build && iota client publish
export const TESTNET_PACKAGE_ID =
  "0x7f453c53da60b42eaa1554ec3c1637937832e8d4d9558a1f16bc3ccba03f4866"; // Update after deployment
export const MAINNET_PACKAGE_ID = "";

// Network configuration
const { networkConfig, useNetworkVariable, useNetworkVariables } =
  createNetworkConfig({
    devnet: {
      url: getFullnodeUrl("devnet"),
      variables: {
        packageId: DEVNET_PACKAGE_ID,
      },
    },
    testnet: {
      url: getFullnodeUrl("testnet"),
      variables: {
        packageId: TESTNET_PACKAGE_ID,
      },
    },
    mainnet: {
      url: getFullnodeUrl("mainnet"),
      variables: {
        packageId: MAINNET_PACKAGE_ID,
      },
    },
  });

export { useNetworkVariable, useNetworkVariables, networkConfig };
