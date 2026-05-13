import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import {
  HiOutlinePlus, HiOutlineSearch, HiOutlineTrash, HiOutlinePencil,
  HiOutlineClipboardCopy, HiOutlineDownload, HiOutlineEye, HiOutlineStar,
  HiOutlineGlobeAlt, HiOutlineUpload, HiOutlineX,
} from 'react-icons/hi'
import { FaWhatsapp, FaInstagram, FaFacebook } from 'react-icons/fa'

const TIPOS = [
  { id: 'aniversario', label: 'Aniversário', icon: '🎂' },
  { id: 'post_instagram', label: 'Instagram', icon: '📷' },
  { id: 'post_whatsapp', label: 'WhatsApp', icon: '💬' },
  { id: 'post_facebook', label: 'Facebook', icon: '📘' },
  { id: 'banner_site', label: 'Banner do site', icon: '🌐' },
  { id: 'flyer_impressao', label: 'Flyer (impressão)', icon: '🖨️' },
  { id: 'story', label: 'Story', icon: '⏱️' },
  { id: 'reels', label: 'Reels', icon: '🎬' },
  { id: 'video', label: 'Vídeo', icon: '🎥' },
  { id: 'outro', label: 'Outro', icon: '📄' },
]

const CATEGORIAS = [
  { id: 'geral', label: 'Geral' },
  { id: 'escola_sabatina', label: 'Escola Sabatina' },
  { id: 'missoes', label: 'Missões' },
  { id: 'jovens', label: 'Jovens' },
  { id: 'criancas', label: 'Crianças' },
  { id: 'terceira_idade', label: 'Terceira idade' },
  { id: 'familia', label: 'Família' },
  { id: 'saude', label: 'Saúde' },
  { id: 'mulheres', label: 'Mulheres' },
  { id: 'homens', label: 'Homens' },
  { id: 'musica', label: 'Música' },
  { id: 'data_civica', label: 'Data cívica' },
  { id: 'aniversario', label: 'Aniversário' },
  { id: 'bem_vindo', label: 'Boas-vindas' },
  { id: 'conviteespecial', label: 'Convite especial' },
  { id: 'outro', label: 'Outro' },
]

interface Campanha {
  id: string
  titulo: string
  descricao: string | null
  tipo: string
  categoria: string
  midia_urls: string[]
  thumbnail_url: string | null
  texto_legenda: string | null
  texto_compartilhar: string | null
  hashtags: string[] | null
  publico: boolean
  destaque: boolean
  ativo: boolean
  fonte: string
  origem_externa_url: string | null
  created_at: string
}

