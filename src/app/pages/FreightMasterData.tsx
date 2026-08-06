import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Database,
  EyeOff,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Search,
  X
} from 'lucide-react';
import {
  FREIGHT_MASTER_CATEGORIES,
  getFreightMasterOptions,
  saveFreightMasterOptionRecord,
  setFreightMasterOptionActive,
  type FreightMasterCategory,
  type FreightMasterOptionRecord
} from '../utils/freightStorage';

const emptyDraft: FreightMasterOptionRecord = {
  category: 'setor_frete',
  label: '',
  value: '',
  metadata: {},
  active: true,
  sortOrder: 0
};

function buttonClass(variant: 'primary' | 'secondary' | 'dark' | 'danger' = 'secondary') {
  const base = 'inline-flex h-10 items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50';
  const variants = {
    primary: 'bg-red-600 text-white hover:bg-red-700',
    secondary: 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
    dark: 'bg-slate-950 text-white hover:bg-slate-800',
    danger: 'bg-red-50 text-red-700 hover:bg-red-100'
  };
  return `${base} ${variants[variant]}`;
}

function fieldClass() {
  return 'h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100 disabled:bg-slate-50 disabled:text-slate-400';
}

function areaClass() {
  return 'min-h-24 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100';
}

function labelClass() {
  return 'mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500';
}

function categoryLabel(id: string) {
  return FREIGHT_MASTER_CATEGORIES.find(category => category.id === id)?.label || id;
}

function buildLabel(draft: FreightMasterOptionRecord) {
  const label = String(draft.label || '').trim();
  if (label) return label;

  const value = String(draft.value || '').trim();
  const description = String(draft.metadata?.descricao || '').trim();
  return description ? `${value} - ${description}` : value;
}

function visibleMetadata(record: FreightMasterOptionRecord, category?: FreightMasterCategory) {
  const metadata = record.metadata || {};
  const preferredKeys = category?.metadataFields.map(field => field.key) || [];
  const keys = [...preferredKeys, ...Object.keys(metadata).filter(key => !preferredKeys.includes(key))];
  return keys
    .map(key => [key, metadata[key]] as const)
    .filter(([, value]) => value != null && String(value).trim() !== '');
}

