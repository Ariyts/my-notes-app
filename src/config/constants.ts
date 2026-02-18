/**
 * Application Constants
 * 
 * Public vault password for automatic data decryption.
 * This password is embedded in the client-side code and allows
 * automatic decryption of data for all users.
 * 
 * Security Model:
 * - Data is encrypted in GitHub repository (not readable by repo viewers)
 * - Data is automatically decrypted when viewing the website
 * - This is "security through obscurity" - protects from casual viewing
 *   but NOT from determined reverse engineering
 */

// Base64 encoded password (light obfuscation)
// Original: "pentest-hub-public-vault-2025"
const ENCODED_PASSWORD = "cGVudGVzdC1odWItcHVibGljLXZhdWx0LTIwMjU=";

/**
 * Public vault password for encrypting/decrypting shared data.
 * Used for:
 * - Auto-loading data from GitHub Pages
 * - Encrypting data when pushing to GitHub
 * 
 * Note: This is NOT a security measure against determined attackers.
 * It only prevents casual viewing of data in the GitHub repository.
 */
export const PUBLIC_VAULT_PASSWORD = atob(ENCODED_PASSWORD);

/**
 * Storage keys for sync configuration
 */
export const SYNC_KEYS = {
  REPO_CONFIG: 'pentest-hub-repo-sync-config',
  SYNC_VERSION: 'pentest-hub-sync-version',
  WORKSPACES: 'pentest-hub-workspaces',
  SECTIONS: 'pentest-hub-sections',
  ACTIVE_WORKSPACE: 'pentest-hub-active-workspace',
} as const;

/**
 * Data file paths
 */
export const DATA_PATHS = {
  BASE: './data',
  WORKSPACES: 'workspaces.enc.json',
  SECTIONS: 'sections.enc.json',
  METADATA: 'metadata.json',
} as const;
