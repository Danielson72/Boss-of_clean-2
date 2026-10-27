'use client';

import { useState } from 'react';
import { completeOauthSignup } from '@/lib/actions/oauth-signup';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function CompleteSignupForm({ role }: { role: 'customer' | 'cleaner' }) {
  const [selectedRole, setSelectedRole] = useState(role);
  const [phone, setPhone] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [consented, setConsented] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const result = await completeOauthSignup({ role: selectedRole, phone, businessName, zipCode, consented });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      window.location.assign(result.role === 'cleaner' ? '/dashboard/pro/setup' : '/dashboard/customer');
    } catch {
      setError('Could not finish account setup. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader><CardTitle>Complete your account</CardTitle></CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
            {role === 'customer' && (
              <div className="space-y-2">
                <Label htmlFor="accountRole">I want to</Label>
                <select id="accountRole" value={selectedRole} onChange={(event) => setSelectedRole(event.target.value as 'customer' | 'cleaner')} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="customer">Find a local pro</option>
                  <option value="cleaner">Offer my services</option>
                </select>
              </div>
            )}
            {selectedRole === 'cleaner' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="businessName">Business Name</Label>
                  <Input id="businessName" value={businessName} onChange={(event) => setBusinessName(event.target.value)} required maxLength={200} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="zipCode">Service ZIP Code</Label>
                  <Input id="zipCode" value={zipCode} onChange={(event) => setZipCode(event.target.value)} required maxLength={5} pattern="[0-9]{5}" />
                </div>
              </>
            )}
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input id="phone" type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} required />
            </div>
            <div className="flex items-start gap-3">
              <input id="tcpa-consent" type="checkbox" checked={consented} onChange={(event) => setConsented(event.target.checked)} required className="mt-1 h-4 w-4 shrink-0" />
              <label htmlFor="tcpa-consent" className="text-xs text-muted-foreground leading-snug">
                I agree to receive calls, texts, and emails from Boss of Clean and the independent service professional(s) who respond to my request, at the phone number and email I provided. Consent is not a condition of purchase. Message and data rates may apply. Reply STOP to unsubscribe. See our{' '}
                <a href="/privacy" className="underline">Privacy Policy</a>{' '}and{' '}
                <a href="/terms" className="underline">Terms</a>.
              </label>
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={loading || !consented} className="w-full">
              {loading ? 'Saving...' : 'Finish Signup'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
