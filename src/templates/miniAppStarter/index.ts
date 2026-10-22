import { MiniAppCategory, MiniAppPermission } from '../../types/miniapp';

export { STARTER_MINI_APP_MANIFEST } from './manifest';
export { StarterMiniApp } from './StarterMiniApp';
export type { StarterMiniAppProps } from './StarterMiniApp';

export interface MiniAppScaffoldOptions {
  id: string;
  name: string;
  shortName: string;
  category: MiniAppCategory;
  summary: string;
  iconBg: string;
  permissions: MiniAppPermission[];
}

/**
 * Generates ready-to-use TypeScript source code for a new Mini App
 * following the OmniMini Mini App Starter Template specification.
 */
export function generateMiniAppStarterCode(opts: MiniAppScaffoldOptions): {
  componentFileName: string;
  manifestCode: string;
  componentCode: string;
} {
  const safePascalName =
    opts.shortName.replace(/[^a-zA-Z0-9]/g, '') || 'CustomMini';
  const componentName = `${safePascalName}App`;
  const componentFileName = `${componentName}.tsx`;

  const manifestCode = `import { MiniAppManifest } from '../types/miniapp';

export const ${safePascalName.toUpperCase()}_MANIFEST: MiniAppManifest = {
  id: '${opts.id}',
  name: '${opts.name}',
  shortName: '${opts.shortName}',
  version: '1.0.0',
  category: '${opts.category}',
  icon: 'Boxes',
  iconBg: '${opts.iconBg}',
  gradient: 'from-indigo-500 to-blue-600',
  summary: '${opts.summary.replace(/'/g, "\\'")}',
  description: '${opts.summary.replace(/'/g, "\\'")}',
  author: {
    name: 'OmniMini Developer',
    email: 'dev@omnimini.dev',
    verified: true,
  },
  rating: 5.0,
  reviewCount: 1,
  downloadCount: 1,
  sizeKb: 48,
  permissions: ${JSON.stringify(opts.permissions)},
  status: 'published',
  releaseNotes: 'Initial v1.0.0 release built with Mini App Starter Template.',
  updatedAt: '${new Date().toISOString().split('T')[0]}',
  screenshots: [],
  pluggableSettingsSchema: [
    {
      id: 'enableNotifications',
      label: 'Enable In-App Alerts',
      description: 'Receive updates and reminders from ${opts.name.replace(/'/g, "\\'")}',
      type: 'switch',
      defaultValue: true,
    },
  ],
  entrypoint: '${componentName}',
};
`;

  const componentCode = `import React, { useState } from 'react';
import { MiniAppBridgeSDK } from '../types/miniapp';

export interface ${componentName}Props {
  sdk: MiniAppBridgeSDK;
}

export const ${componentName}: React.FC<${componentName}Props> = ({ sdk }) => {
  const { tokens } = sdk.theme;
  const user = sdk.auth.getUser();
  const [counter, setCounter] = useState<number>(() => sdk.storage.getItem('count') || 0);

  const increment = () => {
    const next = counter + 1;
    setCounter(next);
    sdk.storage.setItem('count', next);
    sdk.ui.hapticFeedback('light');
  };

  return (
    <div className="p-4 space-y-4" style={{ color: tokens.textPrimary }}>
      <div
        className="p-5 rounded-3xl border space-y-1.5"
        style={{ backgroundColor: tokens.bgCard, borderColor: tokens.borderDefault }}
      >
        <span className="text-[10px] font-mono uppercase" style={{ color: tokens.accentPrimary }}>
          ${opts.id}
        </span>
        <h2 className="text-lg font-extrabold">${opts.name}</h2>
        <p className="text-xs" style={{ color: tokens.textSecondary }}>
          Welcome, {user?.name || 'Guest'}! Connected to Super App Bridge.
        </p>
      </div>

      <div
        className="p-4 rounded-2xl border flex items-center justify-between"
        style={{ backgroundColor: tokens.bgCard, borderColor: tokens.borderDefault }}
      >
        <div>
          <div className="text-xs font-bold">Sandboxed Counter</div>
          <div className="text-[11px]" style={{ color: tokens.textSecondary }}>
            Persisted via sdk.storage: {counter}
          </div>
        </div>
        <button
          onClick={increment}
          style={{ backgroundColor: tokens.accentPrimary, color: tokens.accentContrast }}
          className="px-4 py-2 rounded-xl text-xs font-bold"
        >
          Increment +1
        </button>
      </div>
    </div>
  );
};
`;

  return {
    componentFileName,
    manifestCode,
    componentCode,
  };
}
