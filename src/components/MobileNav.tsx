import { useState, useEffect } from 'react';
import { LogOut, ChevronDown } from 'lucide-react';
import { Separator } from './ui/separator';
import porscheCarreraCupLogo from 'figma:asset/714dd59c6efd84795d4e42fadd6c600fd2c510ee.png';
import { usePermissions } from '../utils/usePermissions';
import { PAGES } from '../utils/permissions';
import { MENU_STRUCTURE, MENU_TO_PAGE_MAP, MenuItem } from '../utils/menuStructure';

interface MobileNavProps {
  currentModule: string;
  onModuleChange: (module: string) => void;
  onLogout: () => void;
  userRole: string;
}

export function MobileNav({ currentModule, onModuleChange, onLogout, userRole }: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<string[]>([]);
  const { hasPageAccess } = usePermissions();

  // Expande automaticamente o menu que contém o módulo atual
  useEffect(() => {
    // Lista de módulos por categoria
    const checkAndExpand = (item: MenuItem, parentIds: string[] = []): boolean => {
      if (item.id === currentModule) {
        // Expande todos os pais
        setExpandedMenus(prev => {
          const newExpanded = [...prev];
          parentIds.forEach(id => {
            if (!newExpanded.includes(id)) {
              newExpanded.push(id);
            }
          });
          return newExpanded;
        });
        return true;
      }
      
      if (item.subItems) {
        const newParentIds = [...parentIds, item.id];
        for (const subItem of item.subItems) {
          if (checkAndExpand(subItem, newParentIds)) {
            return true;
          }
        }
      }
      
      return false;
    };
    
    for (const item of MENU_STRUCTURE) {
      checkAndExpand(item);
    }
  }, [currentModule]);

  // Filtra itens baseado em permissões (recursivo)
  const filterMenuItems = (items: MenuItem[]): MenuItem[] => {
    return items.filter(item => {
      // Links externos sempre visíveis
      if (item.externalUrl) return true;
      
      // Se tem subItems, filtra recursivamente
      if (item.subItems) {
        const filteredSubItems = filterMenuItems(item.subItems);
        // Se não sobrou nenhum subitem, oculta o item pai
        if (filteredSubItems.length === 0) return false;
        item.subItems = filteredSubItems;
        return true;
      }
      
      // Verifica permissão
      const pageKey = MENU_TO_PAGE_MAP[item.id];
      if (pageKey) {
        return hasPageAccess(PAGES[pageKey]);
      }
      
      // Se não tem mapeamento, verifica adminOnly
      if (item.adminOnly && userRole !== 'admin') {
        return false;
      }
      
      return true;
    });
  };

  const toggleSubmenu = (itemId: string) => {
    setExpandedMenus(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const handleItemClick = (moduleId: string, externalUrl?: string) => {
    if (externalUrl) {
      window.open(externalUrl, '_blank', 'noopener,noreferrer');
      setOpen(false);
    } else {
      onModuleChange(moduleId);
      setOpen(false);
    }
  };

  // Função recursiva para verificar se um item está ativo
  const isItemActive = (item: MenuItem): boolean => {
    if (currentModule === item.id) return true;
    if (item.subItems) {
      return item.subItems.some((sub: MenuItem) => isItemActive(sub));
    }
    return false;
  };

  // Função recursiva para renderizar itens de menu
  const renderMenuItem = (item: MenuItem, level: number = 0): JSX.Element | null => {
    const Icon = item.icon;
    const hasSubItems = item.subItems && item.subItems.length > 0;
    const isExpanded = expandedMenus.includes(item.id);
    const isActive = isItemActive(item);
    const isDirectlyActive = currentModule === item.id;
    const isExternalLink = item.externalUrl;
    
    return (
      <div key={item.id}>
        <button
          onClick={() => {
            if (isExternalLink) {
              handleItemClick(item.id, item.externalUrl);
            } else if (hasSubItems) {
              toggleSubmenu(item.id);
            } else {
              handleItemClick(item.id);
            }
          }}
          className={`
            mobile-nav-item
            ${isDirectlyActive && !hasSubItems ? 'active' : ''}
            ${level > 0 ? 'pl-8' : ''}
          `}
          style={{
            paddingLeft: level > 0 ? `${(level * 16) + 16}px` : undefined,
          }}
        >
          {Icon && <Icon className="w-5 h-5 flex-shrink-0" />}
          <span className="flex-1 text-left">{item.label}</span>
          
          {isDirectlyActive && !hasSubItems && (
            <div className="mobile-nav-active-indicator" />
          )}
          
          {hasSubItems && (
            <ChevronDown 
              className={`w-5 h-5 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
            />
          )}
        </button>
        
        {/* Submenu com animação */}
        {hasSubItems && (
          <div 
            className={`mobile-nav-submenu ${isExpanded ? 'open' : ''}`}
          >
            {item.subItems!.map((subItem) => renderMenuItem(subItem, level + 1))}
          </div>
        )}
      </div>
    );
  };

  // Aplica filtro de permissões
  const filteredMenuItems = filterMenuItems(MENU_STRUCTURE);

  return (
    <>
      {/* Animated Hamburger Button - Premium Design */}
      <button
        onClick={() => setOpen(!open)}
        className={`fixed top-4 left-4 z-[60] mobile-nav-hamburger ${open ? 'open' : ''}`}
        aria-label={open ? 'Fechar menu de navegação' : 'Abrir menu de navegação'}
        aria-expanded={open}
      >
        <div className="mobile-nav-hamburger-lines">
          <span className="mobile-nav-hamburger-line"></span>
          <span className="mobile-nav-hamburger-line"></span>
          <span className="mobile-nav-hamburger-line"></span>
        </div>
      </button>

      {/* Backdrop Overlay */}
      {open && (
        <div 
          className="lg:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-sm animate-fade-in"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Menu Fullscreen Mobile - Premium Slide Animation */}
      <div 
        className={`lg:hidden fixed inset-y-0 left-0 z-50 w-[85%] max-w-sm bg-white shadow-2xl transform transition-transform duration-300 ease-out ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header com Glassmorphism Premium */}
          <div className="mobile-nav-header">
            <img 
              src={porscheCarreraCupLogo} 
              alt="Conecta Cup" 
              className="h-14 w-auto object-contain"
            />
          </div>

          {/* Conteúdo Scrollável com Scroll Indicators */}
          <div className="flex-1 overflow-y-auto mobile-nav-scroll">
            <nav className="px-4 py-4 space-y-1">
              {filteredMenuItems.map((item, index) => (
                <div key={item.id}>
                  {/* Separador entre seções principais */}
                  {index > 0 && (
                    <Separator className="my-4 bg-gray-200" />
                  )}
                  
                  {/* Renderiza item do menu */}
                  {renderMenuItem(item, 0)}
                </div>
              ))}
            </nav>
          </div>

          {/* Footer - Logout com Shadow Premium */}
          <div className="mobile-nav-footer">
            <button
              onClick={() => {
                setOpen(false);
                onLogout();
              }}
              className="mobile-nav-logout"
            >
              <LogOut className="w-5 h-5" />
              <span>Sair</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
