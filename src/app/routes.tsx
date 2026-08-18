/**
 * Sistema de Rotas - Conecta Cup
 * 
 * Configuração centralizada de rotas usando React Router.
 * As rotas seguem a hierarquia do menuStructure.ts
 * 
 * Estrutura:
 * - /login → Login
 * - /signup → Cadastro
 * - / → Welcome/Home (requer autenticação)
 * - /pneus/* → Módulo de Pneus (requer autenticação)
 * - /administracao/* → Módulo Administrativo (requer autenticação)
 * - /dev/jamyli/* → Área de desenvolvimento Jamyli (requer autenticação)
 * 
 * @version 1.0.0
 * @date 2026-02-26
 */

import { createBrowserRouter, Navigate } from 'react-router';
import { lazy, Suspense } from 'react';

// Layouts
import { MainLayout } from './layouts/MainLayout';
import { AuthLayout } from './layouts/AuthLayout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { PAGES } from './utils/permissions';

// 🚀 LAZY LOADING - Componentes carregados sob demanda
const Welcome = lazy(() => import('./components/Welcome'));
const Login = lazy(() => import('./components/Login').then(m => ({ default: m.Login })));
const SignUp = lazy(() => import('./components/SignUp').then(m => ({ default: m.SignUp })));
const Dashboard = lazy(() => import('./components/Dashboard').then(m => ({ default: m.Dashboard })));
const TireStockEntry = lazy(() => import('./components/TireStockEntry'));
const TireDiscard = lazy(() => import('./components/TireDiscard').then(m => ({ default: m.TireDiscard })));
const DiscardReports = lazy(() => import('./components/DiscardReports').then(m => ({ default: m.DiscardReports })));
const TireModelRegistration = lazy(() => import('./components/TireModelRegistration').then(m => ({ default: m.TireModelRegistration })));
const ContainerRegistration = lazy(() => import('./components/ContainerRegistration').then(m => ({ default: m.ContainerRegistration })));
const TireMovement = lazy(() => import('./components/TireMovement').then(m => ({ default: m.TireMovement })));
const TireConsumption = lazy(() => import('./components/TireConsumption').then(m => ({ default: m.TireConsumption })));
const TireStatusChange = lazy(() => import('./components/TireStatusChange').then(m => ({ default: m.TireStatusChange })));
const StatusRegistration = lazy(() => import('./components/StatusRegistration').then(m => ({ default: m.StatusRegistration })));
const ARCSDataUpdate = lazy(() => import('./components/ARCSDataUpdate').then(m => ({ default: m.ARCSDataUpdate })));
const Reports = lazy(() => import('./components/Reports').then(m => ({ default: m.Reports })));
const DataImport = lazy(() => import('./components/DataImport').then(m => ({ default: m.DataImport })));
const StockAdjustment = lazy(() => import('./components/StockAdjustment').then(m => ({ default: m.StockAdjustment })));
const UserManagement = lazy(() => import('./components/UserManagement').then(m => ({ default: m.UserManagement })));
const MasterData = lazy(() => import('./components/MasterData').then(m => ({ default: m.MasterData })));
const AccessProfileManagement = lazy(() => import('./components/AccessProfileManagement').then(m => ({ default: m.AccessProfileManagement })));
const Caio = lazy(() => import('./components/Caio'));
const CadastrosCaio = lazy(() => import('./components/CadastrosCaio').then(m => ({ default: m.CadastrosCaio })));
const SeasonConfiguration = lazy(() => import('./pages/SeasonConfiguration').then(m => ({ default: m.SeasonConfiguration })));
const ConferirPneus = lazy(() => import('./pages/ConferirPneus'));
const Historico = lazy(() => import('./pages/Historico'));
const DivergenciasConferencia = lazy(() => import('./pages/DivergenciasConferencia').then(m => ({ default: m.DivergenciasConferencia })));
const ConferenciaSerial = lazy(() => import('./pages/ConferenciaSerial').then(m => ({ default: m.ConferenciaSerial })));
const Shakedown = lazy(() => import('./pages/Shakedown'));
const Demanda = lazy(() => import('./pages/Demanda'));
const PedidosPneus = lazy(() => import('./pages/PedidosPneus'));
const PitlaneRFID = lazy(() => import('./pages/PitlaneRFID').then(m => ({ default: m.PitlaneRFID })));
const Sourcing = lazy(() => import('./pages/Sourcing').then(m => ({ default: m.Sourcing })));
const SourcingSupplierPortal = lazy(() => import('./pages/SourcingSupplierPortal').then(m => ({ default: m.SourcingSupplierPortal })));
const FreightNational = lazy(() => import('./pages/Freight').then(m => ({ default: m.FreightNational })));
const FreightInternational = lazy(() => import('./pages/Freight').then(m => ({ default: m.FreightInternational })));
const FreightMasterData = lazy(() => import('./pages/FreightMasterData').then(m => ({ default: m.FreightMasterData })));
const RodasDashboard = lazy(() => import('./pages/RodasDashboard').then(m => ({ default: m.RodasDashboard })));
const Avarias = lazy(() => import('./pages/Avarias'));
const Pendencias = lazy(() => import('./pages/Pendencias'));
const ConfiguracoesNotificacoes = lazy(() => import('./pages/ConfiguracoesNotificacoes'));
const ResetPassword = lazy(() => import('./pages/ResetPassword').then(m => ({ default: m.ResetPassword })));

