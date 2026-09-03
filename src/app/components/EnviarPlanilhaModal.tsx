import React, { useState } from 'react';
import { X, Mail, Plus, Trash2 } from 'lucide-react';

interface SeasonStage {
  id: string;
  name: string;
}

interface EnviarPlanilhaModalProps {
  isOpen: boolean;
  onClose: () => void;
  stages: SeasonStage[];
  onSend: (stageId: string, emails: string[]) => void;
  isSending: boolean;
}

export function EnviarPlanilhaModal({
  isOpen,
  onClose,
  stages,
  onSend,
  isSending
}: EnviarPlanilhaModalProps) {
  const [selectedStageId, setSelectedStageId] = useState('');
  const [emails, setEmails] = useState<string[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [emailError, setEmailError] = useState('');

  if (!isOpen) return null;

  function handleAddEmail() {
    const trimmedEmail = newEmail.trim().toLowerCase();
    
    if (!trimmedEmail) {
      setEmailError('Digite um e-mail');
      return;
    }

    // Validação simples de e-mail
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setEmailError('E-mail inválido');
      return;
    }

    if (emails.includes(trimmedEmail)) {
      setEmailError('E-mail já adicionado');
      return;
    }

    setEmails([...emails, trimmedEmail]);
    setNewEmail('');
    setEmailError('');
  }

  function handleRemoveEmail(email: string) {
    setEmails(emails.filter(e => e !== email));
  }

  function handleSend() {
    if (!selectedStageId) {
      alert('Selecione uma etapa');
      return;
    }

    onSend(selectedStageId, emails);
  }

  function handleClose() {
    if (!isSending) {
      setSelectedStageId('');
      setEmails([]);
      setNewEmail('');
      setEmailError('');
      onClose();
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-600 to-red-700 text-white p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Mail className="w-6 h-6" />
            <div>
              <h2 className="text-xl font-bold">ENVIAR PLANILHA POR E-MAIL</h2>
              <p className="text-red-100 text-sm">
                Planilha de avarias da etapa selecionada
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={isSending}
            className="hover:bg-red-800 p-2 rounded-lg transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {/* Seleção de Etapa */}
          <div className="mb-6">
            <label className="block text-gray-900 font-semibold mb-2">
              ETAPA: <span className="text-red-600">*</span>
            </label>
            <select
              value={selectedStageId}
              onChange={(e) => setSelectedStageId(e.target.value)}
              disabled={isSending}
              className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:outline-none focus:border-red-600 focus:ring-2 focus:ring-red-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">Selecione uma etapa</option>
              {stages.map(stage => (
                <option key={stage.id} value={stage.id}>
                  {stage.name}
                </option>
              ))}
            </select>
          </div>

          {/* Destinatários Extras */}
          <div className="mb-6">
            <label className="block text-gray-900 font-semibold mb-2">
              DESTINATÁRIOS EXTRAS (OPCIONAL):
            </label>
            <p className="text-gray-600 text-sm mb-3">
              O gestor de avarias receberá automaticamente. Adicione outros destinatários abaixo:
            </p>

            {/* Lista de emails adicionados */}
            {emails.length > 0 && (
              <div className="mb-3 space-y-2">
                {emails.map(email => (
                  <div
                    key={email}
                    className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-4 py-2"
                  >
                    <span className="text-gray-900">{email}</span>
                    <button
                      onClick={() => handleRemoveEmail(email)}
                      disabled={isSending}
                      className="text-red-600 hover:text-red-700 disabled:opacity-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Input para adicionar email */}
            <div className="flex gap-2">
              <div className="flex-1">
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => {
                    setNewEmail(e.target.value);
                    setEmailError('');
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddEmail();
                    }
                  }}
                  disabled={isSending}
                  placeholder="exemplo@email.com"
                  className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:outline-none focus:border-red-600 focus:ring-2 focus:ring-red-600/20 disabled:opacity-50"
                />
                {emailError && (
                  <p className="text-red-600 text-sm mt-1">{emailError}</p>
                )}
              </div>
              <button
                onClick={handleAddEmail}
                disabled={isSending}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-3 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="w-5 h-5" />
                Adicionar
              </button>
            </div>
          </div>

          {/* Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-blue-900 text-sm">
              <strong>ℹ️ Informações:</strong>
            </p>
            <ul className="text-blue-800 text-sm mt-2 space-y-1 list-disc list-inside">
              <li>A planilha será gerada no formato Excel (.xlsx)</li>
              <li>Apenas avarias aprovadas serão incluídas</li>
              <li>O gestor de avarias receberá automaticamente</li>
              <li>Destinatários extras são opcionais</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-6 flex gap-3 justify-end bg-gray-50">
          <button
            onClick={handleClose}
            disabled={isSending}
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancelar
          </button>
          <button
            onClick={handleSend}
            disabled={isSending || !selectedStageId}
            className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSending ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                Enviando...
              </>
            ) : (
              <>
                <Mail className="w-5 h-5" />
                Enviar E-mail
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
