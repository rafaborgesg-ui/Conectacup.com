import { Menu, X, LogOut, ChevronDown } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router';
import porscheCupLogo from 'figma:asset/3ae08ff326060d9638298673cda23da363101b9f.png';
import { usePermissions } from '../utils/usePermissions';
import { PAGES } from '../utils/permissions';
import { MENU_STRUCTURE, MENU_TO_PAGE_MAP, MenuItem } from '../utils/menuStructure';
import { MENU_ID_TO_ROUTE } from '../routes';

interface SidebarProps {
  onLogout?: () => void;
  userRole?: string;
  isDesktopExpanded?: boolean;
  onDesktopExpandedChange?: (expanded: boolean) => void;
}

export function Sidebar({
  onLogout,
  userRole: _userRole = 'operator',
  isDesktopExpanded = false,
  onDesktopExpandedChange
}: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<string[]>([]); // Todos os menus iniciam recolhidos
  const [hasUserInteracted, setHasUserInteracted] = useState(false); // Flag para controlar interação do usuário
  const { hasPageAccess, isLoading, profile, isUserAdmin } = usePermissions();
  const navRef = useRef<HTMLElement>(null); // Ref para o container de navegação
  const menuItemRefs = useRef<{ [key: string]: HTMLElement | null }>({}); // Refs para cada item de menu
  
  // 🆕 Obtém nome do usuário logado
  const getUserName = (): string => {
    try {
      const userStr = localStorage.getItem('porsche-cup-user');
      if (userStr) {
        const user = JSON.parse(userStr);
        return user.name || 'Usuário';
      }
    } catch (error) {
      console.error('Erro ao obter nome do usuário:', error);
    }
    return 'Usuário';
  };
  
  const currentUserName = getUserName();
  const isAdminProfile = isUserAdmin();
  
  // Log para debug
  useEffect(() => {
    if (!isLoading && profile) {
      console.log('🔐 Sidebar - Perfil carregado:', profile.name);
      console.log('📋 Páginas permitidas:', profile.pages);
    }
  }, [isLoading, profile]);

  // Usa mapeamento centralizado de menuStructure.ts
  const menuToPageMap = MENU_TO_PAGE_MAP;

  // 🔥 DEBUG: Log da estrutura do menu
  useEffect(() => {
    const emDesenvolvimento = MENU_STRUCTURE.find(m => m.id === 'administracao')?.subItems?.find(s => s.id === 'em-desenvolvimento');
    console.log('🔥 DEBUG Sidebar - Em Desenvolvimento:', emDesenvolvimento);
    console.log('🔥 DEBUG Sidebar - Subitens:', emDesenvolvimento?.subItems?.map(s => s.id));
  }, []);

  // Filtra itens do menu baseado em permissões
  const canAccessMenuItem = (item: MenuItem): boolean => {
    const pageKey = menuToPageMap[item.id];
    if (!pageKey) return false;

    const pageValue = PAGES[pageKey as keyof typeof PAGES];
    if (!pageValue) return false;

    return hasPageAccess(pageValue);
  };

  const filterMenuItems = (items: MenuItem[]): MenuItem[] => {
    return items.reduce<MenuItem[]>((visibleItems, item) => {
      if (item.adminOnly && !isAdminProfile) {
        return visibleItems;
      }

      if (item.subItems) {
        const filteredSubItems = filterMenuItems(item.subItems);
        if (filteredSubItems.length > 0) {
          visibleItems.push({ ...item, subItems: filteredSubItems });
        }
        return visibleItems;
      }

      if (canAccessMenuItem(item)) {
        visibleItems.push({ ...item });
      }

      return visibleItems;
    }, []);
  };
  
  // 🆕 Helper: Converte pathname para menuId
  const getMenuIdFromPath = (pathname: string): string | null => {
    // Procura no mapeamento reverso
    for (const [menuId, route] of Object.entries(MENU_ID_TO_ROUTE)) {
      if (route === pathname) {
        return menuId;
      }
    }
    
    // Se é a home, retorna 'welcome'
    if (pathname === '/') {
      return 'welcome';
    }
    
    return null;
  };

  const currentMenuId = getMenuIdFromPath(location.pathname);
  
  // Expande automaticamente os menus SOMENTE APÓS o usuário clicar em algum item
  useEffect(() => {
    // Não expande automaticamente se o usuário ainda não interagiu
    if (!hasUserInteracted) {
      return;
    }
    
    const pneusModules = [
      'tire-stock',
      'tire-movement', 'reports',
      'tire-discard-entry',
      'tire-status-change', 'arcs-data-update',
      'configurar-temporada',
      'demanda', 'pedidos-pneus'
    ];
    
    const cadastroModules = ['tire-models', 'containers', 'tire-status', 'master-data'];
    
    const administracaoModules = ['users', 'access-profiles', 'stock-adjustment', 'dashboard', 'data-import', 'tire-consumption', 'tire-discard-reports', 'em-desenvolvimento', 'rafael', 'caio', 'cadastros-caio'];
    
    const jamyliModules = ['shakedown'];
    const rodasModules = ['rodas', 'rodas-dashboard', 'rodas-pendencias', 'rodas-avarias'];

    const conferenciaBaiasModules = ['conferir-pneus', 'historico-conferencia', 'divergencias-conferencia', 'conferencia-serial'];

    if (pneusModules.includes(currentMenuId)) {
      setExpandedMenus(prev => {
        if (!prev.includes('pneus')) {
          return [...prev, 'pneus'];
        }
        return prev;
      });
    }

    if (cadastroModules.includes(currentMenuId)) {
      setExpandedMenus(prev => {
        if (!prev.includes('cadastro')) {
          return [...prev, 'cadastro'];
        }
        return prev;
      });
    }

    if (administracaoModules.includes(currentMenuId)) {
      setExpandedMenus(prev => {
        if (!prev.includes('administracao')) {
          return [...prev, 'administracao'];
        }
        return prev;
      });
    }

    if (rodasModules.includes(currentMenuId)) {
      setExpandedMenus(prev => {
        if (!prev.includes('rodas')) return [...prev, 'rodas'];
        return prev;
      });
    }

    if (jamyliModules.includes(currentMenuId)) {
      setExpandedMenus(prev => {
        const newExpanded = [...prev];
        if (!newExpanded.includes('administracao')) newExpanded.push('administracao');
        if (!newExpanded.includes('em-desenvolvimento')) newExpanded.push('em-desenvolvimento');
        if (!newExpanded.includes('jamyli')) newExpanded.push('jamyli');
        return newExpanded;
      });
    }
    
    if (conferenciaBaiasModules.includes(currentMenuId)) {
      setExpandedMenus(prev => {
        const newExpanded = [...prev];
        if (!newExpanded.includes('pneus')) newExpanded.push('pneus');
        if (!newExpanded.includes('conferencia-baias')) newExpanded.push('conferencia-baias');
        return newExpanded;
      });
    }
    
    // Expande submenu de descarte se necessário
    if (currentMenuId === 'tire-discard-entry' || currentMenuId === 'tire-discard-reports') {
      setExpandedMenus(prev => {
        const newExpanded = [...prev];
        if (!newExpanded.includes('pneus')) newExpanded.push('pneus');
        if (!newExpanded.includes('tire-discard')) newExpanded.push('tire-discard');
        return newExpanded;
      });
    }
  }, [currentMenuId, hasUserInteracted]);

  // Usa estrutura centralizada de menuStructure.ts
  const menuItems = MENU_STRUCTURE;

  // 🎯 Scroll automático quando um menu é expandido (igual ao mobile)
  useEffect(() => {
    if (!navRef.current || expandedMenus.length === 0) return;

    // Pega o último menu expandido (o mais recente)
    const lastExpandedMenu = expandedMenus[expandedMenus.length - 1];
    const menuElement = menuItemRefs.current[lastExpandedMenu];

    if (!menuElement) return;

    // Aguarda a animação de expansão terminar
    setTimeout(() => {
      const navRect = navRef.current!.getBoundingClientRect();
      const menuRect = menuElement.getBoundingClientRect();
      
      // Calcula a posição ideal: centraliza o menu expandido
      const scrollTop = navRef.current!.scrollTop;
      const menuTop = menuRect.top - navRect.top + scrollTop;
      const offset = navRect.height / 2 - menuRect.height / 2;
      
      navRef.current!.scrollTo({
        top: Math.max(0, menuTop - offset),
        behavior: 'smooth'
      });
    }, 100); // Aguarda a animação de expansão
  }, [expandedMenus]);

  const toggleSubmenu = (itemId: string) => {
    setHasUserInteracted(true); // Marca que o usuário interagiu
    setExpandedMenus(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const expandDesktopMenu = (itemId?: string) => {
    onDesktopExpandedChange?.(true);
    setHasUserInteracted(true);
    if (itemId) {
      setExpandedMenus(prev => prev.includes(itemId) ? prev : [...prev, itemId]);
    }
  };

  const collapseDesktopMenu = () => {
    onDesktopExpandedChange?.(false);
  };

  // Função recursiva para verificar se um item está ativo
  const isItemActive = (item: any): boolean => {
    if (currentMenuId === item.id) return true;
    if (item.subItems) {
      return item.subItems.some((sub: any) => isItemActive(sub));
    }
    return false;
  };

  // Componente de título de seção
  const renderSectionTitle = (title: string) => (
    <div className="px-4 pt-4 pb-2">
      <h3 
        className="text-xs font-semibold uppercase tracking-wider"
        style={{ color: '#6B7280' }}
      >
        {title}
      </h3>
    </div>
  );

  // Função recursiva para renderizar itens de menu
  const renderMenuItem = (item: MenuItem, level: number = 0, isFirstInSection: boolean = false) => {
    const Icon = item.icon;
    const hasSubItems = item.subItems && item.subItems.length > 0;
    const isExpanded = expandedMenus.includes(item.id);
    const isActive = isItemActive(item);
    const isDirectlyActive = currentMenuId === item.id;
    const isExternalLink = item.externalUrl;

    if (!isDesktopExpanded) {
      return (
        <li key={item.id}>
          <button
            onClick={() => {
              if (isExternalLink) {
                window.open(item.externalUrl, '_blank', 'noopener,noreferrer');
              } else if (hasSubItems) {
                expandDesktopMenu(item.id);
              } else {
                setHasUserInteracted(true);
                navigate(MENU_ID_TO_ROUTE[item.id] || '/');
              }
            }}
            className="relative flex h-12 w-12 items-center justify-center rounded-xl transition-all duration-200"
            title={item.label}
            aria-label={item.label}
            style={{
              ...(isActive ? {
                background: 'linear-gradient(135deg, #D50000 0%, #B00000 100%)',
                color: '#ffffff',
                boxShadow: '0 2px 8px rgba(213, 0, 0, 0.2), 0 1px 2px rgba(213, 0, 0, 0.1)',
              } : {
                color: '#E5E7EB',
                background: 'transparent',
              })
            }}
            onMouseEnter={(e) => {
              if (!isActive) {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                e.currentTarget.style.color = '#FFFFFF';
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = '#E5E7EB';
              }
            }}
          >
            <Icon size={22} strokeWidth={2} className="flex-shrink-0" />
            {hasSubItems && (
              <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-white/60" />
            )}
          </button>
        </li>
      );
    }
    
    return (
      <li 
        key={item.id}
        ref={(el) => {
          if (hasSubItems) {
            menuItemRefs.current[item.id] = el;
          }
        }}
      >
        {/* Botão do menu - Premium Design */}
        <button
          onClick={() => {
            if (isExternalLink) {
              // Abre link externo em nova aba
              window.open(item.externalUrl, '_blank', 'noopener,noreferrer');
            } else if (hasSubItems) {
              toggleSubmenu(item.id);
            } else {
              setHasUserInteracted(true); // Marca que o usuário interagiu
              navigate(MENU_ID_TO_ROUTE[item.id] || '/');
              setIsOpen(false);
            }
          }}
          className={`
            w-full flex items-center gap-2 px-3 py-2 rounded-xl
            transition-all duration-200 relative
            ${level > 0 ? 'text-sm' : 'font-medium'}
            ${level > 1 ? 'text-xs' : ''}
          `}
          style={{
            paddingLeft: `${Math.min(level * 10, 28) + 12}px`,
            paddingRight: '8px',
            ...(isDirectlyActive && !hasSubItems ? {
              background: 'linear-gradient(135deg, #D50000 0%, #B00000 100%)',
              color: '#ffffff',
              boxShadow: '0 2px 8px rgba(213, 0, 0, 0.2), 0 1px 2px rgba(213, 0, 0, 0.1)',
            } : {
              color: level > 0 ? '#9CA3AF' : '#E5E7EB',
              background: 'transparent',
            })
          }}
          onMouseEnter={(e) => {
            if (!isDirectlyActive || hasSubItems) {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
              if (!isDirectlyActive) {
                e.currentTarget.style.color = '#FFFFFF';
              }
            }
          }}
          onMouseLeave={(e) => {
            if (!isDirectlyActive || hasSubItems) {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = level > 0 ? '#9CA3AF' : '#E5E7EB';
            }
            if (isDirectlyActive && !hasSubItems) {
              e.currentTarget.style.background = 'linear-gradient(135deg, #D50000 0%, #B00000 100%)';
              e.currentTarget.style.color = '#ffffff';
            }
          }}
        >
          <Icon size={level > 0 ? 18 : 20} strokeWidth={2} className="flex-shrink-0" />
          <span className="flex-1 text-left leading-tight" style={{
            wordBreak: 'break-word',
            overflowWrap: 'break-word',
            hyphens: 'auto'
          }}>{item.label}</span>
          
          {/* Active indicator dot */}
          {isDirectlyActive && !hasSubItems && (
            <div 
              className="w-1.5 h-1.5 rounded-full"
              style={{
                background: '#ffffff',
                boxShadow: '0 0 8px rgba(255, 255, 255, 0.5)',
              }}
            />
          )}
          
          {hasSubItems && (
            <ChevronDown 
              size={16} 
              className="transition-transform duration-300 flex-shrink-0"
              style={{ 
                transform: isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)' 
              }} 
            />
          )}
        </button>

        {/* Subitens recursivos com animação */}
        {hasSubItems && (
          <div 
            className="transition-all duration-300"
            style={{
              maxHeight: isExpanded ? '2500px' : '0',
              opacity: isExpanded ? 1 : 0,
              overflow: isExpanded ? 'visible' : 'hidden',
            }}
          >
            <ul className="mt-1 space-y-1" style={{
              marginLeft: level > 0 ? '12px' : '0',
              paddingLeft: level > 0 ? '12px' : '0',
              borderLeft: level > 0 ? '2px solid rgba(255, 255, 255, 0.1)' : 'none',
            }}>
              {item.subItems.map((subItem: any) => renderMenuItem(subItem, level + 1))}
            </ul>
          </div>
        )}
      </li>
    );
  };

  // Aplica filtro de permissões
  const filteredMenuItems = filterMenuItems(menuItems);

  return (
    <>
      {/* Sidebar Desktop - Premium Design */}
      <aside
        className={`
          fixed top-0 left-0 h-full z-40
          transition-[width] duration-300 ease-in-out flex-col
          hidden lg:flex
          bg-black shadow-2xl
          ${isDesktopExpanded ? 'w-72' : 'w-20'}
        `}
      >
        {/* Header com Glassmorphism Premium */}
        <div 
          className={`border-b ${isDesktopExpanded ? 'flex items-center justify-between gap-3 p-5' : 'flex justify-center p-4'}`}
          style={{
            background: 'linear-gradient(180deg, rgba(0, 0, 0, 1) 0%, rgba(26, 26, 26, 1) 100%)',
            backdropFilter: 'blur(8px)',
            borderColor: 'rgba(255, 255, 255, 0.1)',
          }}
        >
          {isDesktopExpanded ? (
            <img
              src={porscheCupLogo}
              alt="Conecta Cup"
              className="h-14 w-auto min-w-0 object-contain"
            />
          ) : null}
          <button
            type="button"
            onClick={isDesktopExpanded ? collapseDesktopMenu : () => expandDesktopMenu()}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-white transition hover:bg-white/10"
            aria-label={isDesktopExpanded ? 'Recolher menu lateral' : 'Expandir menu lateral'}
            title={isDesktopExpanded ? 'Recolher menu' : 'Expandir menu'}
          >
            {isDesktopExpanded ? <X size={22} strokeWidth={2} /> : <Menu size={24} strokeWidth={2} />}
          </button>
        </div>

        {/* Menu Items - Scrollable com Scroll Indicators */}
        <nav 
          ref={navRef}
          className="flex-1 overflow-y-auto" 
          style={{
            WebkitOverflowScrolling: 'touch',
            scrollBehavior: 'smooth',
          }}
        >
          <div className={isDesktopExpanded ? 'py-2' : 'flex flex-col items-center gap-3 py-4'}>
            {filteredMenuItems.map((item, index) => {
              // Renderiza separador antes de certos itens
              const showSeparator = index > 0;
              
              return (
                <div key={item.id}>
                  {showSeparator && (
                    <div className={isDesktopExpanded ? 'mx-4 my-3' : 'my-1'}>
                      <div className={isDesktopExpanded ? 'h-px bg-gradient-to-r from-transparent via-gray-700 to-transparent' : 'h-px w-8 bg-gray-800'} />
                    </div>
                  )}
                  <ul className={isDesktopExpanded ? 'px-4 space-y-1' : 'flex flex-col items-center gap-2'}>
                    {renderMenuItem(item, 0, index === 0)}
                  </ul>
                </div>
              );
            })}
          </div>
        </nav>

        {/* Logout Button - Premium */}
        {onLogout && (
          <div 
            className={`${isDesktopExpanded ? 'p-4' : 'p-3'} border-t`}
            style={{
              background: 'linear-gradient(0deg, rgba(0, 0, 0, 1) 0%, rgba(26, 26, 26, 1) 100%)',
              boxShadow: '0 -4px 12px rgba(0, 0, 0, 0.3), 0 -1px 3px rgba(0, 0, 0, 0.2)',
              borderColor: 'rgba(255, 255, 255, 0.1)',
            }}
          >
            <button
              onClick={onLogout}
              className={`${isDesktopExpanded ? 'w-full gap-3 px-6 py-3' : 'h-12 w-12'} flex items-center justify-center rounded-xl border transition-all duration-200`}
              aria-label="Sair do sistema"
              title="Sair do sistema"
              style={{
                color: '#DC2626',
                background: 'rgba(220, 38, 38, 0.08)',
                borderColor: 'rgba(220, 38, 38, 0.2)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(220, 38, 38, 0.12)';
                e.currentTarget.style.borderColor = 'rgba(220, 38, 38, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(220, 38, 38, 0.08)';
                e.currentTarget.style.borderColor = 'rgba(220, 38, 38, 0.2)';
              }}
            >
              <LogOut size={20} strokeWidth={2} />
              {isDesktopExpanded ? <span className="font-semibold">Sair do Sistema</span> : null}
            </button>
          </div>
        )}

        {/* Footer */}
        {isDesktopExpanded ? (
          <div className="p-4 border-t bg-black" style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}>
            <p className="text-gray-400 text-xs text-center font-medium mb-1">
              Usuário: {currentUserName}
            </p>
            <p className="text-gray-500 text-xs text-center font-medium">
              © 2025 Porsche Cup Brasil
            </p>
          </div>
        ) : null}
      </aside>
    </>
  );
}
