'use client'

import { SessionProvider } from 'next-auth/react'
import { ReactQueryProvider } from '@/components/providers/react-query-provider'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ReactQueryProvider>
        {children}
      </ReactQueryProvider>
    </SessionProvider>
  )
}
