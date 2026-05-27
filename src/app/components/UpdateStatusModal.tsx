import { X, Upload, FileSpreadsheet, Loader2 } from 'lucide-react';

interface UpdateStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (file: File) => void;
  isProcessing: boolean;
  updateFile: File | null;
  setUpdateFile: (file: File | null) => void;
}

export function UpdateStatusModal({
  isOpen,
  onClose,
  onUpdate,
  isProcessing,
  updateFile,
  setUpdateFile
}: UpdateStatusModalProps) {
  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Limite de 10MB para evitar problemas de memória
      const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
      if (file.size > MAX_FILE_SIZE) {
        alert('⚠️ Arquivo muito grande!\n\nTamanho máximo: 10MB\nTamanho do arquivo: ' + (file.size / 1024 / 1024).toFixed(2) + 'MB\n\nPor favor, reduza o tamanho da planilha.');
        e.target.value = '';
        return;
      }
      setUpdateFile(file);
    }
  };

  const handleUpdate = () => {
    if (updateFile) {
      onUpdate(updateFile);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[35] flex items-center justify-center p-4"
      style={{ background: 'rgba(0, 0, 0, 0.5)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        style={{ background: '#FFFFFF' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="px-8 py-6 border-b flex items-center justify-between"
          style={{ borderColor: '#E5E7EB' }}
        >
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Atualizar Planilha
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Faça upload de uma nova planilha para atualizar status e pilotos
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors"
            disabled={isProcessing}
          >
            <X size={24} className="text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="px-8 py-6">
          <div
            className="rounded-xl border-2 border-dashed p-12 text-center mb-6"
            style={{ background: '#F9FAFB', borderColor: '#E5E7EB' }}
          >
            {!updateFile ? (
              <div className="flex flex-col items-center gap-4">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center"
                  style={{ background: '#DBEAFE' }}
                >
                  <FileSpreadsheet size={32} strokeWidth={1.5} className="text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Selecione a Planilha Atualizada
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    As conferências de pneus já realizadas serão preservadas.
                  </p>
                </div>

                <label
                  className="flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all cursor-pointer"
                  style={{
                    background: 'linear-gradient(135deg, #2563EB 0%, #1E40AF 100%)',
                    color: '#FFFFFF',
                    boxShadow: '0 2px 8px rgba(37, 99, 235, 0.25)'
                  }}
                >
                  <Upload size={20} strokeWidth={2} />
                  <span>Escolher arquivo Excel</span>
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileChange}
                    className="hidden"
                    disabled={isProcessing}
                  />
                </label>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileSpreadsheet size={40} className="text-blue-600" />
                  <div className="text-left">
                    <p className="font-semibold text-gray-900">{updateFile.name}</p>
                    <p className="text-sm text-gray-500">
                      {(updateFile.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setUpdateFile(null)}
                  className="text-red-600 hover:text-red-700 font-semibold text-sm flex items-center gap-1"
                  disabled={isProcessing}
                >
                  <X size={16} />
                  Remover
                </button>
              </div>
            )}
          </div>

          {/* Informações */}
          <div
            className="rounded-lg p-4 mb-6"
            style={{ background: '#EFF6FF', border: '1px solid #DBEAFE' }}
          >
            <h4 className="font-semibold text-blue-900 mb-2 text-sm">
              ℹ️ O que será atualizado:
            </h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• <strong>Status da Corrida:</strong> SIM, NÃO ou INDEF.</li>
              <li>• <strong>Nome do Piloto:</strong> Atualizado conforme planilha</li>
            </ul>
            <div className="mt-3 p-2 rounded" style={{ background: '#DBEAFE' }}>
              <p className="text-xs text-blue-900 font-semibold">
                ✅ Pneus já conferidos: Preservados
              </p>
              <p className="text-xs text-blue-800 mt-1">
                ⚠️ Se o piloto mudar, os pneus serão marcados com divergência
              </p>
            </div>
          </div>

          {/* Botões */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={isProcessing}
              className="flex-1 px-6 py-3 rounded-lg font-semibold transition-all border disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: '#FFFFFF',
                borderColor: '#E5E7EB',
                color: '#6B7280'
              }}
            >
              Cancelar
            </button>
            <button
              onClick={handleUpdate}
              disabled={!updateFile || isProcessing}
              className="flex-1 px-6 py-3 rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              style={{
                background: 'linear-gradient(135deg, #2563EB 0%, #1E40AF 100%)',
                color: '#FFFFFF'
              }}
            >
              {isProcessing ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Atualizando...
                </>
              ) : (
                'Atualizar Planilha'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