/**
 * Configuração de rotas do aplicativo
 * 
 * Hierarquia:
 * - /login → Página de Login (sem autenticação)
 * - /signup → Página de Cadastro (sem autenticação)
 * - Root (/) → MainLayout com Sidebar (requer autenticação)
 *   - / → Welcome
 *   - /pneus/* → Gestão de Pneus
 *   - /cadastro/* → Cadastros
 *   - /administracao/* → Administração
 *   - /dev/* → Área de Desenvolvimento
 */
export const router = createBrowserRouter([
  // 🔐 ROTAS DE AUTENTICAÇÃO (sem MainLayout)
  {
    path: '/login',
    element: (
      <AuthLayout>
        <Suspense fallback={
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#D50000] mx-auto mb-4"></div>
              <p className="text-gray-600">Carregando...</p>
            </div>
          </div>
        }>
          <Login />
        </Suspense>
      </AuthLayout>
    )
  },
  {
    path: '/signup',
    element: (
      <AuthLayout>
        <Suspense fallback={
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#D50000] mx-auto mb-4"></div>
              <p className="text-gray-600">Carregando...</p>
            </div>
          </div>
        }>
          <SignUp />
        </Suspense>
      </AuthLayout>
    )
  },
  {
    path: '/reset-password',
    element: (
      <Suspense fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#D50000] mx-auto mb-4"></div>
            <p className="text-gray-600">Carregando...</p>
          </div>
        </div>
      }>
        <ResetPassword />
      </Suspense>
    )
  },

  // 🔓 PORTAL PÚBLICO DO FORNECEDOR (sem MainLayout e sem login)
  {
    path: '/sourcing/fornecedor/:token',
    element: (
      <Suspense fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#D50000] mx-auto mb-4"></div>
            <p className="text-gray-600">Carregando...</p>
          </div>
        </div>
      }>
        <SourcingSupplierPortal />
      </Suspense>
    )
  },
  {
    path: '/sourcing/convite/:token',
    element: (
      <Suspense fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#D50000] mx-auto mb-4"></div>
            <p className="text-gray-600">Carregando...</p>
          </div>
        </div>
      }>
        <SourcingSupplierPortal />
      </Suspense>
    )
  },
  
  // 🏠 ROTAS AUTENTICADAS (com MainLayout)
  {
    path: '/',
    element: <MainLayout />,
    children: [
      // 🏠 HOME
      {
        index: true,
        element: <Welcome />
      },

      // 🚚 SOLICITAÇÃO DE FRETE
      {
        path: 'frete',
        children: [
          { index: true, element: <Navigate to="/frete/nacional" replace /> },
          {
            path: 'nacional',
            children: [
              {
                index: true,
                element: (
                  <ProtectedRoute page={PAGES.FRETE_NACIONAL}>
                    <FreightNational />
                  </ProtectedRoute>
                )
              },
              { path: 'web', element: <Navigate to="/frete/nacional" replace /> },
              { path: 'smartphone', element: <Navigate to="/frete/nacional" replace /> }
            ]
          },
          {
            path: 'internacional',
            element: (
              <ProtectedRoute page={PAGES.FRETE_INTERNACIONAL}>
                <FreightInternational />
              </ProtectedRoute>
            )
          },
          {
            path: 'masterdata',
            element: (
              <ProtectedRoute page={PAGES.MASTER_DATA}>
                <FreightMasterData />
              </ProtectedRoute>
            )
          }
        ]
      },

      // 📦 PNEUS
      {
        path: 'pneus',
        children: [
          // Redirect /pneus → /pneus/entrada
          { index: true, element: <Navigate to="/pneus/entrada" replace /> },
          
          {
            path: 'entrada',
            element: (
              <ProtectedRoute page={PAGES.STOCK_ENTRY}>
                <TireStockEntry />
              </ProtectedRoute>
            )
          },
          {
            path: 'movimentacao',
            element: (
              <ProtectedRoute page={PAGES.TIRE_MOVEMENT}>
                <TireMovement />
              </ProtectedRoute>
            )
          },
          {
            path: 'arcs',
            element: (
              <ProtectedRoute page={PAGES.ARCS_UPDATE}>
                <ARCSDataUpdate />
              </ProtectedRoute>
            )
          },
          
          // Conferência de Baias (submenu)
          {
            path: 'conferencia',
            children: [
              { index: true, element: <Navigate to="/pneus/conferencia/conferir" replace /> },
              {
                path: 'conferir',
                element: (
                  <ProtectedRoute page={PAGES.CONFERIR_PNEUS}>
                    <ConferirPneus />
                  </ProtectedRoute>
                )
              },
              {
                path: 'historico',
                element: (
                  <ProtectedRoute page={PAGES.HISTORICO_CONFERENCIA}>
                    <Historico />
                  </ProtectedRoute>
                )
              },
              {
                path: 'divergencias',
                element: (
                  <ProtectedRoute page={PAGES.DIVERGENCIAS_CONFERENCIA}>
                    <DivergenciasConferencia />
                  </ProtectedRoute>
                )
              },
              {
                path: 'serial',
                element: (
                  <ProtectedRoute page={PAGES.CONFERENCIA_SERIAL}>
                    <ConferenciaSerial />
                  </ProtectedRoute>
                )
              }
            ]
          },
          
          {
            path: 'descarte',
            element: (
              <ProtectedRoute page={PAGES.TIRE_DISCARD}>
                <TireDiscard />
              </ProtectedRoute>
            )
          },
          {
            path: 'relatorios',
            element: (
              <ProtectedRoute page={PAGES.REPORTS}>
                <Reports />
              </ProtectedRoute>
            )
          },
          {
            path: 'temporada',
            element: (
              <ProtectedRoute page={PAGES.SEASON_CONFIGURATION}>
                <SeasonConfiguration />
              </ProtectedRoute>
            )
          },
          {
            path: 'demanda',
            element: (
              <ProtectedRoute page={PAGES.DEMANDA}>
                <Demanda />
              </ProtectedRoute>
            )
          },
          {
            path: 'pedidos-pneus',
            element: (
              <ProtectedRoute page={PAGES.PEDIDOS_PNEUS}>
                <PedidosPneus />
              </ProtectedRoute>
            )
          },
          {
            path: 'pitlane-rfid',
            element: (
              <ProtectedRoute page={PAGES.RFID_PITLANE}>
                <PitlaneRFID />
              </ProtectedRoute>
            )
          }
        ]
      },

      // ⚙️ CADASTRO
      {
        path: 'cadastro',
        children: [
          { index: true, element: <Navigate to="/cadastro/modelos" replace /> },
          
          {
            path: 'modelos',
            element: (
              <ProtectedRoute page={PAGES.TIRE_MODEL}>
                <TireModelRegistration />
              </ProtectedRoute>
            )
          },
          {
            path: 'status',
            element: (
              <ProtectedRoute page={PAGES.STATUS_REGISTRATION}>
                <StatusRegistration />
              </ProtectedRoute>
            )
          },
          {
            path: 'containeres',
            element: (
              <ProtectedRoute page={PAGES.CONTAINER}>
                <ContainerRegistration />
              </ProtectedRoute>
            )
          },
          {
            path: 'master-data',
            element: (
              <ProtectedRoute page={PAGES.MASTER_DATA}>
                <MasterData />
              </ProtectedRoute>
            )
          }
        ]
      },

      // 🛡️ ADMINISTRAÇÃO
      {
        path: 'administracao',
        children: [
          { index: true, element: <Navigate to="/administracao/usuarios" replace /> },
          
          {
            path: 'usuarios',
            element: (
              <ProtectedRoute page={PAGES.USER_MANAGEMENT}>
                <UserManagement />
              </ProtectedRoute>
            )
          },
          {
            path: 'perfis',
            element: (
              <ProtectedRoute page={PAGES.USER_MANAGEMENT}>
                <AccessProfileManagement />
              </ProtectedRoute>
            )
          },
          {
            path: 'ajuste-estoque',
            element: (
              <ProtectedRoute page={PAGES.STOCK_ADJUSTMENT}>
                <StockAdjustment />
              </ProtectedRoute>
            )
          },
          {
            path: 'notificacoes',
            element: (
              <ProtectedRoute page={PAGES.CONFIGURACOES_NOTIFICACOES}>
                <ConfiguracoesNotificacoes />
              </ProtectedRoute>
            )
          }
        ]
      },

      // 💻 DESENVOLVIMENTO
      {
        path: 'dev',
        children: [
          { index: true, element: <Navigate to="/dev/rafael" replace /> },
          
          // Rafael
          {
            path: 'rafael',
            children: [
              { index: true, element: <Navigate to="/dev/rafael/dashboard" replace /> },
              
              {
                path: 'dashboard',
                element: (
                  <ProtectedRoute page={PAGES.DASHBOARD}>
                    <Dashboard />
                  </ProtectedRoute>
                )
              },
              {
                path: 'transferir-piloto',
                element: (
                  <ProtectedRoute page={PAGES.TIRE_CONSUMPTION}>
                    <TireConsumption />
                  </ProtectedRoute>
                )
              },
              {
                path: 'mudar-status',
                element: (
                  <ProtectedRoute page={PAGES.TIRE_STATUS_CHANGE}>
                    <TireStatusChange />
                  </ProtectedRoute>
                )
              },
              {
                path: 'importacao',
                element: (
                  <ProtectedRoute page={PAGES.DATA_IMPORT}>
                    <DataImport />
                  </ProtectedRoute>
                )
              },
              {
                path: 'descarte-relatorios',
                element: (
                  <ProtectedRoute page={PAGES.DISCARD_REPORTS}>
                    <DiscardReports />
                  </ProtectedRoute>
                )
              },
              {
                path: 'Sourcing',
                element: (
                  <ProtectedRoute page={PAGES.SOURCING}>
                    <Sourcing />
                  </ProtectedRoute>
                )
              },
              {
                path: 'sourcing',
                element: <Navigate to="/dev/rafael/Sourcing" replace />
              }
            ]
          },
          
          // Caio
          {
            path: 'caio',
            children: [
              { 
                index: true, 
                element: (
                  <ProtectedRoute page={PAGES.CAIO}>
                    <Caio />
                  </ProtectedRoute>
                )
              },
              {
                path: 'cadastros',
                element: (
                  <ProtectedRoute page={PAGES.CADASTROS_CAIO}>
                    <CadastrosCaio />
                  </ProtectedRoute>
                )
              }
            ]
          },
          
          // Jamyli
          {
            path: 'jamyli',
            children: [
              { index: true, element: <Navigate to="/dev/jamyli/shakedown" replace /> },
              
              {
                path: 'shakedown',
                element: (
                  <ProtectedRoute page={PAGES.SHAKEDOWN}>
                    <Shakedown />
                  </ProtectedRoute>
                )
              },
              {
                path: 'demanda',
                element: <Navigate to="/pneus/demanda" replace />
              },
              {
                path: 'pedidos-pneus',
                element: <Navigate to="/pneus/pedidos-pneus" replace />
              },
              
              // Rodas
              {
                path: 'rodas',
                children: [
                  { index: true, element: <Navigate to="/dev/jamyli/rodas/dashboard" replace /> },
                  
                  {
                    path: 'dashboard',
                    element: (
                      <ProtectedRoute page={PAGES.RODAS_DASHBOARD}>
                        <RodasDashboard />
                      </ProtectedRoute>
                    )
                  },
                  {
                    path: 'pendencias',
                    element: (
                      <ProtectedRoute page={PAGES.RODAS_PENDENCIAS}>
                        <Pendencias />
                      </ProtectedRoute>
                    )
                  },
                  {
                    path: 'avarias',
                    element: (
                      <ProtectedRoute page={PAGES.RODAS_AVARIAS}>
                        <Avarias />
                      </ProtectedRoute>
                    )
                  }
                ]
              }
            ]
          }
        ]
      },

      // 404 - Not Found
      {
        path: '*',
        element: (
          <div className="flex items-center justify-center min-h-screen bg-gray-50">
            <div className="text-center p-8">
              <h1 className="text-6xl font-bold text-gray-300 mb-4">404</h1>
              <h2 className="text-2xl font-semibold text-gray-700 mb-2">Página não encontrada</h2>
              <p className="text-gray-600 mb-6">A página que você procura não existe.</p>
              <a 
                href="/" 
                className="inline-block px-6 py-3 bg-[#D50000] text-white rounded-lg hover:bg-[#B00000] transition-colors"
              >
                Voltar para Home
              </a>
            </div>
          </div>
        )
      }
    ]
  }
]);

