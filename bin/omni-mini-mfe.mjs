#!/usr/bin/env node
/**
 * omni-mini-mfe CLI — Official Super App & Mini App Scaffolding Tool
 *
 * Usage:
 *   npm run omni-mini-mfe:create-super-app -- [target-dir] [options]
 *   npm run omni-mini-mfe:create-mini-app -- [app-id] [options]
 *   npx omni-mini-mfe create-super-app [target-dir] [options]
 *   npx omni-mini-mfe create-mini-app [app-id] [options]
 */

import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline/promises';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const VALID_CATEGORIES = [
  'finance',
  'transport',
  'food',
  'health',
  'productivity',
  'utilities',
  'developer',
];

const VALID_ACCENTS = [
  'blue',
  'indigo',
  'emerald',
  'amber',
  'rose',
  'cyan',
  'violet',
];

function parseArgs(argv) {
  const positional = [];
  const flags = {};

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith('--')) {
      const [key, inlineVal] = arg.slice(2).split('=');
      if (inlineVal !== undefined) {
        flags[key] = inlineVal;
      } else if (i + 1 < argv.length && !argv[i + 1].startsWith('-')) {
        flags[key] = argv[++i];
      } else {
        flags[key] = true;
      }
    } else if (arg.startsWith('-')) {
      const shortKey = arg.slice(1);
      if (shortKey === 'y') flags.yes = true;
      else if (shortKey === 'h') flags.help = true;
      else flags[shortKey] = true;
    } else {
      positional.push(arg);
    }
  }

  return { positional, flags };
}

function toPascalCase(input) {
  return (
    input
      .replace(/[^a-zA-Z0-9]+/g, ' ')
      .split(' ')
      .filter(Boolean)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('') || 'CustomMini'
  );
}

function toKebabCase(input) {
  return (
    input
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'custom-mini-app'
  );
}

function printBanner() {
  console.log('\n╭──────────────────────────────────────────────────────────╮');
  console.log('│  omni-mini-mfe • Micro-Frontend Super App & Mini App CLI │');
  console.log('╰──────────────────────────────────────────────────────────╯\n');
}

function printHelp() {
  printBanner();
  console.log(`Commands:
  npm run omni-mini-mfe:create-super-app -- [target-dir] [options]
  npm run omni-mini-mfe:create-mini-app -- [app-id] [options]

  npx omni-mini-mfe create-super-app [target-dir] [options]
  npx omni-mini-mfe create-mini-app [app-id] [options]

Options for create-super-app:
  --name <string>        Super App display name (default: "My OmniMini Super App")
  --short-name <string>  Short springboard name (default: "MyOmni")
  --accent <color>       Default accent (${VALID_ACCENTS.join('|')})
  --theme <mode>         Default theme (dark|light|system)
  --currency <code >     Wallet currency code (default: "USD")
  --balance <number>     Starter wallet balance (default: 500)
  -y, --yes              Skip interactive prompts and use defaults

Options for create-mini-app:
  --id <string>          Mini App bundle ID (e.g. "acme-rewards")
  --name <string>        Mini App display name (e.g. "Acme Rewards")
  --short-name <string>  Springboard short name (e.g. "Acme")
  --category <cat>       Category (${VALID_CATEGORIES.join('|')})
  --summary <string>     One-line summary description
  --color <hex>          Icon background hex color (default: "#6366f1")
  --permissions <list>   Comma-separated permissions (default: "storage,auth")
  --no-register          Do not auto-register into seedMiniApps.ts & MiniAppContainer.tsx
  -y, --yes              Skip interactive prompts and use defaults
`);
}

