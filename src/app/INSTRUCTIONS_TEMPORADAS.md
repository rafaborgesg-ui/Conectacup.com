# Instruções para Adicionar "Ver Detalhes" nos Cards de Temporada

## Local: `/pages/SeasonConfiguration.tsx`

### Substituir a seção "Card Body" e "Card Footer" das temporadas por:

```tsx
                    {/* Card Body - Minimizado */}
                    <div className="p-5">
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-gray-600">
                          {seasonDetails[season.id] ? 
                            `${seasonDetails[season.id].stagesCount} etapa(s) cadastrada(s)` : 
                            'Temporada configurada'
                          }
                        </p>
                        <button
                          onClick={() => loadSeasonDetails(season.id)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all"
                          style={{
                            background: isExpanded ? '#D50000' : '#F3F4F6',
                            color: isExpanded ? '#FFFFFF' : '#374151'
                          }}
                          onMouseEnter={(e) => {
                            if (!isExpanded) {
                              e.currentTarget.style.background = '#E5E7EB';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!isExpanded) {
                              e.currentTarget.style.background = '#F3F4F6';
                            }
                          }}
                        >
                          {isExpanded ? 'Ocultar' : 'Ver detalhes'}
                          <ChevronDown 
                            size={16} 
                            className="transition-transform duration-200"
                            style={{
                              transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)'
                            }}
                          />
                        </button>
                      </div>

                      {/* Detalhes Expandidos */}
                      {isExpanded && seasonDetails[season.id] && (
                        <div className="mt-4 pt-4 border-t space-y-4" style={{ borderColor: '#E5E7EB' }}>
                          {/* Campeonatos Ativos */}
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-2 h-2 rounded-full" style={{ background: '#D50000' }} />
                              <span className="text-xs font-bold text-gray-700 uppercase">
                                Campeonatos Ativos
                              </span>
                            </div>
                            <div className="space-y-2">
                              {seasonDetails[season.id].championships.preseason.active && (
                                <div className="px-3 py-2 rounded-lg text-sm" style={{ background: '#F9FAFB', borderLeft: '3px solid #10B981' }}>
                                  <div className="font-semibold text-gray-900">Pré-Temporada</div>
                                  <div className="text-xs text-gray-500">
                                    {seasonDetails[season.id].championships.preseason.wildcards} wildcard(s) por piloto
                                  </div>
                                </div>
                              )}
                              {seasonDetails[season.id].championships.sprint.active && (
                                <div className="px-3 py-2 rounded-lg text-sm" style={{ background: '#F9FAFB', borderLeft: '3px solid #3B82F6' }}>
                                  <div className="font-semibold text-gray-900">Sprint</div>
                                  <div className="text-xs text-gray-500">
                                    {seasonDetails[season.id].championships.sprint.wildcards} wildcard(s) por piloto
                                  </div>
                                </div>
                              )}
                              {seasonDetails[season.id].championships.endurance.active && (
                                <div className="px-3 py-2 rounded-lg text-sm" style={{ background: '#FFF7ED', borderLeft: '3px solid #FB923C' }}>
                                  <div className="font-semibold text-gray-900">Endurance</div>
                                  <div className="text-xs text-gray-500">
                                    {seasonDetails[season.id].championships.endurance.wildcards} wildcard(s) por piloto
                                  </div>
                                </div>
                              )}
                              {seasonDetails[season.id].championships.trophy.active && (
                                <div className="px-3 py-2 rounded-lg text-sm" style={{ background: '#FEF3C7', borderLeft: '3px solid #F59E0B' }}>
                                  <div className="font-semibold text-gray-900">Trophy</div>
                                  <div className="text-xs text-gray-500">
                                    {seasonDetails[season.id].championships.trophy.wildcards} wildcard(s) por piloto
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Etapas */}
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-2 h-2 rounded-full" style={{ background: '#6B7280' }} />
                              <span className="text-xs font-bold text-gray-700 uppercase">
                                Etapas ({seasonDetails[season.id].stagesCount})
                              </span>
                            </div>
                            <div className="space-y-1 max-h-48 overflow-y-auto">
                              {seasonDetails[season.id].stages?.map((stage: any) => (
                                <div key={stage.id} className="px-3 py-2 rounded-lg text-xs" style={{ background: '#F9FAFB' }}>
                                  <div className="font-semibold text-gray-900">{stage.name}</div>
                                  <div className="text-gray-500">{stage.track}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Card Footer */}
                    <div 
                      className="px-5 py-3 border-t flex items-center justify-end gap-2"
                      style={{ borderColor: '#E5E7EB', background: '#F9FAFB' }}
                    >
                      <button
                        className="p-2 rounded-lg transition-colors hover:bg-gray-200"
                        title="Editar"
                        onClick={() => handleEditSeason(season.id)}
                      >
                        <Edit2 size={16} className="text-gray-600" />
                      </button>
                      <button
                        className="p-2 rounded-lg transition-colors hover:bg-red-100"
                        title="Excluir"
                        onClick={() => handleDeleteSeason(season.id)}
                      >
                        <Trash2 size={16} className="text-red-600" />
                      </button>
                    </div>
```

## Resumo das Mudanças:

1. ✅ Adicionado botão "Ver detalhes" / "Ocultar" com ícone ChevronDown
2. ✅ Exibe quantidade de etapas cadastradas
3. ✅ Seção expandível que mostra:
   - Campeonatos ativos com wildcards
   - Lista de etapas com nome e pista
4. ✅ Carregamento sob demanda via função `loadSeasonDetails()`
5. ✅ Mesmo estilo visual das categorias (minimalista e expansível)