/**
 * Mapeamento de IDs do menu para URLs
 * Usado pela Sidebar para navegação
 */
export const MENU_ID_TO_ROUTE: Record<string, string> = {
  // Home
  'welcome': '/',
  
  // Pneus
  'tire-stock': '/pneus/entrada',
  'tire-movement': '/pneus/movimentacao',
  'arcs-data-update': '/pneus/arcs',
  'conferir-pneus': '/pneus/conferencia/conferir',
  'historico-conferencia': '/pneus/conferencia/historico',
  'divergencias-conferencia': '/pneus/conferencia/divergencias',
  'conferencia-serial': '/pneus/conferencia/serial',
  'tire-discard-entry': '/pneus/descarte',
  'reports': '/pneus/relatorios',
  'configurar-temporada': '/pneus/temporada',
  
  // Cadastro
  'tire-models': '/cadastro/modelos',
  'tire-status': '/cadastro/status',
  'containers': '/cadastro/containeres',
  'master-data': '/cadastro/master-data',
  
  // Administração
  'users': '/administracao/usuarios',
  'access-profiles': '/administracao/perfis',
  'stock-adjustment': '/administracao/ajuste-estoque',
  'configuracoes-notificacoes': '/administracao/notificacoes',
  
  // Dev - Rafael
  'dashboard': '/dev/rafael/dashboard',
  'tire-consumption': '/dev/rafael/transferir-piloto',
  'tire-status-change': '/dev/rafael/mudar-status',
  'data-import': '/dev/rafael/importacao',
  'tire-discard-reports': '/dev/rafael/descarte-relatorios',
  'sourcing': '/dev/rafael/Sourcing',

  // Solicitação de frete
  'solicitacao-frete': '/frete/nacional',
  'frete-nacional': '/frete/nacional',
  'frete-web': '/frete/nacional',
  'frete-smartphone': '/frete/nacional',
  'frete-internacional': '/frete/internacional',
  'frete-masterdata': '/frete/masterdata',
  
  // Dev - Caio
  'caio': '/dev/caio',
  'cadastros-caio': '/dev/caio/cadastros',
  
  // Pneus - Demanda e Pedidos (movidos de /dev/jamyli)
  'demanda': '/pneus/demanda',
  'pedidos-pneus': '/pneus/pedidos-pneus',
  'rfid-pitlane': '/pneus/pitlane-rfid',

  // Dev - Jamyli
  'shakedown': '/dev/jamyli/shakedown',
  'rodas-dashboard': '/dev/jamyli/rodas/dashboard',
  'rodas-pendencias': '/dev/jamyli/rodas/pendencias',
  'rodas-avarias': '/dev/jamyli/rodas/avarias',
};

/**
 * Função helper para navegação programática
 */
export function getRouteFromMenuId(menuId: string): string {
  return MENU_ID_TO_ROUTE[menuId] || '/';
}
