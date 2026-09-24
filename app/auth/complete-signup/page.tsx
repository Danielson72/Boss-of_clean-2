import { CompleteSignupForm } from './CompleteSignupForm';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function CompleteSignupPage({
  searchParams,
}: {
  searchParams: { role?: string };
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).maybeSingle();
  const role = profile?.role === 'cleaner' || searchParams.role === 'cleaner' ? 'cleaner' : 'customer';
  return <CompleteSignupForm role={role} />;
}
