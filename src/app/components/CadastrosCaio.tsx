export function CadastrosCaio() {
  return (
    <div className="p-4 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-gray-900 mb-2">Cadastros</h1>
          <p className="text-gray-600">Página em desenvolvimento</p>
        </div>

        {/* Conteúdo - Página em branco */}
        <div className="bg-white rounded-lg border border-gray-200 p-12">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
              <svg 
                className="w-8 h-8 text-gray-400" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" 
                />
              </svg>
            </div>
            <h2 className="text-gray-900 mb-2">Página em Construção</h2>
            <p className="text-gray-600">
              Esta página está sendo desenvolvida e em breve terá funcionalidades disponíveis.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
