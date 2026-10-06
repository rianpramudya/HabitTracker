import { notFound } from 'next/navigation';
import AccountForm from '@/components/auth/account-form';
import { authScreens, type AuthScreen } from '@/modules/auth/contracts';
import { publicLanguage } from '@/lib/public-preferences';
import { devAccountEnabled } from '@/modules/auth/dev-mode';
export default async function AuthPage({ params }: { params: Promise<{ screen: string }> }) {
  const { screen } = await params;
  if (!authScreens.includes(screen as AuthScreen)) notFound();
  return (
    <AccountForm
      screen={screen as AuthScreen}
      language={await publicLanguage()}
      development={devAccountEnabled()}
    />
  );
}
