/**
 * Estilos responsivos para Coletor de Dados
 * Resolução: 800x480 pixels (4.0 polegadas)
 * 
 * Adapta a interface para dispositivos pequenos usados em campo
 */

export function CollectorStyles() {
  return (
    <style>{`
      /* ========================================
         ESTILOS PARA COLETOR DE DADOS 800x480
         ======================================== */
      
      @media (max-width: 900px) and (max-height: 600px), 
             (max-width: 600px) and (max-height: 900px) {
        
        /* 📱 LAYOUT GERAL */
        body {
          font-size: 14px !important;
          overflow-x: hidden;
        }
        
        /* ========================================
           🎨 MENU LATERAL (SIDEBAR) ADAPTADO
           ======================================== */
        
        /* Ocultar sidebar desktop e forçar mobile nav */
        aside.lg\\:flex {
          display: none !important;
        }
        
        /* Ajustar layout sem sidebar */
        main {
          margin-left: 0 !important;
          padding-left: 0 !important;
        }
        
        /* Header sem deslocamento da sidebar */
        .collector-adapt-header {
          left: 0 !important;
          width: 100vw !important;
        }
        
        /* ========================================
           📱 MENU MOBILE/COLETOR
           ======================================== */
        
        /* Botão de menu hamburger fixo no topo */
        .mobile-nav-hamburger,
        .collector-adapt-menu-button {
          position: fixed !important;
          top: 8px !important;
          left: 8px !important;
          min-width: 44px !important;
          min-height: 44px !important;
          padding: 10px !important;
          display: flex !important; /* Força exibição no coletor */
          z-index: 9999 !important; /* Acima de todos os elementos */
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2) !important;
        }
        
        /* 🔙 BOTÕES DE RETORNO - Evitar conflito com menu */
        .collector-adapt-icon-container {
          margin-top: 0 !important; /* Remove o margin-top para não desalinhar */
          margin-left: 52px !important; /* Empurra para direita do botão do menu */
        }
        
        /* Ajustar header quando tem botão de retorno */
        .collector-adapt-header {
          padding-top: 8px !important; /* Espaço mínimo no topo */
          padding-left: 60px !important; /* Espaço para o botão do menu fixo */
          padding-right: 12px !important;
        }
        
        .collector-adapt-header .flex.items-start {
          padding-top: 0 !important; /* Remove padding duplicado */
        }
        
        /* Menu mobile overlay */
        .collector-adapt-mobile-menu {
          width: 280px !important;
          max-width: 85vw !important;
          font-size: 14px !important;
        }
        
        /* SOLUÇÃO CRÍTICA: Forçar altura e scroll corretos */
        .collector-adapt-mobile-menu,
        .collector-adapt-mobile-menu > div {
          height: 100vh !important;
          max-height: 100vh !important;
          display: flex !important;
          flex-direction: column !important;
          overflow: hidden !important;
        }
        
        /* Header fixo */
        .collector-adapt-mobile-menu .mobile-nav-header {
          flex: 0 0 auto !important;
          padding: 12px 16px !important;
        }
        
        /* Área de scroll - a parte crítica */
        .collector-adapt-mobile-menu nav {
          flex: 1 1 0% !important;
          overflow-y: auto !important;
          overflow-x: hidden !important;
          -webkit-overflow-scrolling: touch !important;
        }
        
        /* Footer fixo */
        .collector-adapt-mobile-menu .mobile-nav-footer {
          flex: 0 0 auto !important;
          padding: 10px 16px !important;
        }
        
        /* Remover gradientes de fade */
        .collector-adapt-mobile-menu .mobile-nav-scroll::before,
        .collector-adapt-mobile-menu .mobile-nav-scroll::after {
          display: none !important;
        }
        
        /* Permitir submenus expandirem completamente */
        .collector-adapt-mobile-menu .mobile-nav-submenu.open {
          max-height: none !important;
        }
        
        /* Logo compacto */
        .collector-adapt-mobile-menu .mobile-nav-header img {
          max-height: 48px !important;
        }
        
        /* Itens do menu compactos */
        .collector-adapt-mobile-menu button {
          padding: 10px 12px !important;
          font-size: 13px !important;
          min-height: 42px !important;
        }
        
        /* Ícones do menu */
        .collector-adapt-mobile-menu svg {
          width: 18px !important;
          height: 18px !important;
        }
        
        /* Subitens do menu */
        .collector-adapt-mobile-menu ul ul button {
          padding-left: 28px !important;
          font-size: 12px !important;
          min-height: 38px !important;
        }
        
        /* Subitens de terceiro nível */
        .collector-adapt-mobile-menu ul ul ul button {
          padding-left: 40px !important;
          font-size: 11px !important;
          min-height: 36px !important;
        }
        
        /* Separadores do menu */
        .collector-adapt-mobile-menu .h-px {
          margin: 8px 12px !important;
        }
        
        /* Footer do menu */
        .collector-adapt-mobile-menu footer {
          padding: 8px 12px !important;
        }
        
        /* Botão de logout compacto */
        .collector-adapt-mobile-menu .logout-button {
          padding: 10px 12px !important;
          font-size: 13px !important;
          min-height: 42px !important;
        }
        
        /* ========================================
           📱 FIM DO MENU ADAPTADO
           ======================================== */
        
        /* Header compacto */
        .collector-adapt-header {
          padding: 8px 12px !important;
        }
        
        .collector-adapt-header h1 {
          font-size: 16px !important;
          line-height: 1.2 !important;
        }
        
        .collector-adapt-header p {
          display: none !important;
        }
        
        /* Content compacto */
        .collector-adapt-content {
          padding: 8px 12px !important;
          max-width: 100% !important;
        }
        
        /* 🔢 NÚMEROS DE ETAPAS */
        .collector-adapt-step-number {
          width: 28px !important;
          height: 28px !important;
          font-size: 12px !important;
        }
        
        .collector-adapt-step-title {
          font-size: 14px !important;
        }
        
        /* 🎯 ÍCONES */
        .collector-adapt-icon-large {
          width: 28px !important;
          height: 28px !important;
        }
        
        .collector-adapt-icon-medium {
          width: 20px !important;
          height: 20px !important;
        }
        
        .collector-adapt-icon-small {
          width: 16px !important;
          height: 16px !important;
        }
        
        /* 🔘 BOTÕES */
        .collector-adapt-button {
          padding: 10px 14px !important;
          font-size: 13px !important;
          min-height: 44px !important;
        }
        
        .collector-adapt-button-large {
          padding: 8px 10px !important;
          font-size: 13px !important;
          min-height: 40px !important;
          min-width: 80px !important;
          white-space: nowrap !important;
        }
        
        .collector-adapt-modal .collector-adapt-button-large {
          padding: 8px 10px !important;
          font-size: 12px !important;
          white-space: nowrap !important;
        }
        
        /* 📝 INPUTS */
        .collector-adapt-input {
          padding: 10px 12px !important;
          font-size: 15px !important;
          min-height: 44px !important;
        }
        
        .collector-adapt-input-large {
          padding: 14px 16px !important;
          font-size: 18px !important;
          min-height: 52px !important;
          font-weight: 600 !important;
        }
        
        /* 🃏 CARDS */
        .collector-adapt-card {
          padding: 8px !important;
          margin-bottom: 6px !important;
        }
        
        .collector-adapt-card h3 {
          font-size: 14px !important;
        }
        
        .collector-adapt-card label {
          font-size: 11px !important;
        }
        
        .collector-adapt-card-compact {
          padding: 6px !important;
          margin-bottom: 4px !important;
        }
        
        /* 📊 GRID DE CHASSIS */
        .collector-adapt-chassis-grid {
          grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)) !important;
          gap: 6px !important;
        }
        
        .collector-adapt-chassis-card {
          padding: 10px !important;
          min-height: 80px !important;
        }
        
        .collector-adapt-chassis-number {
          font-size: 15px !important;
          font-weight: 700 !important;
        }
        
        .collector-adapt-chassis-pilot {
          font-size: 11px !important;
          margin-top: 4px !important;
        }
        
        /* 🏁 GRID DE CATEGORIAS - SHAKEDOWN */
        .collector-adapt-category-grid {
          grid-template-columns: 1fr !important;
          gap: 8px !important;
          display: flex !important;
          flex-direction: column !important;
        }
        
        .collector-adapt-category-card {
          width: 100% !important;
          aspect-ratio: unset !important;
        }
        
        .collector-adapt-category-content {
          padding: 16px !important;
          min-height: 100px !important;
        }
        
        .collector-adapt-category-title {
          font-size: 20px !important;
          margin-bottom: 8px !important;
        }
        
        .collector-adapt-category-chassis {
          font-size: 16px !important;
        }
        
        .collector-adapt-category-tires {
          font-size: 13px !important;
        }
        
        /* 🎮 SCANNER DE PNEUS */
        .collector-adapt-scanner {
          padding: 8px 12px !important;
        }
        
        .collector-adapt-scanner-input {
          font-size: 15px !important;
          padding: 8px 10px !important;
          min-height: 40px !important;
          font-weight: 600 !important;
          letter-spacing: 0.5px !important;
          flex: 1 !important;
          max-width: calc(100% - 90px) !important; /* Deixa espaço para o botão */
        }
        
        /* Garantir que o botão OK nunca seja cortado */
        .collector-adapt-scanner .flex-row {
          flex-wrap: nowrap !important;
          align-items: center !important;
        }
        
        .collector-adapt-scanner button {
          flex-shrink: 0 !important;
          min-width: 60px !important;
        }
        
        /* 🏎️ POSIÇÕES DE PNEUS */
        .collector-adapt-tire-grid {
          grid-template-columns: repeat(2, 1fr) !important;
          gap: 8px !important;
        }
        
        .collector-adapt-tire-position {
          min-height: 70px !important;
          padding: 10px !important;
          font-size: 14px !important;
        }
        
        .collector-adapt-tire-position-label {
          font-size: 16px !important;
          font-weight: 700 !important;
        }
        
        .collector-adapt-tire-position-code {
          font-size: 12px !important;
          margin-top: 4px !important;
        }
        
        /* 🎯 NAVEGAÇÃO DE JOGOS */
        .collector-adapt-game-nav {
          padding: 8px !important;
          gap: 6px !important;
        }
        
        .collector-adapt-game-button {
          min-width: 60px !important;
          min-height: 44px !important;
          font-size: 14px !important;
          font-weight: 600 !important;
        }
        
        /* 📝 TEXTOS */
        .collector-adapt-text-title {
          font-size: 16px !important;
          line-height: 1.3 !important;
        }
        
        .collector-adapt-text-large {
          font-size: 15px !important;
        }
        
        .collector-adapt-text-medium {
          font-size: 13px !important;
        }
        
        .collector-adapt-text-small {
          font-size: 11px !important;
        }
        
        .collector-adapt-text-tiny {
          font-size: 10px !important;
        }
        
        /* 🚫 OCULTAR ELEMENTOS DESNECESSÁRIOS */
        .collector-adapt-hide {
          display: none !important;
        }
        
        .collector-adapt-desktop-only {
          display: none !important;
        }
        
        /* Ocultar TODOS os ícones absolutos dentro de inputs */
        .collector-adapt-content .relative svg.absolute,
        .collector-adapt-content svg.absolute,
        .collector-adapt-scanner .relative svg.absolute,
        .collector-adapt-search-container svg.absolute {
          display: none !important;
          visibility: hidden !important;
          opacity: 0 !important;
        }
        
        /* 📱 SIMPLIFICAR UPLOAD */
        .collector-adapt-upload-area {
          padding: 16px !important;
        }
        
        .collector-adapt-upload-icon {
          width: 40px !important;
          height: 40px !important;
        }
        
        /* ✅ STATUS BADGES */
        .collector-adapt-badge {
          padding: 3px 6px !important;
          font-size: 10px !important;
        }
        
        /* Ocultar badge de posição ativa no coletor (economizar espaço) */
        .collector-adapt-scanner .collector-adapt-badge {
          display: none !important;
        }
        
        /* 🔍 SEARCH */
        .collector-adapt-search {
          padding: 10px 12px !important;
          font-size: 14px !important;
        }
        
        /* Ícone de busca - ocultar em coletor para não atrapalhar */
        .collector-adapt-search + .absolute,
        .relative .absolute.left-4 {
          display: none !important;
        }
        
        /* Ajustar padding do input de busca sem ícone */
        .collector-adapt-search {
          padding-left: 12px !important;
        }
        
        /* 📋 LISTAS */
        .collector-adapt-list-item {
          padding: 10px !important;
          min-height: 48px !important;
        }
        
        /* 🎨 CORES E CONTRASTE AUMENTADO */
        .collector-adapt-high-contrast {
          font-weight: 600 !important;
        }
        
        /* 📏 MARGENS E ESPAÇAMENTOS REDUZIDOS */
        .collector-adapt-spacing-compact {
          margin: 4px !important;
          padding: 4px !important;
        }
        
        /* 🔄 LOADER */
        .collector-adapt-loader {
          width: 24px !important;
          height: 24px !important;
        }
        
        /* 📊 PROGRESS */
        .collector-adapt-progress {
          height: 6px !important;
        }
        
        /* 🎯 FOCUS VISÍVEL */
        .collector-adapt-input:focus,
        .collector-adapt-button:focus {
          outline: 3px solid #D50000 !important;
          outline-offset: 2px !important;
        }
        
        /* 🖼️ IMAGENS */
        .collector-adapt-image {
          max-width: 100% !important;
          height: auto !important;
        }
        
        /* 🗂️ TABS */
        .collector-adapt-tab {
          padding: 10px 14px !important;
          font-size: 13px !important;
          min-width: 80px !important;
        }
        
        /* 🎚️ CONTROLES */
        .collector-adapt-control {
          min-height: 44px !important;
          font-size: 14px !important;
        }
        
        /* 📦 CONTAINERS */
        .collector-adapt-container {
          padding: 12px !important;
        }
        
        /* 🎪 MODALS */
        .collector-adapt-modal {
          max-width: 100vw !important;
          max-height: 100vh !important;
          overflow-y: auto !important;
          border-radius: 0 !important;
          margin: 0 !important;
        }
        
        .collector-adapt-modal-header {
          padding: 8px 12px !important;
          font-size: 14px !important;
          min-height: 48px !important;
        }
        
        .collector-adapt-modal-header h2 {
          font-size: 13px !important;
          line-height: 1.2 !important;
        }
        
        /* Reduzir altura do header no coletor */
        @media (max-width: 900px) and (max-height: 600px) {
          .collector-adapt-modal-header {
            padding: 4px 8px !important;
            min-height: 36px !important;
          }
          
          .collector-adapt-modal-header h2 {
            font-size: 11px !important;
            font-weight: 600 !important;
          }
          
          .collector-adapt-modal-header button {
            padding: 4px !important;
          }
          
          .collector-adapt-modal-header svg {
            width: 16px !important;
            height: 16px !important;
          }
        }
        
        .collector-adapt-modal-content {
          padding: 8px !important;
        }
        
        /* ⚡ OTIMIZAÇÕES DE PERFORMANCE */
        * {
          -webkit-tap-highlight-color: transparent;
          touch-action: manipulation;
        }
        
        /* 📱 SCROLLBAR SIMPLIFICADO */
        ::-webkit-scrollbar {
          width: 6px !important;
          height: 6px !important;
        }
        
        ::-webkit-scrollbar-thumb {
          background: #9CA3AF !important;
          border-radius: 3px !important;
        }
        
        /* 📊 SIMPLIFICAR TABELAS - OCULTAR E MOSTRAR GRID */
        .collector-adapt-modal-content table {
          display: block !important;
          border: none !important;
          width: 100% !important;
          overflow: visible !important;
        }
        
        .collector-adapt-modal-content table thead {
          display: none !important; /* Ocultar cabeçalhos */
        }
        
        .collector-adapt-modal-content table tbody {
          display: grid !important;
          grid-template-columns: 1fr !important;
          gap: 6px !important;
          width: 100% !important;
        }
        
        .collector-adapt-modal-content table tr {
          display: grid !important;
          grid-template-columns: 1fr 1fr 1fr !important; /* 3 colunas para caber mais */
          grid-template-rows: auto auto auto !important; /* 3 linhas (9 campos / 3 = 3) */
          gap: 1px 6px !important;
          padding: 5px !important;
          border-radius: 6px !important;
          border: 2px solid #E5E7EB !important;
          margin-bottom: 0 !important;
          width: 100% !important;
          overflow: visible !important;
        }
        
        .collector-adapt-modal-content table td {
          display: block !important;
          padding: 1px 0 !important;
          border: none !important;
          font-size: 8px !important;
          line-height: 1.2 !important;
          word-break: break-word !important;
          overflow: visible !important;
        }
        
        /* Ocultar avisos extras no coletor (economizar espaço) */
        .collector-adapt-modal-content table td .text-xs {
          display: none !important;
        }
        
        .collector-adapt-modal-content table td .ml-1 {
          display: none !important;
        }
        
        /* Badges de situação e inversão - manter visíveis mas compactos */
        .collector-adapt-modal-content table td span.px-2 {
          display: inline-block !important;
          font-size: 8px !important;
          padding: 1px 3px !important;
          border-radius: 3px !important;
        }
        
        /* Adicionar labels antes de cada célula - ABREVIADOS */
        .collector-adapt-modal-content table td:nth-child(1)::before { content: "Pos: "; font-weight: 700; font-size: 8px; }
        .collector-adapt-modal-content table td:nth-child(2)::before { content: "Cód: "; font-weight: 700; font-size: 8px; }
        .collector-adapt-modal-content table td:nth-child(3)::before { content: "Pil: "; font-weight: 700; font-size: 8px; }
        .collector-adapt-modal-content table td:nth-child(4)::before { content: "Ano: "; font-weight: 700; font-size: 8px; }
        .collector-adapt-modal-content table td:nth-child(5)::before { content: "Set: "; font-weight: 700; font-size: 8px; }
        .collector-adapt-modal-content table td:nth-child(6)::before { content: "Tipo: "; font-weight: 700; font-size: 8px; }
        .collector-adapt-modal-content table td:nth-child(7)::before { content: "Volt: "; font-weight: 700; font-size: 8px; }
        .collector-adapt-modal-content table td:nth-child(8)::before { content: "Sit: "; font-weight: 700; font-size: 8px; }
        .collector-adapt-modal-content table td:nth-child(9)::before { content: "Inv: "; font-weight: 700; font-size: 8px; }
        
        /* 🎯 OTIMIZAÇÃO ESPECÍFICA PARA MODAL DE CONFERÊNCIA */
        .collector-adapt-modal .space-y-6 {
          gap: 8px !important;
        }
        
        .collector-adapt-modal table {
          font-size: 11px !important;
        }
        
        .collector-adapt-modal table th,
        .collector-adapt-modal table td {
          padding: 6px 8px !important;
          font-size: 11px !important;
        }
        
        .collector-adapt-modal table th {
          font-size: 10px !important;
        }
        
        /* Reduzir espaçamento vertical no modal */
        .collector-adapt-modal .mb-3 {
          margin-bottom: 6px !important;
        }
        
        .collector-adapt-modal .mb-2 {
          margin-bottom: 4px !important;
        }
        
        .collector-adapt-modal .mt-2 {
          margin-top: 4px !important;
        }
        
        .collector-adapt-modal .gap-3 {
          gap: 8px !important;
        }
        
        .collector-adapt-modal .gap-2 {
          gap: 4px !important;
        }
        
        /* Footer do modal */
        .collector-adapt-modal .border-t {
          padding: 4px 8px !important;
        }
        
        .collector-adapt-modal .border-t button {
          font-size: 10px !important;
          padding: 4px 8px !important;
          min-height: 28px !important;
        }
        
        /* Simplificar texto do botão em telas pequenas */
        @media (max-width: 900px) and (max-height: 600px) {
          .collector-adapt-button-large::before {
            content: "Salvar" !important;
          }
          
          .collector-adapt-button-large {
            font-size: 0 !important;
          }
        }
        
        /* 🎨 CORES DOS CARDS DE PNEUS */
        .collector-adapt-tire-card.valid {
          background: #D1FAE5 !important;
          border-color: #10B981 !important;
        }
        
        .collector-adapt-tire-card.warning {
          background: #FED7AA !important;
          border-color: #F59E0B !important;
        }
        
        .collector-adapt-tire-card.error {
          background: #FEE2E2 !important;
          border-color: #EF4444 !important;
        }
        
        .collector-adapt-tire-card.active {
          background: #DBEAFE !important;
          border-color: #3B82F6 !important;
          border-width: 3px !important;
        }
        
        .collector-adapt-tire-card.empty {
          background: #F9FAFB !important;
          border-style: dashed !important;
        }
        
        /* 🎯 NAVEGAÇÃO DE JOGOS - SIMPLIFICADA */
        .collector-adapt-game-tabs {
          display: flex !important;
          gap: 6px !important;
          overflow-x: auto !important;
          padding: 8px 0 !important;
          -webkit-overflow-scrolling: touch !important;
        }
        
        /* 📱 OTIMIZAÇÕES ADICIONAIS */
        @media (max-width: 900px) and (max-height: 600px) {
          /* Modo landscape - otimizar uso de espaço horizontal */
          .collector-adapt-modal {
            max-width: 100vw !important;
            max-height: 100vh !important;
            border-radius: 0 !important;
          }
          
          .collector-adapt-tire-cards {
            grid-template-columns: repeat(4, 1fr) !important;
            gap: 4px !important;
          }
          
          /* Reduzir ainda mais padding em landscape */
          .collector-adapt-modal-header {
            padding: 6px 10px !important;
          }
          
          .collector-adapt-scanner {
            padding: 6px 10px !important;
          }
          
          /* Reduzir ainda mais espaço do scanner no coletor */
          .collector-adapt-scanner p {
            font-size: 10px !important;
            margin-bottom: 2px !important;
          }
          
          .collector-adapt-scanner-input {
            font-size: 13px !important;
            padding: 6px 8px !important;
            min-height: 36px !important;
            max-width: calc(100% - 70px) !important; /* Reduzir mais para garantir espaço pro botão */
            flex: 0 1 auto !important; /* Permitir que encolha */
          }
          
          .collector-adapt-scanner button {
            font-size: 11px !important;
            padding: 6px 8px !important;
            min-height: 36px !important;
            min-width: 50px !important;
          }
          
          /* Forçar layout compacto do scanner */
          .collector-adapt-scanner .flex-row {
            gap: 4px !important;
            width: 100% !important;
          }
          
          .collector-adapt-modal-content {
            padding: 6px 10px !important;
          }
          
          .collector-adapt-modal .border-t {
            padding: 6px 10px !important;
          }
          
          /* Tornar tabela mais compacta */
          .collector-adapt-modal table th,
          .collector-adapt-modal table td {
            padding: 4px 6px !important;
            font-size: 10px !important;
          }
        }
        
        @media (max-width: 600px) and (max-height: 900px) {
          /* Modo portrait - otimizar uso de espaço vertical */
          .collector-adapt-modal {
            max-width: 95vw !important;
            max-height: 98vh !important;
          }
          
          .collector-adapt-tire-cards {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
        
        /* 🔍 MELHORAR CONTRASTE PARA LEITURA EM CAMPO */
        @media (max-width: 900px) {
          .collector-adapt-high-contrast {
            text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1) !important;
          }
          
          /* Input com foco mais visível */
          input:focus,
          select:focus,
          button:focus {
            outline: 3px solid #D50000 !important;
            outline-offset: 2px !important;
          }
        }
        
        /* Ajustar padding dos inputs para compensar ausência de ícones */
        .collector-adapt-search {
          padding-left: 16px !important;
        }
        
        .collector-adapt-scanner-input {
          padding-right: 16px !important;
        }
      }
      
      /* ========================================
         FIM DOS ESTILOS DO COLETOR
         ======================================== */
    `}</style>
  );
}