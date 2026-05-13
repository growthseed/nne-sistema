import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import {
  HiOutlineArrowLeft, HiOutlinePlus, HiOutlinePencil, HiOutlineTrash,
  HiOutlineEye, HiOutlineEyeOff, HiOutlineX, HiOutlineCheck,
  HiOutlineFolderOpen, HiOutlineLightningBolt as HiOutlinePower,
} from 'react-icons/hi'

interface Categoria {
  id: string
  slug: string
  nome: string
  descricao: string | null
  cor: string | null
  imagem_capa: string | null
  ordem: number
  ativo: boolean
  publico: boolean
}

interface FormCat {
  id?: string
  slug: string
  nome: string
  descricao: string
  cor: string
  imagem_capa: string
  ordem: number
}

function slugify(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 60)
}

const EMPTY: FormCat = { slug: '', nome: '', descricao: '', cor: '#047857', imagem_capa: '', ordem: 100 }

export default function AdminDownloadsCategoriasPage() {
  const [cats, setCats] = useState<Categoria[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState<FormCat | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data, error } = await supabase
      .from('downloads_categorias')
      .select('*')
      .order('ordem')
    if (error) toast.error(error.message)
    setCats((data || []) as Categoria[])
    setLoading(false)
  }

  function startNova() {
    setForm({ ...EMPTY, ordem: (cats.length + 1) * 10 })
  }
  function startEdit(c: Categoria) {
    setForm({
      id: c.id,
      slug: c.slug,
      nome: c.nome,
      descricao: c.descricao || '',
      cor: c.cor || '#047857',
      imagem_capa: c.imagem_capa || '',
      ordem: c.ordem,
    })
  }

  async function save() {
    if (!form) return
    if (!form.nome.trim()) return toast.error('Informe o nome')
    if (!form.slug.trim()) return toast.error('Slug é obrigatório')
    setSaving(true)
    try {
      const payload = {
        slug: form.slug.trim(),
        nome: form.nome.trim(),
        descricao: form.descricao.trim() || null,
        cor: form.cor,
        imagem_capa: form.imagem_capa.trim() || null,
        ordem: form.ordem,
      }
      if (form.id) {
        const { error } = await supabase.from('downloads_categorias').update(payload).eq('id', form.id)
        if (error) throw error
        toast.success('Categoria atualizada')
      } else {
        const { error } = await supabase.from('downloads_categorias').insert(payload)
        if (error) throw error
        toast.success('Categoria criada')
      }
      setForm(null)
      await load()
    } catch (e: any) {
      toast.error(e.message || 'Erro')
    } finally { setSaving(false) }
  }

  async function toggleAtivo(c: Categoria) {
    const novo = !c.ativo
    const { error } = await supabase.from('downloads_categorias').update({ ativo: novo }).eq('id', c.id)
    if (error) return toast.error(error.message)
    setCats(prev => prev.map(p => p.id === c.id ? { ...p, ativo: novo } : p))
    toast.success(novo ? 'Categoria ativada' : 'Categoria desativada')
  }

  async function togglePublico(c: Categoria) {
    const novo = !c.publico
    const { error } = await supabase.from('downloads_categorias').update({ publico: novo }).eq('id', c.id)
    if (error) return toast.error(error.message)
    setCats(prev => prev.map(p => p.id === c.id ? { ...p, publico: novo } : p))
    toast.success(novo ? 'Visível em /downloads' : 'Oculta de /downloads')
  }

  async function excluir(c: Categoria) {
    const { count } = await supabase.from('downloads_items').select('id', { count: 'exact', head: true }).eq('categoria_id', c.id)
    if (count && count > 0) return toast.error(`Esta categoria tem ${count} materiais. Mova-os antes de excluir.`)
    if (!confirm(`Excluir categoria "${c.nome}"?`)) return
    const { error } = await supabase.from('downloads_categorias').delete().eq('id', c.id)
    if (error) return toast.error(error.message)
    toast.success('Categoria excluída')
    setCats(prev => prev.filter(p => p.id !== c.id))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <Link to="/admin/downloads" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-primary-700">
          <HiOutlineArrowLeft className="w-4 h-4" /> Voltar para Downloads
        </Link>
        <button onClick={startNova} className="btn-primary inline-flex items-center gap-1.5 text-sm">
          <HiOutlinePlus className="w-4 h-4" /> Nova categoria
        </button>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Categorias de Downloads</h1>
        <p className="text-sm text-gray-500">Estrutura principal de organização da biblioteca.</p>
      </div>

      {loading ? (
        <div className="card text-center py-16 text-gray-400">Carregando...</div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <table className="min-w-full text-sm">
            <thead className="bg-stone-50 border-b border-gray-200">
              <tr className="text-left text-[11px] uppercase tracking-wider text-gray-500">
                <th className="px-4 py-3 font-semibold">Categoria</th>
                <th className="px-4 py-3 font-semibold hidden md:table-cell">Slug</th>
                <th className="px-4 py-3 font-semibold text-center">Ordem</th>
                <th className="px-4 py-3 font-semibold text-center">Status</th>
                <th className="px-4 py-3 font-semibold text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {cats.map(c => (
                <tr key={c.id} className="hover:bg-stone-50/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background: (c.cor || '#047857') + '20' }}
                      >
                        <HiOutlineFolderOpen className="w-5 h-5" style={{ color: c.cor || '#047857' }} />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 truncate">{c.nome}</p>
                        {c.descricao && <p className="text-xs text-gray-500 truncate">{c.descricao}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-xs font-mono text-gray-500">{c.slug}</td>
                  <td className="px-4 py-3 text-center text-xs text-gray-600">{c.ordem}</td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex flex-col items-center gap-1">
                      {c.ativo ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Ativa
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                          Inativa
                        </span>
                      )}
                      {!c.publico && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                          Oculta no site
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => togglePublico(c)}
                        className={`p-2 rounded-lg transition-colors ${c.publico ? 'text-emerald-600 hover:bg-emerald-50' : 'text-amber-600 bg-amber-50 hover:bg-amber-100'}`}
                        title={c.publico ? 'Ocultar de /downloads' : 'Mostrar em /downloads'}
                      >
                        {c.publico ? <HiOutlineEye className="w-4 h-4" /> : <HiOutlineEyeOff className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => toggleAtivo(c)}
                        className={`p-2 rounded-lg transition-colors ${c.ativo ? 'text-gray-400 hover:text-primary-700 hover:bg-gray-100' : 'text-gray-300 hover:bg-gray-100'}`}
                        title={c.ativo ? 'Desativar (esconde em tudo)' : 'Ativar'}
                      >
                        {c.ativo ? <HiOutlinePower className="w-4 h-4" /> : <HiOutlinePower className="w-4 h-4 opacity-50" />}
                      </button>
                      <button
                        onClick={() => startEdit(c)}
                        className="p-2 rounded-lg text-gray-400 hover:text-primary-700 hover:bg-gray-100"
                        title="Editar"
                      >
                        <HiOutlinePencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => excluir(c)}
                        className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50"
                        title="Excluir"
                      >
                        <HiOutlineTrash className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {form && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setForm(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">{form.id ? 'Editar categoria' : 'Nova categoria'}</h2>
              <button onClick={() => setForm(null)} className="p-1 text-gray-400 hover:text-gray-700">
                <HiOutlineX className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="label-field">Nome *</label>
                <input
                  value={form.nome}
                  onChange={e => setForm({ ...form, nome: e.target.value, slug: form.slug || slugify(e.target.value) })}
                  placeholder="Escola Sabatina"
                  className="input-field"
                />
              </div>
              <div>
                <label className="label-field">Slug *</label>
                <input
                  value={form.slug}
                  onChange={e => setForm({ ...form, slug: slugify(e.target.value) })}
                  placeholder="escola-sabatina"
                  className="input-field font-mono text-sm"
                />
              </div>
              <div>
                <label className="label-field">Descrição</label>
                <textarea
                  value={form.descricao}
                  onChange={e => setForm({ ...form, descricao: e.target.value })}
                  rows={2}
                  className="input-field"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label-field">Cor</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={form.cor}
                      onChange={e => setForm({ ...form, cor: e.target.value })}
                      className="w-10 h-10 rounded border border-gray-200 cursor-pointer shrink-0"
                    />
                    <input
                      value={form.cor}
                      onChange={e => setForm({ ...form, cor: e.target.value })}
                      className="input-field font-mono text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="label-field">Ordem</label>
                  <input
                    type="number"
                    value={form.ordem}
                    onChange={e => setForm({ ...form, ordem: parseInt(e.target.value) || 100 })}
                    className="input-field"
                  />
                </div>
              </div>
              <div>
                <label className="label-field">Imagem de capa (URL — opcional)</label>
                <input
                  value={form.imagem_capa}
                  onChange={e => setForm({ ...form, imagem_capa: e.target.value })}
                  placeholder="https://..."
                  className="input-field font-mono text-sm"
                />
              </div>
            </div>
            <div className="px-5 py-4 border-t border-gray-200 flex items-center justify-end gap-2">
              <button onClick={() => setForm(null)} className="btn-secondary text-sm">Cancelar</button>
              <button onClick={save} disabled={saving} className="btn-primary text-sm inline-flex items-center gap-1.5">
                <HiOutlineCheck className="w-4 h-4" />
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
