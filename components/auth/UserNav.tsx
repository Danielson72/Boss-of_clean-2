'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { User } from '@supabase/supabase-js'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { User as UserIcon, Settings, LogOut, LayoutDashboard } from 'lucide-react'

interface UserData {
  role: 'customer' | 'cleaner' | 'admin'
  display_name?: string
  full_name?: string
}

export default function UserNav() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [userData, setUserData] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)

      if (user) {
        const { data } = await supabase
          .from('users')
          .select('role, display_name, full_name')
          .eq('id', user.id)
          .single()
        
        setUserData(data)
      }
      setLoading(false)
    }

    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null)
        
        if (session?.user) {
          const { data } = await supabase
            .from('users')
            .select('role, display_name, full_name')
            .eq('id', session.user.id)
            .single()
          
          setUserData(data)
        } else {
          setUserData(null)
        }
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [supabase])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const getUserInitials = () => {
    const name = userData?.display_name || userData?.full_name || user?.email
    if (!name) return 'U'
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const getUserDisplayName = () => {
    return userData?.display_name || userData?.full_name || user?.email?.split('@')[0] || 'User'
  }

  if (loading) {
    return (
      <div className="flex items-center space-x-4">
        <div className="h-8 w-16 bg-gray-200 rounded animate-pulse"></div>
        <div className="h-8 w-20 bg-gray-200 rounded animate-pulse"></div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex items-center space-x-4">
        <Link
          href="/login"
          className="text-gray-700 hover:text-blue-600 transition duration-300"
        >
          Sign In
        </Link>
        <Link
          href="/signup"
        >
          <Button>Sign Up</Button>
        </Link>
      </div>
    )
  }

  const dashboardPath = userData?.role ? `/dashboard/${userData.role}` : '/dashboard'

  return (
    <div className="flex items-center space-x-4">
      <Link href={dashboardPath}>
        <Button variant="outline" className="gap-2">
          <LayoutDashboard className="h-4 w-4" />
          Dashboard
        </Button>
      </Link>
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-8 w-8 rounded-full">
            <Avatar className="h-8 w-8">
              <AvatarFallback>{getUserInitials()}</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end" forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">
                {getUserDisplayName()}
              </p>
              <p className="text-xs leading-none text-muted-foreground">
                {user.email}
              </p>
              {userData?.role && (
                <p className="text-xs leading-none text-muted-foreground capitalize">
                  {userData.role}
                </p>
              )}
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href={dashboardPath} className="w-full cursor-pointer">
              <LayoutDashboard className="mr-2 h-4 w-4" />
              Dashboard
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/settings" className="w-full cursor-pointer">
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="cursor-pointer text-red-600 focus:text-red-600"
            onClick={handleSignOut}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}