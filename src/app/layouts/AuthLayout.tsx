import { ReactNode } from 'react';
import { Toaster } from '../components/ui/sonner';

interface AuthLayoutProps {
  children: ReactNode;
}

/**
 * AuthLayout - Layout para páginas de autenticação
 * 
 * Páginas: Login, SignUp
 * Não inclui sidebar ou navegação
 */
export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      {children}
      <Toaster />
    </div>
  );
}