export default function CampanhasPage() {
  const { profile } = useAuth()
  const isAdmin = profile?.papel && ['admin', 'admin_uniao', 'admin_associacao'].includes(profile.papel)

  const [campanhas, setCampanhas] = useState<Campanha[]>([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [filtroTipo, setFiltroTipo] = useState<string>('todos')
  const [filtroCategoria, setFiltroCategoria] = useState<string>('todas')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Campanha | null>(null)
  const [preview, setPreview] = useState<Campanha | null>(null)

  useEffect(() => {
    fetchCampanhas()
  }, [])

  async function fetchCampanhas() {
    setLoading(true)
    const { data, error } = await supabase
      .from('campanhas_marketing')
      .select('*')
      .eq('ativo', true)
      .order('destaque', { ascending: false })
      .order('created_at', { ascending: false })
    if (!error) setCampanhas((data || []) as Campanha[])
    setLoading(false)
  }

  const filtered = useMemo(() => {
    return campanhas.filter(c => {
      if (filtroTipo !== 'todos' && c.tipo !== filtroTipo) return false
      if (filtroCategoria !== 'todas' && c.categoria !== filtroCategoria) return false
      if (busca.trim()) {
        const t = busca.toLowerCase()
        return (
          c.titulo.toLowerCase().includes(t) ||
          (c.descricao || '').toLowerCase().includes(t) ||
          (c.hashtags || []).some(h => h.toLowerCase().includes(t))
        )
      }
      return true
    })
  }, [campanhas, busca, filtroTipo, filtroCategoria])

  const stats = useMemo(() => ({
    total: campanhas.length,
    publicas: campanhas.filter(c => c.publico).length,
    destaques: campanhas.filter(c => c.destaque).length,
    aniversario: campanhas.filter(c => c.tipo === 'aniversario').length,
  }), [campanhas])

  async function toggleDestaque(c: Campanha) {
    const { error } = await supabase.from('campanhas_marketing').update({ destaque: !c.destaque }).eq('id', c.id)
    if (!error) fetchCampanhas()
  }
  async function togglePublico(c: Campanha) {
    const { error } = await supabase.from('campanhas_marketing').update({ publico: !c.publico }).eq('id', c.id)
    if (!error) fetchCampanhas()
  }
  async function softDelete(c: Campanha) {
    if (!confirm(`Arquivar "${c.titulo}"? Pode ser revertido alterando ativo=true direto no banco.`)) return
    const { error } = await supabase.from('campanhas_marketing').update({ ativo: false }).eq('id', c.id)
    if (!error) fetchCampanhas()
  }

  function copyText(text: string, what: string) {
    navigator.clipboard.writeText(text)
    alert(`${what} copiado!`)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Marketing · Campanhas</h1>
          <p className="text-gray-500 mt-1 text-sm">
            Cartões e posts prontos: aniversários, redes sociais, banners e materiais para comunicação da União.
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => { setEditing(null); setShowForm(true) }}
            className="btn-primary inline-flex items-center gap-2"
          >
            <HiOutlinePlus className="w-4 h-4" />
            Nova campanha
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Total" value={stats.total} icon="📁" />
        <StatCard label="Públicas" value={stats.publicas} icon="🌐" />
        <StatCard label="Destaques" value={stats.destaques} icon="⭐" />
        <StatCard label="Aniversários" value={stats.aniversario} icon="🎂" />
      </div>

      {/* Filtros */}
      <div className="card flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Buscar por título, descrição ou hashtag..."
            className="input-field pl-10"
          />
        </div>
        <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)} className="input-field w-auto text-sm">
          <option value="todos">Todos os tipos</option>
          {TIPOS.map(t => <option key={t.id} value={t.id}>{t.icon} {t.label}</option>)}
        </select>
        <select value={filtroCategoria} onChange={e => setFiltroCategoria(e.target.value)} className="input-field w-auto text-sm">
          <option value="todas">Todas categorias</option>
          {CATEGORIAS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Carregando campanhas...</div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-16">
          <p className="text-gray-700 font-medium mb-2">Nenhuma campanha encontrada.</p>
          {isAdmin && (
            <button onClick={() => { setEditing(null); setShowForm(true) }} className="text-primary-600 hover:underline text-sm">
              Adicionar a primeira →
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(c => (
            <CampanhaCard
              key={c.id}
              c={c}
              isAdmin={!!isAdmin}
              onPreview={() => setPreview(c)}
              onEdit={() => { setEditing(c); setShowForm(true) }}
              onToggleDestaque={() => toggleDestaque(c)}
              onTogglePublico={() => togglePublico(c)}
              onDelete={() => softDelete(c)}
              onCopyLegenda={() => copyText(c.texto_legenda || '', 'Legenda')}
              onCopyWpp={() => copyText(c.texto_compartilhar || c.titulo, 'Texto')}
            />
          ))}
        </div>
      )}

      {/* Form modal */}
      {showForm && (
        <CampanhaForm
          initial={editing}
          onClose={() => { setShowForm(false); setEditing(null) }}
          onSaved={() => { setShowForm(false); setEditing(null); fetchCampanhas() }}
        />
      )}

      {/* Preview modal */}
      {preview && <PreviewModal c={preview} onClose={() => setPreview(null)} />}
    </div>
  )
}

