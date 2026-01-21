import { AuthForm } from '@/components/auth/AuthForm'

export default function SignupPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <AuthForm mode="signup" />
    </div>
  )
}

export const metadata = {
  title: 'Sign Up | Boss of Clean',
  description: 'Create your Boss of Clean account',
}