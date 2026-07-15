'use client';

import { useEffect, useState } from 'react';
import {
  EllipsisVertical,
  SquarePlus,
  Download,
  Smartphone,
  MonitorSmartphone,
  Compass,
  CircleAlert,
  Check,
  Link2,
} from 'lucide-react';
import {
  detectPlatform,
  getDeferredPrompt,
  subscribeInstall,
  triggerInstall,
  type Platform,
} from '@/lib/pwa/install';

const SITE_URL = 'bossofclean.com';

// Accurate iOS "Share" glyph (up arrow rising out of an open box).
function IosShareIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 15V3" />
      <path d="m8 7 4-4 4 4" />
      <path d="M8 11H6a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-2" />
    </svg>
  );
}

type StepIcon = React.ComponentType<{ className?: string }>;
interface Step {
  icon: StepIcon;
  body: React.ReactNode;
}

function StepList({ steps }: { steps: Step[] }) {
  return (
    <ol className="space-y-4">
      {steps.map((s, i) => (
        <li key={i} className="flex items-start gap-4">
          <span className="shrink-0 flex items-center justify-center w-10 h-10 rounded-xl bg-brand-gold/10 text-brand-gold">
            <s.icon className="w-5 h-5" />
          </span>
          <div className="flex-1 pt-1.5 text-brand-dark leading-relaxed">
            <span className="mr-2 inline-flex items-center justify-center w-5 h-5 rounded-full bg-brand-dark text-white text-xs font-bold align-middle">
              {i + 1}
            </span>
            {s.body}
          </div>
        </li>
      ))}
    </ol>
  );
}

function CopyLinkButton() {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(`https://${SITE_URL}/install`);
          setCopied(true);
        } catch {
          /* clipboard blocked — the URL is shown on screen anyway */
        }
      }}
      className="inline-flex items-center gap-2 rounded-xl border border-brand-gold/40 px-4 py-2.5 text-sm font-semibold text-brand-dark hover:bg-brand-gold/10 transition-colors"
    >
      <Link2 className="w-4 h-4" />
      {copied ? 'Link copied!' : `Copy ${SITE_URL}/install`}
    </button>
  );
}

function Card({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 sm:p-8 shadow-sm">
      <h2 className="font-display text-xl sm:text-2xl font-bold text-brand-dark mb-1">{title}</h2>
      {subtitle && <p className="text-gray-500 text-sm mb-6">{subtitle}</p>}
      {!subtitle && <div className="mb-6" />}
      {children}
    </div>
  );
}

const inAppName: Record<'facebook' | 'instagram' | 'other', string> = {
  facebook: 'Facebook',
  instagram: 'Instagram',
  other: 'in-app',
};