function StatCard({ label, value, icon }: { label: string; value: number; icon: string }) {
  return (
    <div className="card text-center py-3">
      <p className="text-2xl">{icon}</p>
      <p className="text-2xl font-bold text-gray-800 tabular-nums">{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  )
}

function CampanhaCard({ c, isAdmin, onPreview, onEdit, onToggleDestaque, onTogglePublico, onDelete, onCopyLegenda, onCopyWpp }: {
  c: Campanha
  isAdmin: boolean
  onPreview: () => void
  onEdit: () => void
  onToggleDestaque: () => void
  onTogglePublico: () => void
  onDelete: () => void
  onCopyLegenda: () => void
  onCopyWpp: () => void
}) {
  const tipoInfo = TIPOS.find(t => t.id === c.tipo)
  const catInfo = CATEGORIAS.find(cat => cat.id === c.categoria)
  const thumb = c.thumbnail_url || c.midia_urls?.[0] || null

  return (
    <div className="card p-0 overflow-hidden hover:shadow-lg transition-shadow group">
      {/* Mídia */}
      <button onClick={onPreview} className="block relative w-full aspect-square bg-gray-100 overflow-hidden">
        {thumb ? (
          <img src={thumb} alt={c.titulo} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl text-gray-300">{tipoInfo?.icon || '📄'}</div>
        )}
        <div className="absolute top-2 left-2 flex gap-1 flex-wrap">
          {c.destaque && (
            <span className="bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">⭐ Destaque</span>
          )}
          {c.publico && (
            <span className="bg-emerald-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">🌐 Público</span>
          )}
        </div>
        <div className="absolute top-2 right-2">
          <span className="bg-white/90 text-gray-700 text-[10px] font-medium px-1.5 py-0.5 rounded">
            {tipoInfo?.icon} {tipoInfo?.label}
          </span>
        </div>
      </button>

      {/* Info */}
      <div className="p-3">
        <p className="font-semibold text-sm text-gray-800 line-clamp-1" title={c.titulo}>{c.titulo}</p>
        <p className="text-[11px] text-gray-500 mt-0.5">{catInfo?.label}</p>
        {c.hashtags && c.hashtags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {c.hashtags.slice(0, 3).map((h, i) => (
              <span key={i} className="text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">#{h.replace(/^#/, '')}</span>
            ))}
          </div>
        )}

        {/* Ações rápidas */}
        <div className="flex items-center gap-1 mt-3 pt-2 border-t border-gray-100">
          <button onClick={onPreview} title="Pré-visualizar" className="p-1.5 text-gray-500 hover:text-primary-700 hover:bg-primary-50 rounded">
            <HiOutlineEye className="w-4 h-4" />
          </button>
          {c.texto_legenda && (
            <button onClick={onCopyLegenda} title="Copiar legenda" className="p-1.5 text-gray-500 hover:text-pink-700 hover:bg-pink-50 rounded">
              <FaInstagram className="w-4 h-4" />
            </button>
          )}
          {c.texto_compartilhar && (
            <button onClick={onCopyWpp} title="Copiar texto WhatsApp" className="p-1.5 text-gray-500 hover:text-green-700 hover:bg-green-50 rounded">
              <FaWhatsapp className="w-4 h-4" />
            </button>
          )}
          {c.midia_urls?.[0] && (
            <a href={c.midia_urls[0]} download target="_blank" rel="noopener noreferrer" title="Baixar mídia" className="p-1.5 text-gray-500 hover:text-blue-700 hover:bg-blue-50 rounded">
              <HiOutlineDownload className="w-4 h-4" />
            </a>
          )}
          {isAdmin && (
            <>
              <div className="flex-1" />
              <button onClick={onToggleDestaque} title={c.destaque ? 'Remover destaque' : 'Marcar destaque'} className={`p-1.5 rounded ${c.destaque ? 'text-amber-600 bg-amber-50' : 'text-gray-400 hover:bg-gray-100'}`}>
                <HiOutlineStar className="w-4 h-4" />
              </button>
              <button onClick={onTogglePublico} title={c.publico ? 'Tornar interno' : 'Tornar público'} className={`p-1.5 rounded ${c.publico ? 'text-emerald-600 bg-emerald-50' : 'text-gray-400 hover:bg-gray-100'}`}>
                <HiOutlineGlobeAlt className="w-4 h-4" />
              </button>
              <button onClick={onEdit} title="Editar" className="p-1.5 text-gray-500 hover:text-blue-700 hover:bg-blue-50 rounded">
                <HiOutlinePencil className="w-4 h-4" />
              </button>
              <button onClick={onDelete} title="Arquivar" className="p-1.5 text-gray-500 hover:text-red-700 hover:bg-red-50 rounded">
                <HiOutlineTrash className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function PreviewModal({ c, onClose }: { c: Campanha; onClose: () => void }) {
  const tipoInfo = TIPOS.find(t => t.id === c.tipo)
  const catInfo = CATEGORIAS.find(cat => cat.id === c.categoria)
  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-bold text-gray-800">{c.titulo}</h2>
            <p className="text-xs text-gray-500">{tipoInfo?.icon} {tipoInfo?.label} · {catInfo?.label}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><HiOutlineX className="w-5 h-5" /></button>
        </div>
        <div className="p-4 space-y-4">
          {c.midia_urls.map((url, i) => (
            <img key={i} src={url} alt="" className="w-full rounded-lg" />
          ))}
          {c.descricao && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Descrição</p>
              <p className="text-sm text-gray-700 whitespace-pre-line">{c.descricao}</p>
            </div>
          )}
          {c.texto_legenda && (
            <div className="bg-pink-50 border border-pink-200 rounded-lg p-3">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-semibold text-pink-700 uppercase tracking-wider">Legenda Instagram/Facebook</p>
                <button onClick={() => { navigator.clipboard.writeText(c.texto_legenda || ''); alert('Copiado!') }} className="text-xs text-pink-700 hover:underline inline-flex items-center gap-1">
                  <HiOutlineClipboardCopy className="w-3 h-3" /> Copiar
                </button>
              </div>
              <p className="text-sm text-gray-800 whitespace-pre-line">{c.texto_legenda}</p>
            </div>
          )}
          {c.texto_compartilhar && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-semibold text-green-700 uppercase tracking-wider">Texto WhatsApp</p>
                <button onClick={() => { navigator.clipboard.writeText(c.texto_compartilhar || ''); alert('Copiado!') }} className="text-xs text-green-700 hover:underline inline-flex items-center gap-1">
                  <HiOutlineClipboardCopy className="w-3 h-3" /> Copiar
                </button>
              </div>
              <p className="text-sm text-gray-800 whitespace-pre-line">{c.texto_compartilhar}</p>
            </div>
          )}
          {c.hashtags && c.hashtags.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Hashtags</p>
              <div className="flex flex-wrap gap-1.5">
                {c.hashtags.map((h, i) => (
                  <span key={i} className="text-xs text-blue-700 bg-blue-50 px-2 py-1 rounded">#{h.replace(/^#/, '')}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function CampanhaForm({ initial, onClose, onSaved }: {
  initial: Campanha | null
  onClose: () => void
  onSaved: () => void
}) {
  const { profile } = useAuth()
  const [titulo, setTitulo] = useState(initial?.titulo || '')
  const [descricao, setDescricao] = useState(initial?.descricao || '')
  const [tipo, setTipo] = useState(initial?.tipo || 'aniversario')
  const [categoria, setCategoria] = useState(initial?.categoria || 'geral')
  const [textoLegenda, setTextoLegenda] = useState(initial?.texto_legenda || '')
  const [textoCompartilhar, setTextoCompartilhar] = useState(initial?.texto_compartilhar || '')
  const [hashtags, setHashtags] = useState((initial?.hashtags || []).join(' '))
  const [publico, setPublico] = useState(initial?.publico || false)
  const [destaque, setDestaque] = useState(initial?.destaque || false)
  const [midiaUrls, setMidiaUrls] = useState<string[]>(initial?.midia_urls || [])
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  async function handleUpload(file: File) {
    setUploading(true)
    setErr('')
    try {
      const ext = file.name.split('.').pop() || 'png'
      const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_')
      const path = `campanhas/${Date.now()}_${safeName}`
      const { error } = await supabase.storage.from('marketing').upload(path, file, { upsert: false })
      if (error) throw error
      const { data } = supabase.storage.from('marketing').getPublicUrl(path)
      setMidiaUrls(prev => [...prev, data.publicUrl])
    } catch (e: any) {
      setErr(e?.message || 'Falha no upload.')
    } finally {
      setUploading(false)
    }
  }

  async function save() {
    if (!titulo.trim()) { setErr('Título é obrigatório.'); return }
    setSaving(true)
    setErr('')
    const payload = {
      titulo: titulo.trim(),
      descricao: descricao.trim() || null,
      tipo,
      categoria,
      midia_urls: midiaUrls,
      thumbnail_url: midiaUrls[0] || null,
      texto_legenda: textoLegenda.trim() || null,
      texto_compartilhar: textoCompartilhar.trim() || null,
      hashtags: hashtags.split(/\s+/).map(h => h.replace(/^#/, '').trim()).filter(Boolean),
      publico,
      destaque,
      fonte: initial?.fonte || 'manual',
      criado_por: profile?.id || null,
    }
    try {
      if (initial) {
        const { error } = await supabase.from('campanhas_marketing').update(payload).eq('id', initial.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('campanhas_marketing').insert(payload)
        if (error) throw error
      }
      onSaved()
    } catch (e: any) {
      setErr(e?.message || 'Falha ao salvar.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center p-4 pt-10 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-bold text-gray-800">{initial ? 'Editar' : 'Nova'} campanha</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><HiOutlineX className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {err && <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-lg">{err}</div>}

          <div>
            <label className="text-xs font-medium text-gray-600">Título *</label>
            <input value={titulo} onChange={e => setTitulo(e.target.value)} className="input-field mt-1" placeholder="Ex: Feliz aniversário 2026" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600">Tipo</label>
              <select value={tipo} onChange={e => setTipo(e.target.value)} className="input-field mt-1">
                {TIPOS.map(t => <option key={t.id} value={t.id}>{t.icon} {t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Categoria</label>
              <select value={categoria} onChange={e => setCategoria(e.target.value)} className="input-field mt-1">
                {CATEGORIAS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-600">Descrição (interna)</label>
            <textarea value={descricao} onChange={e => setDescricao(e.target.value)} className="input-field mt-1" rows={2} placeholder="Notas internas sobre uso, contexto..." />
          </div>

          {/* Upload */}
          <div>
            <label className="text-xs font-medium text-gray-600">Mídia</label>
            <div className="mt-1 flex flex-col gap-2">
              {midiaUrls.map((url, i) => (
                <div key={i} className="flex items-center gap-2 bg-gray-50 rounded-lg p-2">
                  <img src={url} alt="" className="w-16 h-16 object-cover rounded" />
                  <input value={url} readOnly className="input-field text-xs flex-1" />
                  <button type="button" onClick={() => setMidiaUrls(midiaUrls.filter((_, j) => j !== i))} className="p-1 text-red-600 hover:bg-red-50 rounded">
                    <HiOutlineTrash className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <label className="flex items-center justify-center gap-2 border-2 border-dashed border-gray-300 rounded-lg p-4 cursor-pointer hover:bg-gray-50 text-sm text-gray-600">
                <HiOutlineUpload className="w-5 h-5" />
                {uploading ? 'Enviando...' : 'Clique para subir imagem/vídeo/PDF'}
                <input
                  type="file"
                  accept="image/*,video/mp4,application/pdf"
                  hidden
                  onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0])}
                />
              </label>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-600 flex items-center gap-1"><FaInstagram className="w-3 h-3 text-pink-600" /> Legenda Instagram / Facebook</label>
            <textarea value={textoLegenda} onChange={e => setTextoLegenda(e.target.value)} className="input-field mt-1" rows={3} placeholder="Texto pronto para colar na publicação..." />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-600 flex items-center gap-1"><FaWhatsapp className="w-3 h-3 text-green-600" /> Texto WhatsApp</label>
            <textarea value={textoCompartilhar} onChange={e => setTextoCompartilhar(e.target.value)} className="input-field mt-1" rows={3} placeholder="Mensagem para compartilhar via WhatsApp..." />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-600">Hashtags (separadas por espaço)</label>
            <input value={hashtags} onChange={e => setHashtags(e.target.value)} className="input-field mt-1" placeholder="aniversario igreja nne familia" />
          </div>

          <div className="flex items-center gap-4 pt-2 border-t">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={destaque} onChange={e => setDestaque(e.target.checked)} className="w-4 h-4" />
              ⭐ Destacar
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={publico} onChange={e => setPublico(e.target.checked)} className="w-4 h-4" />
              🌐 Liberar público (membros logados/portal)
            </label>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 p-4 border-t">
          <button onClick={onClose} className="btn-secondary text-sm">Cancelar</button>
          <button onClick={save} disabled={saving || uploading || !titulo.trim()} className="btn-primary text-sm disabled:opacity-50">
            {saving ? 'Salvando...' : initial ? 'Atualizar' : 'Criar campanha'}
          </button>
        </div>
      </div>
    </div>
  )
}