function copyDirectoryRecursive(srcDir, destDir, ignoreNames = new Set()) {
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }
  const entries = fs.readdirSync(srcDir, { withFileTypes: true });
  for (const entry of entries) {
    if (ignoreNames.has(entry.name)) continue;
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);
    if (entry.isDirectory()) {
      copyDirectoryRecursive(srcPath, destPath, ignoreNames);
    } else if (entry.isFile()) {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

async function promptIfNeeded(rl, questionText, fallbackValue, skipPrompts) {
  if (skipPrompts || !rl) return fallbackValue;
  const answer = await rl.question(`${questionText} (${fallbackValue}): `);
  return answer.trim() || fallbackValue;
}

async function runCreateSuperApp(positional, flags) {
  printBanner();
  const isInteractive = process.stdin.isTTY && !flags.yes;
  const rl = isInteractive
    ? readline.createInterface({ input: process.stdin, output: process.stdout })
    : null;

  try {
    const rawTargetDir =
      positional[0] ||
      flags.dir ||
      (await promptIfNeeded(rl, 'Target directory for new Super App', 'my-super-app', !isInteractive));

    const appName =
      flags.name ||
      (await promptIfNeeded(rl, 'Super App Platform Name', 'My OmniMini Super App', !isInteractive));

    const shortName =
      flags['short-name'] ||
      flags.shortName ||
      (await promptIfNeeded(
        rl,
        'Short Brand Name',
        appName.replace(/\s+/g, '').slice(0, 10) || 'OmniMini',
        !isInteractive
      ));

    const accentInput =
      flags.accent ||
      (await promptIfNeeded(rl, `Brand Accent (${VALID_ACCENTS.join('/')})`, 'blue', !isInteractive));
    const accentColor = VALID_ACCENTS.includes(accentInput) ? accentInput : 'blue';

    const themeInput =
      flags.theme ||
      (await promptIfNeeded(rl, 'Default Theme (dark/light/system)', 'dark', !isInteractive));
    const theme = ['dark', 'light', 'system'].includes(themeInput) ? themeInput : 'dark';

    const currency =
      flags.currency ||
      (await promptIfNeeded(rl, 'Shared Wallet Currency', 'USD', !isInteractive));

    const balanceStr =
      flags.balance ||
      (await promptIfNeeded(rl, 'Starter Wallet Balance', '500', !isInteractive));
    const starterBalance = Number.isFinite(Number(balanceStr)) ? Number(balanceStr) : 500;

    const targetDir = path.resolve(process.cwd(), String(rawTargetDir));
    const protocolSlug = toKebabCase(shortName);

    console.log(`\n→ Scaffolding Super App into: ${targetDir}`);

    const ignoreSet = new Set([
      'node_modules',
      'dist',
      '.git',
      '.DS_Store',
      path.basename(targetDir),
    ]);

    copyDirectoryRecursive(ROOT_DIR, targetDir, ignoreSet);

    // Customize src/config/superAppStarter.config.ts in the scaffolded project
    const configFilePath = path.join(targetDir, 'src', 'config', 'superAppStarter.config.ts');
    const customConfigContent = `import { MiniAppCategory, MiniAppPermission, SuperAppSettings } from '../types/miniapp';

export interface SuperAppStarterConfig {
  platform: {
    name: string;
    shortName: string;
    tagline: string;
    version: string;
    organization: string;
    supportEmail: string;
    deepLinkProtocol: string;
  };
  defaultSettings: Omit<SuperAppSettings, 'pluggableAppSettings'>;
  wallet: {
    currency: string;
    currencySymbol: string;
    starterBalance: number;
    minTopUp: number;
    maxTopUp: number;
  };
  preinstalledMiniAppIds: string[];
  registry: {
    supportedCategories: MiniAppCategory[];
    supportedPermissions: MiniAppPermission[];
    enforceSandboxedStoragePrefix: string;
  };
}

export const SUPER_APP_STARTER_CONFIG: SuperAppStarterConfig = {
  platform: {
    name: ${JSON.stringify(appName)},
    shortName: ${JSON.stringify(shortName)},
    tagline: 'Modular Micro-Frontend Host & Mini App Runtime',
    version: '1.0.0',
    organization: ${JSON.stringify(`${shortName} Core`)},
    supportEmail: ${JSON.stringify(`developers@${protocolSlug}.dev`)},
    deepLinkProtocol: ${JSON.stringify(`${protocolSlug}://app/`)},
  },
  defaultSettings: {
    theme: ${JSON.stringify(theme)},
    accentColor: ${JSON.stringify(accentColor)},
    hapticsEnabled: true,
    soundEffects: true,
    biometricAuth: true,
    deviceBezel: false,
    showStatusBar: true,
    developerMode: true,
  },
  wallet: {
    currency: ${JSON.stringify(currency)},
    currencySymbol: '$',
    starterBalance: ${starterBalance},
    minTopUp: 10,
    maxTopUp: 2500,
  },
  preinstalledMiniAppIds: [
    'miniapp-starter-template',
    'paypulse-wallet',
    'urbanride-transit',
    'foodbite-express',
    'fitsync-health',
    'noteflow-editor',
    'codecraft-scratchpad',
  ],
  registry: {
    supportedCategories: [
      'finance',
      'transport',
      'food',
      'health',
      'productivity',
      'utilities',
      'developer',
    ],
    supportedPermissions: [
      'camera',
      'location',
      'storage',
      'notifications',
      'biometrics',
      'auth',
      'clipboard',
    ],
    enforceSandboxedStoragePrefix: 'miniapp_store_',
  },
};
`;

    fs.mkdirSync(path.dirname(configFilePath), { recursive: true });
    fs.writeFileSync(configFilePath, customConfigContent, 'utf8');

    // Update package.json name in the scaffolded Super App
    const pkgPath = path.join(targetDir, 'package.json');
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      pkg.name = toKebabCase(appName);
      pkg.version = '1.0.0';
      fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
    }

    console.log('✓ Super App host workspace created successfully!');
    console.log(`✓ Configured src/config/superAppStarter.config.ts (${appName})`);
    console.log('\nNext steps:');
    console.log(`  cd ${path.relative(process.cwd(), targetDir) || '.'}`);
    console.log('  npm install');
    console.log('  npm run dev\n');
  } finally {
    if (rl) rl.close();
  }
}

async function runCreateMiniApp(positional, flags) {
  printBanner();
  const isInteractive = process.stdin.isTTY && !flags.yes;
  const rl = isInteractive
    ? readline.createInterface({ input: process.stdin, output: process.stdout })
    : null;

  try {
    const rawName =
      flags.name ||
      positional[0] ||
      (await promptIfNeeded(rl, 'Mini App Name', 'Acme Loyalty Club', !isInteractive));

    const defaultId = toKebabCase(rawName);
    const appId = toKebabCase(
      flags.id ||
        (positional[0] && flags.name ? positional[0] : '') ||
        (await promptIfNeeded(rl, 'Mini App Bundle ID', defaultId, !isInteractive))
    );

    const pascalName = toPascalCase(flags['short-name'] || flags.shortName || rawName);
    const shortName =
      flags['short-name'] ||
      flags.shortName ||
      (await promptIfNeeded(rl, 'Short Name (Springboard)', pascalName.slice(0, 10), !isInteractive));

    const categoryInput =
      flags.category ||
      (await promptIfNeeded(
        rl,
        `Category (${VALID_CATEGORIES.join('/')})`,
        'utilities',
        !isInteractive
      ));
    const category = VALID_CATEGORIES.includes(categoryInput) ? categoryInput : 'utilities';

    const summary =
      flags.summary ||
      (await promptIfNeeded(
        rl,
        'One-line Summary',
        `${rawName} micro-frontend powered by OmniMini Bridge SDK`,
        !isInteractive
      ));

    const iconBg =
      flags.color ||
      (await promptIfNeeded(rl, 'Icon Hex Color', '#6366f1', !isInteractive));

    const permsRaw =
      flags.permissions ||
      (await promptIfNeeded(
        rl,
        'Permissions (comma-separated: storage,auth,notifications,camera,location,biometrics)',
        'storage,auth',
        !isInteractive
      ));

    const permissions = String(permsRaw)
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean);

    const componentName = `${toPascalCase(shortName)}App`;
    const folderName = toKebabCase(appId);
    const targetDir = path.join(ROOT_DIR, 'src', 'miniapps', folderName);

    fs.mkdirSync(targetDir, { recursive: true });

    const manifestConstName = `${toPascalCase(shortName).toUpperCase()}_MANIFEST`;
    const today = new Date().toISOString().split('T')[0];

    const manifestContent = `import { MiniAppManifest } from '../../types/miniapp';

export const ${manifestConstName}: MiniAppManifest = {
  id: ${JSON.stringify(appId)},
  name: ${JSON.stringify(rawName)},
  shortName: ${JSON.stringify(shortName)},
  version: '1.0.0',
  category: ${JSON.stringify(category)},
  icon: 'Boxes',
  iconBg: ${JSON.stringify(iconBg)},
  gradient: 'from-indigo-500 to-blue-600',
  summary: ${JSON.stringify(summary)},
  description: ${JSON.stringify(summary)},
  author: {
    name: 'OmniMini Developer',
    email: 'dev@omnimini.dev',
    verified: true,
    org: 'OmniMini Ecosystem',
  },
  rating: 5.0,
  reviewCount: 1,
  downloadCount: 1,
  sizeKb: 52,
  permissions: ${JSON.stringify(permissions)},
  status: 'published',
  isBuiltin: true,
  releaseNotes: 'Initial v1.0.0 scaffolded via omni-mini-mfe:create-mini-app CLI.',
  updatedAt: ${JSON.stringify(today)},
  screenshots: [],
  pluggableSettingsSchema: [
    {
      id: 'enableNotifications',
      label: 'Enable In-App Alerts',
      description: ${JSON.stringify(`Receive updates and reminders from ${rawName}`)},
      type: 'switch',
      defaultValue: true,
    },
  ],
  entrypoint: ${JSON.stringify(componentName)},
};
`;

    const componentContent = `import React, { useState } from 'react';
import { MiniAppBridgeSDK } from '../../types/miniapp';
import { Sparkles, Wallet, Database, Plus } from 'lucide-react';

export interface ${componentName}Props {
  sdk: MiniAppBridgeSDK;
}

export const ${componentName}: React.FC<${componentName}Props> = ({ sdk }) => {
  const { tokens } = sdk.theme;
  const user = sdk.auth.getUser();
  const [counter, setCounter] = useState<number>(() => sdk.storage.getItem('counter') || 0);

  const handleIncrement = () => {
    const next = counter + 1;
    setCounter(next);
    sdk.storage.setItem('counter', next);
    sdk.ui.hapticFeedback('light');
    sdk.ui.showToast(\`Saved count (\${next}) to sandboxed storage\`, 'info');
  };

  return (
    <div className="p-4 space-y-4 pb-20" style={{ color: tokens.textPrimary }}>
      <div
        style={{
          background: \`linear-gradient(135deg, \${tokens.accentPrimary}, \${tokens.accentHover})\`,
          boxShadow: \`0 8px 24px \${tokens.accentGlow}\`,
          color: '#ffffff',
        }}
        className="rounded-3xl p-5 space-y-1.5 shadow-lg"
      >
        <span className="text-[10px] font-mono uppercase tracking-widest opacity-90">
          ${appId} • v1.0.0
        </span>
        <h2 className="text-lg font-black">${rawName}</h2>
        <p className="text-xs opacity-90">${summary}</p>
      </div>

      <div
        style={{ backgroundColor: tokens.bgCard, borderColor: tokens.borderDefault }}
        className="p-4 rounded-2xl border flex items-center justify-between"
      >
        <div className="space-y-0.5">
          <div className="text-xs font-bold flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5" style={{ color: tokens.accentPrimary }} />
            <span>Sandboxed State (\`sdk.storage\`)</span>
          </div>
          <p className="text-[11px]" style={{ color: tokens.textSecondary }}>
            Signed in as {user?.name || 'Guest'} • Counter: <strong>{counter}</strong>
          </p>
        </div>
        <button
          type="button"
          onClick={handleIncrement}
          style={{ backgroundColor: tokens.accentPrimary, color: tokens.accentContrast }}
          className="px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1 transition ios-active"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Increment</span>
        </button>
      </div>

      <div
        style={{ backgroundColor: tokens.bgCard, borderColor: tokens.borderDefault }}
        className="p-4 rounded-2xl border flex items-center justify-between"
      >
        <div className="space-y-0.5">
          <div className="text-xs font-bold flex items-center gap-1.5">
            <Wallet className="w-3.5 h-3.5" style={{ color: tokens.accentPrimary }} />
            <span>Shared Super App Wallet</span>
          </div>
          <p className="text-[11px]" style={{ color: tokens.textSecondary }}>
            Available Balance: \${sdk.payment.getBalance().toFixed(2)}
          </p>
        </div>
        <button
          type="button"
          onClick={() => sdk.payment.pay(5, '${rawName} Instant Purchase')}
          style={{ backgroundColor: tokens.bgSurface, borderColor: tokens.borderDefault, color: tokens.textPrimary }}
          className="px-3.5 py-2 rounded-xl border text-xs font-bold flex items-center gap-1 transition ios-active"
        >
          <Sparkles className="w-3.5 h-3.5" style={{ color: tokens.accentPrimary }} />
          <span>Pay $5.00</span>
        </button>
      </div>
    </div>
  );
};
`;

    const indexContent = `export { ${manifestConstName} } from './manifest';
export { ${componentName} } from './${componentName}';
`;

    fs.writeFileSync(path.join(targetDir, 'manifest.ts'), manifestContent, 'utf8');
    fs.writeFileSync(path.join(targetDir, `${componentName}.tsx`), componentContent, 'utf8');
    fs.writeFileSync(path.join(targetDir, 'index.ts'), indexContent, 'utf8');

    console.log(`\n✓ Created Mini App files in src/miniapps/${folderName}/:`);
    console.log(`  ├── manifest.ts (${manifestConstName})`);
    console.log(`  ├── ${componentName}.tsx`);
    console.log(`  └── index.ts`);

    // Auto-register into seedMiniApps.ts & MiniAppContainer.tsx unless --no-register is passed
    if (!flags['no-register']) {
      const seedPath = path.join(ROOT_DIR, 'src', 'data', 'seedMiniApps.ts');
      if (fs.existsSync(seedPath)) {
        let seedSrc = fs.readFileSync(seedPath, 'utf8');
        const importStmt = `import { ${manifestConstName} } from '../miniapps/${folderName}';\n`;
        if (!seedSrc.includes(manifestConstName)) {
          seedSrc = importStmt + seedSrc.replace(
            'export const INITIAL_MINI_APPS: MiniAppManifest[] = [',
            `export const INITIAL_MINI_APPS: MiniAppManifest[] = [\n  ${manifestConstName},`
          );
          fs.writeFileSync(seedPath, seedSrc, 'utf8');
          console.log(`✓ Registered ${manifestConstName} in src/data/seedMiniApps.ts`);
        }
      }

      const containerPath = path.join(ROOT_DIR, 'src', 'miniapps', 'MiniAppContainer.tsx');
      if (fs.existsSync(containerPath)) {
        let containerSrc = fs.readFileSync(containerPath, 'utf8');
        const importStmt = `import { ${componentName} } from './${folderName}';\n`;
        if (!containerSrc.includes(componentName)) {
          containerSrc = importStmt + containerSrc.replace(
            'switch (app.id) {',
            `switch (app.id) {\n      case '${appId}':\n        return <${componentName} key={reloadKey} sdk={sdk} />;`
          );
          fs.writeFileSync(containerPath, containerSrc, 'utf8');
          console.log(`✓ Mounted <${componentName} /> in src/miniapps/MiniAppContainer.tsx`);
        }
      }
    }

    console.log(`\n🎉 Mini App "${rawName}" (${appId}) is ready!\n`);
  } finally {
    if (rl) rl.close();
  }
}

export async function main(rawArgv = process.argv.slice(2)) {
  const { positional, flags } = parseArgs(rawArgv);

  if (flags.help || positional[0] === 'help') {
    printHelp();
    return;
  }

  const command = positional[0] || '';
  const remainingPositional = positional.slice(1);

  if (
    command === 'create-super-app' ||
    command === 'omni-mini-mfe:create-super-app' ||
    command === 'super-app'
  ) {
    await runCreateSuperApp(remainingPositional, flags);
  } else if (
    command === 'create-mini-app' ||
    command === 'omni-mini-mfe:create-mini-app' ||
    command === 'mini-app'
  ) {
    await runCreateMiniApp(remainingPositional, flags);
  } else {
    printHelp();
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  main().catch((err) => {
    console.error('Error:', err.message || err);
    process.exit(1);
  });
}