export default function InstallGuide() {
  const [platform, setPlatform] = useState<Platform | null>(null);
  const [canPrompt, setCanPrompt] = useState(false);
  const [installOutcome, setInstallOutcome] = useState<string | null>(null);

  useEffect(() => {
    setPlatform(detectPlatform());
    const sync = () => setCanPrompt(getDeferredPrompt() !== null);
    sync();
    return subscribeInstall(sync);
  }, []);

  // Pre-hydration / detecting
  if (!platform) {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center text-gray-400">
        Detecting your device…
      </div>
    );
  }

  const install = async () => {
    const outcome = await triggerInstall();
    if (outcome === 'accepted') setInstallOutcome('Installing — check your home screen!');
    else if (outcome === 'dismissed') setInstallOutcome('No problem — you can install any time.');
  };

  const RealInstallButton = (
    <button
      type="button"
      onClick={install}
      className="inline-flex items-center gap-2 bg-brand-gold text-white px-6 py-3.5 rounded-xl font-semibold hover:bg-brand-gold-light transition-colors shadow-lg"
    >
      <Download className="w-5 h-5" />
      Install Boss of Clean
    </button>
  );

  // 1. Already installed
  if (platform.isStandalone) {
    return (
      <Card title="You're all set" subtitle="Boss of Clean is already installed on this device.">
        <div className="flex items-center gap-3 text-brand-dark">
          <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-green-100 text-green-700">
            <Check className="w-5 h-5" />
          </span>
          <p>Open it any time from your home screen.</p>
        </div>
      </Card>
    );
  }

  // 2. In-app webview (Instagram / Facebook / etc.)
  if (platform.inApp) {
    const realBrowser = platform.os === 'ios' ? 'Safari' : 'Chrome';
    return (
      <Card
        title={`Open in ${realBrowser} first`}
        subtitle={`You're viewing this inside the ${inAppName[platform.inApp]} browser, which can't install apps.`}
      >
        <StepList
          steps={[
            {
              icon: EllipsisVertical,
              body: (
                <>
                  Tap the <strong>⋯ menu</strong> in the corner of the {inAppName[platform.inApp]} browser.
                </>
              ),
            },
            {
              icon: Compass,
              body: (
                <>
                  Choose <strong>Open in {realBrowser}</strong> (or &ldquo;Open in browser&rdquo;).
                </>
              ),
            },
            {
              icon: Download,
              body: (
                <>
                  On this page in {realBrowser}, follow the install steps that appear.
                </>
              ),
            },
          ]}
        />
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <CopyLinkButton />
          <span className="text-sm text-gray-400">so you can paste it into {realBrowser}</span>
        </div>
      </Card>
    );
  }

  // 3. iOS Safari
  if (platform.os === 'ios' && platform.browser === 'safari') {
    return (
      <Card title="Add to your iPhone home screen" subtitle="Safari · iOS">
        <StepList
          steps={[
            {
              icon: IosShareIcon,
              body: (
                <>
                  Tap the <strong>Share</strong> button at the bottom of Safari.
                </>
              ),
            },
            {
              icon: SquarePlus,
              body: (
                <>
                  Scroll down and tap <strong>Add to Home Screen</strong>.
                </>
              ),
            },
            {
              icon: Check,
              body: (
                <>
                  Tap <strong>Add</strong> — the Boss of Clean cat lands on your home screen.
                </>
              ),
            },
          ]}
        />
      </Card>
    );
  }

  // 4. iOS Firefox — genuinely no Add to Home Screen
  if (platform.os === 'ios' && platform.browser === 'firefox') {
    return (
      <Card
        title="Open in Safari to install"
        subtitle="Firefox on iPhone can't add apps to the home screen."
      >
        <StepList
          steps={[
            {
              icon: Compass,
              body: (
                <>
                  Open <strong>{SITE_URL}</strong> in <strong>Safari</strong>.
                </>
              ),
            },
            {
              icon: IosShareIcon,
              body: (
                <>
                  Tap the <strong>Share</strong> button at the bottom.
                </>
              ),
            },
            {
              icon: SquarePlus,
              body: (
                <>
                  Tap <strong>Add to Home Screen</strong>, then <strong>Add</strong>.
                </>
              ),
            },
          ]}
        />
        <div className="mt-6">
          <CopyLinkButton />
        </div>
      </Card>
    );
  }

  // 5. iOS Chrome / Edge / Opera — WebKit, Share lives elsewhere
  if (platform.os === 'ios') {
    const label = platform.browser.charAt(0).toUpperCase() + platform.browser.slice(1);
    return (
      <Card title="Add to your iPhone home screen" subtitle={`${label} · iOS`}>
        <StepList
          steps={[
            {
              icon: IosShareIcon,
              body: (
                <>
                  Tap the <strong>Share</strong> button — in {label} it&rsquo;s in the address bar or
                  the <strong>⋯</strong> menu (top or bottom right).
                </>
              ),
            },
            {
              icon: SquarePlus,
              body: (
                <>
                  Choose <strong>Add to Home Screen</strong>.
                </>
              ),
            },
            {
              icon: Check,
              body: (
                <>
                  Tap <strong>Add</strong>.
                </>
              ),
            },
          ]}
        />
        <div className="mt-6 flex items-start gap-3 rounded-xl bg-brand-cream border border-brand-gold/20 p-4">
          <CircleAlert className="w-5 h-5 text-brand-gold shrink-0 mt-0.5" />
          <p className="text-sm text-brand-dark">
            Don&rsquo;t see <strong>Add to Home Screen</strong>? Open{' '}
            <strong>{SITE_URL}</strong> in <strong>Safari</strong> — it always works there.
          </p>
        </div>
      </Card>
    );
  }

  // 6. Android (Chrome / Samsung / Edge / Firefox / other)
  if (platform.os === 'android') {
    const chromium = platform.browser === 'chrome' || platform.browser === 'samsung' || platform.browser === 'edge';
    const label =
      platform.browser === 'other'
        ? 'your browser'
        : platform.browser.charAt(0).toUpperCase() + platform.browser.slice(1);
    return (
      <Card title="Install on your Android phone" subtitle={`${label} · Android`}>
        {chromium && canPrompt && (
          <div className="mb-6">
            {RealInstallButton}
            {installOutcome && <p className="mt-3 text-sm text-gray-500">{installOutcome}</p>}
            <p className="mt-3 text-sm text-gray-400">Or install it manually:</p>
          </div>
        )}
        <StepList
          steps={[
            {
              icon: EllipsisVertical,
              body: (
                <>
                  Tap the <strong>⋮ menu</strong> in the top-right of {label}.
                </>
              ),
            },
            {
              icon: Download,
              body: (
                <>
                  Tap <strong>Install app</strong> {chromium ? '(or ' : '(shown as '}
                  <strong>Add to Home screen</strong>).
                </>
              ),
            },
            {
              icon: Check,
              body: (
                <>
                  Confirm <strong>Install</strong> — done.
                </>
              ),
            },
          ]}
        />
      </Card>
    );
  }

  // 7. Desktop
  return (
    <Card title="Install is built for phones" subtitle="Desktop">
      <div className="flex items-start gap-3 mb-6">
        <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-brand-gold/10 text-brand-gold shrink-0">
          <Smartphone className="w-5 h-5" />
        </span>
        <p className="text-brand-dark leading-relaxed">
          Open <strong>{SITE_URL}</strong> on your phone&rsquo;s browser to add Boss of Clean to your
          home screen. On iPhone use Safari&rsquo;s Share → Add to Home Screen; on Android tap the
          ⋮ menu → Install app.
        </p>
      </div>
      {canPrompt && (
        <div className="border-t border-gray-100 pt-6">
          <p className="text-sm text-gray-400 mb-3 flex items-center gap-2">
            <MonitorSmartphone className="w-4 h-4" /> You can also install it on this computer:
          </p>
          {RealInstallButton}
          {installOutcome && <p className="mt-3 text-sm text-gray-500">{installOutcome}</p>}
        </div>
      )}
    </Card>
  );
}
