import { FileText, Search, Calendar, User, Package, Clock, Filter } from 'lucide-react';
import { useState } from 'react';

export function HistoricoConferencia() {
  const [searchTerm, setSearchTerm] = useState('');

  const historico = [
    {
      id: 1,
      baia: '#001',
      piloto: 'João Silva',
      pista: 'Interlagos',
      data: '20/01/2026',
      hora: '14:30',
      pneus: '12 Slick / 4 Wet',
      responsavel: 'Rafael Costa',
      status: 'Aprovado'
    },
    {
      id: 2,
      baia: '#003',
      piloto: 'Pedro Oliveira',
      pista: 'Curitiba',
      data: '19/01/2026',
      hora: '10:15',
      pneus: '14 Slick / 6 Wet',
      responsavel: 'Jamyli Santos',
      status: 'Aprovado'
    },
    {
      id: 3,
      baia: '#005',
      piloto: 'Ana Paula',
      pista: 'Goiânia',
      data: '18/01/2026',
      hora: '16:45',
      pneus: '10 Slick / 4 Wet',
      responsavel: 'Rafael Costa',
      status: 'Aprovado'
    },
  ];

  return (
    <div style={{ background: '#F9FAFB', minHeight: '100vh' }}>
      {/* Header */}
      <div 
        className="border-b"
        style={{
          background: 'linear-gradient(180deg, #FFFFFF 0%, #F9FAFB 100%)',
          borderColor: '#E5E7EB'
        }}
      >
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div 
                className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{
                  background: 'linear-gradient(135deg, #1F2937 0%, #111827 100%)',
                  boxShadow: '0 4px 12px rgba(31, 41, 55, 0.25)'
                }}
              >
                <FileText size={24} strokeWidth={2} className="text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Histórico de Conferências
                </h1>
                <p className="text-gray-500 mt-1">
                  Visualize todas as conferências realizadas
                </p>
              </div>
            </div>

            <button
              className="px-4 py-2 rounded-lg font-semibold text-sm flex items-center gap-2"
              style={{
                background: '#F3F4F6',
                color: '#374151'
              }}
            >
              <Filter size={18} />
              Filtros
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Barra de Busca */}
        <div className="mb-6">
          <div className="relative">
            <Search 
              size={20} 
              className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" 
            />
            <input
              type="text"
              placeholder="Buscar por baia, piloto, pista ou responsável..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-lg border transition-all outline-none"
              style={{
                borderColor: '#E5E7EB',
                background: '#FFFFFF'
              }}
            />
          </div>
        </div>

        {/* Tabela de Histórico */}
        <div 
          className="rounded-xl border overflow-hidden"
          style={{
            background: '#FFFFFF',
            borderColor: '#E5E7EB'
          }}
        >
          <table className="w-full">
            <thead>
              <tr 
                className="border-b"
                style={{
                  background: '#F9FAFB',
                  borderColor: '#E5E7EB'
                }}
              >
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">
                  Baia
                </th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">
                  Piloto
                </th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">
                  Pista
                </th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">
                  Pneus
                </th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">
                  Data/Hora
                </th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">
                  Responsável
                </th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {historico.map((item) => (
                <tr 
                  key={item.id}
                  className="border-b hover:bg-gray-50 transition-colors cursor-pointer"
                  style={{ borderColor: '#E5E7EB' }}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Package size={16} className="text-gray-400" />
                      <span className="font-semibold text-gray-900">{item.baia}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <User size={16} className="text-gray-400" />
                      <span className="text-gray-900">{item.piloto}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-gray-900">{item.pista}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-600">{item.pneus}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1 text-sm text-gray-900">
                        <Calendar size={14} className="text-gray-400" />
                        {item.data}
                      </div>
                      <div className="flex items-center gap-1 text-sm text-gray-500">
                        <Clock size={14} className="text-gray-400" />
                        {item.hora}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-gray-900">{item.responsavel}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span 
                      className="px-3 py-1 rounded-full text-xs font-semibold"
                      style={{
                        background: '#D1FAE5',
                        color: '#065F46'
                      }}
                    >
                      {item.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Paginação */}
        <div className="mt-6 flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Mostrando <span className="font-semibold">1-3</span> de <span className="font-semibold">3</span> registros
          </p>
          <div className="flex gap-2">
            <button
              className="px-4 py-2 rounded-lg font-semibold text-sm"
              style={{
                background: '#F3F4F6',
                color: '#9CA3AF'
              }}
              disabled
            >
              Anterior
            </button>
            <button
              className="px-4 py-2 rounded-lg font-semibold text-sm"
              style={{
                background: '#F3F4F6',
                color: '#9CA3AF'
              }}
              disabled
            >
              Próximo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
