/**
 * Shared Presets Configuration
 * 
 * Default categories, tools, and colors used across content type views.
 * These can be overridden by section-specific configs.
 */

// Pentest-related categories with colors
export const DEFAULT_CARD_CATEGORIES = [
  { value: 'recon', label: 'Recon', color: 'bg-blue-500/10 text-blue-400 border-blue-500/30' },
  { value: 'exploit', label: 'Exploit', color: 'bg-red-500/10 text-red-400 border-red-500/30' },
  { value: 'privesc', label: 'PrivEsc', color: 'bg-orange-500/10 text-orange-400 border-orange-500/30' },
  { value: 'persistence', label: 'Persistence', color: 'bg-purple-500/10 text-purple-400 border-purple-500/30' },
  { value: 'evasion', label: 'Evasion', color: 'bg-pink-500/10 text-pink-400 border-pink-500/30' },
  { value: 'reporting', label: 'Reporting', color: 'bg-green-500/10 text-green-400 border-green-500/30' },
  { value: 'social', label: 'Social Eng', color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30' },
  { value: 'other', label: 'Other', color: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/30' },
];

// Resource categories
export const DEFAULT_LINK_CATEGORIES = [
  { value: 'tools', label: 'Tools', color: 'bg-blue-500/10 text-blue-400 border-blue-500/30' },
  { value: 'cheatsheets', label: 'Cheatsheets', color: 'bg-green-500/10 text-green-400 border-green-500/30' },
  { value: 'wordlists', label: 'Wordlists', color: 'bg-purple-500/10 text-purple-400 border-purple-500/30' },
  { value: 'payloads', label: 'Payloads', color: 'bg-red-500/10 text-red-400 border-red-500/30' },
  { value: 'exploits', label: 'Exploits', color: 'bg-orange-500/10 text-orange-400 border-orange-500/30' },
  { value: 'learning', label: 'Learning', color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30' },
  { value: 'blogs', label: 'Blogs', color: 'bg-pink-500/10 text-pink-400 border-pink-500/30' },
  { value: 'labs', label: 'Labs', color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30' },
  { value: 'ctf', label: 'CTF', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' },
  { value: 'other', label: 'Other', color: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/30' },
];

// Command tools with colors
export const DEFAULT_TOOLS = [
  { name: 'nmap', color: 'text-blue-400', bg: 'bg-blue-500/10' },
  { name: 'ffuf', color: 'text-green-400', bg: 'bg-green-500/10' },
  { name: 'nuclei', color: 'text-purple-400', bg: 'bg-purple-500/10' },
  { name: 'burp', color: 'text-orange-400', bg: 'bg-orange-500/10' },
  { name: 'sqlmap', color: 'text-red-400', bg: 'bg-red-500/10' },
  { name: 'gobuster', color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
  { name: 'hydra', color: 'text-pink-400', bg: 'bg-pink-500/10' },
  { name: 'curl', color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
  { name: 'netcat', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  { name: 'python', color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
  { name: 'bash', color: 'text-zinc-400', bg: 'bg-zinc-500/10' },
  { name: 'powershell', color: 'text-blue-400', bg: 'bg-blue-500/10' },
];

// Helper to merge custom categories with defaults
export function mergeCategories(
  customCategories: string[] | undefined,
  defaultSet: typeof DEFAULT_CARD_CATEGORIES
) {
  if (!customCategories || customCategories.length === 0) {
    return defaultSet;
  }
  
  return customCategories.map((cat, idx) => ({
    value: cat,
    label: cat.charAt(0).toUpperCase() + cat.slice(1),
    color: defaultSet[idx % defaultSet.length]?.color || defaultSet[defaultSet.length - 1].color,
  }));
}

// Helper to get tool style
export function getToolStyle(
  toolName: string,
  tools: typeof DEFAULT_TOOLS = DEFAULT_TOOLS
) {
  const found = tools.find(
    t => t.name.toLowerCase() === toolName.toLowerCase()
  );
  return found || { name: toolName, color: 'text-zinc-400', bg: 'bg-zinc-500/10' };
}

// Helper to get category style
export function getCategoryStyle(
  category: string,
  categories: { value: string; label: string; color: string }[]
) {
  return categories.find(c => c.value === category)?.color || 
    categories[categories.length - 1]?.color || 
    'bg-zinc-500/10 text-zinc-400 border-zinc-500/30';
}
