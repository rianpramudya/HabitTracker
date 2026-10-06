import AccountForm from '@/components/auth/account-form';
import { publicLanguage } from '@/lib/public-preferences';
import { devAccountEnabled } from '@/modules/auth/dev-mode';
export default async function Login() {
  return (
    <AccountForm
      screen="login"
      language={await publicLanguage()}
      development={devAccountEnabled()}
    />
  );
}