export function FreightMasterData() {
  const [records, setRecords] = useState<FreightMasterOptionRecord[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('setor_frete');
  const [draft, setDraft] = useState<FreightMasterOptionRecord>(emptyDraft);
  const [extraMetadata, setExtraMetadata] = useState('{}');
  const [search, setSearch] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const categories = useMemo(() => {
    const known = new Set(FREIGHT_MASTER_CATEGORIES.map(category => category.id));
    const unknownCategories = Array.from(new Set(records.map(record => record.category)))
      .filter(category => !known.has(category))
      .sort()
      .map((category): FreightMasterCategory => ({
        id: category,
        label: category,
        description: 'Categoria importada da MasterData original.',
        valueLabel: 'Valor',
        metadataFields: []
      }));

    return [...FREIGHT_MASTER_CATEGORIES, ...unknownCategories];
  }, [records]);

  const selectedConfig = categories.find(category => category.id === selectedCategory) || categories[0];

  const counts = useMemo(() => {
    return records.reduce<Record<string, { total: number; active: number }>>((acc, record) => {
      if (!acc[record.category]) acc[record.category] = { total: 0, active: 0 };
      acc[record.category].total += 1;
      if (record.active !== false) acc[record.category].active += 1;
      return acc;
    }, {});
  }, [records]);

  const filteredRecords = useMemo(() => {
    const term = search.trim().toLowerCase();
    return records
      .filter(record => record.category === selectedCategory)
      .filter(record => showInactive || record.active !== false)
      .filter(record => {
        if (!term) return true;
        return [
          record.label,
          record.value,
          JSON.stringify(record.metadata || {})
        ].some(value => String(value || '').toLowerCase().includes(term));
      });
  }, [records, search, selectedCategory, showInactive]);

  async function loadData() {
    setLoading(true);
    setMessage(null);
    try {
      const data = await getFreightMasterOptions(true);
      setRecords(data);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Erro ao carregar Masterdata Frete.' });
    } finally {
      setLoading(false);
    }
  }

  function startNew(category = selectedCategory) {
    setSelectedCategory(category);
    setDraft({ ...emptyDraft, category });
    setExtraMetadata('{}');
  }

  function startEdit(record: FreightMasterOptionRecord) {
    const config = categories.find(category => category.id === record.category);
    const knownKeys = new Set(config?.metadataFields.map(field => field.key) || []);
    const metadata = record.metadata || {};
    const remainingMetadata = Object.fromEntries(
      Object.entries(metadata).filter(([key]) => !knownKeys.has(key))
    );

    setSelectedCategory(record.category);
    setDraft({
      ...record,
      metadata: { ...metadata }
    });
    setExtraMetadata(JSON.stringify(remainingMetadata, null, 2));
  }

  function updateMetadata(key: string, value: string) {
    setDraft(current => ({
      ...current,
      metadata: {
        ...(current.metadata || {}),
        [key]: value
      }
    }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const parsedExtra = extraMetadata.trim() ? JSON.parse(extraMetadata) : {};
      if (!parsedExtra || typeof parsedExtra !== 'object' || Array.isArray(parsedExtra)) {
        throw new Error('Metadados adicionais devem estar em formato JSON de objeto.');
      }

      await saveFreightMasterOptionRecord({
        ...draft,
        category: selectedCategory,
        label: buildLabel(draft),
        value: String(draft.value || '').trim(),
        metadata: {
          ...(draft.metadata || {}),
          ...parsedExtra
        },
        active: draft.active !== false
      });

      setMessage({ type: 'success', text: 'Cadastro salvo.' });
      startNew(selectedCategory);
      await loadData();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Erro ao salvar cadastro.' });
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(record: FreightMasterOptionRecord) {
    if (!record.id) return;
    setSaving(true);
    setMessage(null);
    try {
      await setFreightMasterOptionActive(record.id, record.active === false);
      setMessage({ type: 'success', text: record.active === false ? 'Cadastro reativado.' : 'Cadastro inativado.' });
      await loadData();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Erro ao atualizar cadastro.' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-red-600 text-white shadow-sm">
            <Database className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-950 md:text-3xl">Masterdata Frete</h1>
            <p className="text-sm text-slate-500">Cadastros operacionais do módulo de Solicitação de Frete.</p>
          </div>
        </div>
        <button className={buttonClass('secondary')} type="button" onClick={loadData} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </button>
      </div>

      {message ? (
        <div className={`mb-4 flex items-center gap-2 rounded-lg border px-4 py-3 text-sm font-semibold ${
          message.type === 'success'
            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
            : 'border-red-200 bg-red-50 text-red-700'
        }`}>
          {message.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
          {message.text}
        </div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[320px_1fr]">
        <aside className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-4">
            <h2 className="font-bold text-slate-950">Cadastros</h2>
          </div>
          <div className="max-h-[720px] overflow-auto p-2">
            {categories.map(category => {
              const categoryCount = counts[category.id] || { total: 0, active: 0 };
              const selected = selectedCategory === category.id;
              return (
                <button
                  key={category.id}
                  className={`mb-1 flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition ${
                    selected ? 'bg-slate-950 text-white' : 'text-slate-700 hover:bg-slate-50'
                  }`}
                  type="button"
                  onClick={() => startNew(category.id)}
                >
                  <span className="min-w-0 flex-1 truncate font-semibold">{category.label}</span>
                  <span className={`ml-3 rounded-full px-2 py-0.5 text-xs ${selected ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-600'}`}>
                    {categoryCount.active}/{categoryCount.total}
                  </span>
                </button>
              );
            })}
          </div>
        </aside>

        <main className="space-y-5">
          <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-slate-100 p-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-950">{selectedConfig?.label || categoryLabel(selectedCategory)}</h2>
                <p className="text-sm text-slate-500">{selectedConfig?.description}</p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    className={`${fieldClass()} pl-9 sm:w-80`}
                    value={search}
                    onChange={event => setSearch(event.target.value)}
                    placeholder="Buscar cadastro"
                  />
                </div>
                <label className="flex h-10 items-center gap-2 rounded-md border border-slate-200 px-3 text-sm font-semibold text-slate-600">
                  <input type="checkbox" checked={showInactive} onChange={event => setShowInactive(event.target.checked)} />
                  Inativos
                </label>
              </div>
            </div>

            <form className="grid gap-4 border-b border-slate-100 p-5 lg:grid-cols-12" onSubmit={handleSubmit}>
              <div className="lg:col-span-3">
                <label className={labelClass()}>{selectedConfig?.valueLabel || 'Valor'}</label>
                <input
                  className={fieldClass()}
                  value={draft.value}
                  onChange={event => setDraft(current => ({ ...current, value: event.target.value }))}
                  required
                />
              </div>
              <div className="lg:col-span-5">
                <label className={labelClass()}>Descrição exibida</label>
                <input
                  className={fieldClass()}
                  value={draft.label}
                  onChange={event => setDraft(current => ({ ...current, label: event.target.value }))}
                  placeholder="Preenchimento automático se ficar vazio"
                />
              </div>
              <div className="lg:col-span-2">
                <label className={labelClass()}>Ordem</label>
                <input
                  className={fieldClass()}
                  type="number"
                  value={draft.sortOrder ?? 0}
                  onChange={event => setDraft(current => ({ ...current, sortOrder: Number(event.target.value || 0) }))}
                />
              </div>
              <div className="flex items-end gap-2 lg:col-span-2">
                <button className={buttonClass('primary')} type="submit" disabled={saving}>
                  <Save className="h-4 w-4" />
                  Salvar
                </button>
                {draft.id ? (
                  <button className={buttonClass('secondary')} type="button" onClick={() => startNew(selectedCategory)}>
                    <X className="h-4 w-4" />
                  </button>
                ) : (
                  <button className={buttonClass('secondary')} type="button" onClick={() => startNew(selectedCategory)}>
                    <Plus className="h-4 w-4" />
                  </button>
                )}
              </div>

              {selectedConfig?.metadataFields.map(field => (
                <div className="lg:col-span-4" key={field.key}>
                  <label className={labelClass()}>{field.label}</label>
                  <input
                    className={fieldClass()}
                    value={String(draft.metadata?.[field.key] || '')}
                    onChange={event => updateMetadata(field.key, event.target.value)}
                    placeholder={field.placeholder}
                  />
                </div>
              ))}

              <div className="lg:col-span-12">
                <label className={labelClass()}>Metadados adicionais</label>
                <textarea
                  className={areaClass()}
                  value={extraMetadata}
                  onChange={event => setExtraMetadata(event.target.value)}
                  spellCheck={false}
                />
              </div>
            </form>

            <div className="overflow-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Valor</th>
                    <th className="px-4 py-3">Descrição</th>
                    <th className="px-4 py-3">Metadados</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRecords.map(record => {
                    const metadata = visibleMetadata(record, selectedConfig);
                    return (
                      <tr key={record.id || `${record.category}-${record.value}`} className={record.active === false ? 'bg-slate-50 text-slate-400' : 'bg-white'}>
                        <td className="whitespace-nowrap px-4 py-3 font-mono text-xs font-bold text-slate-900">{record.value}</td>
                        <td className="min-w-72 px-4 py-3 font-semibold text-slate-900">{record.label}</td>
                        <td className="px-4 py-3">
                          <div className="flex max-w-xl flex-wrap gap-1">
                            {metadata.slice(0, 6).map(([key, value]) => (
                              <span key={key} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                                {key}: {String(value)}
                              </span>
                            ))}
                            {!metadata.length ? <span className="text-xs text-slate-400">-</span> : null}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2 py-1 text-xs font-semibold ${record.active === false ? 'bg-slate-100 text-slate-500' : 'bg-emerald-50 text-emerald-700'}`}>
                            {record.active === false ? 'Inativo' : 'Ativo'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            <button className={buttonClass('secondary')} type="button" onClick={() => startEdit(record)}>
                              <Pencil className="h-4 w-4" />
                              Editar
                            </button>
                            <button className={buttonClass(record.active === false ? 'secondary' : 'danger')} type="button" onClick={() => toggleActive(record)} disabled={saving || !record.id}>
                              {record.active === false ? <CheckCircle2 className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                              {record.active === false ? 'Reativar' : 'Inativar'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {!filteredRecords.length ? (
                    <tr>
                      <td className="px-4 py-10 text-center text-sm text-slate-500" colSpan={5}>
                        Nenhum cadastro encontrado.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

export default FreightMasterData;
