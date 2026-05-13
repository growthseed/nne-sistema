import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import {
  HiOutlineArrowLeft, HiOutlineCheck, HiOutlinePhotograph,
  HiOutlineUpload, HiOutlineX, HiOutlineExternalLink, HiOutlinePlus,
  HiOutlineRefresh,
} from 'react-icons/hi'

interface Settings {
  hero_kicker: string
  hero_titulo: string
  hero_titulo_destaque: string | null
  hero_subtitulo: string
  hero_imagem_url: string | null
  busca_placeholder: string
  buscas_sugeridas: string[]
  mostrar_stats: boolean
  mostrar_destaques: boolean
  mostrar_grade_categorias: boolean
  mostrar_populares: boolean
  mostrar_por_categoria: boolean
  mostrar_recentes: boolean
  titulo_destaques: string
  titulo_populares: string
  titulo_grade_categorias: string
  titulo_recentes: string
  footer_descricao: string
  footer_site_url: string
  footer_site_label: string
}

const DEFAULTS: Settings = {
  hero_kicker: 'Biblioteca digital · NNE',
  hero_titulo: 'Materiais que apoiam o ministério da igreja',
  hero_titulo_destaque: 'apoiam o ministério',
  hero_subtitulo: 'Manuais, lições, cartilhas, hinários, recursos para crianças, jovens, família e liderança — tudo organizado, atualizado e pronto para baixar.',
  hero_imagem_url: null,
  busca_placeholder: 'Buscar manual, lição, ano, trimestre...',
  buscas_sugeridas: ['Lições da Escola Sabatina', 'Material infantil', 'Mordomia', 'Hinário'],
  mostrar_stats: true,
  mostrar_destaques: true,
  mostrar_grade_categorias: true,
  mostrar_populares: true,
  mostrar_por_categoria: true,
  mostrar_recentes: true,
  titulo_destaques: 'Em destaque',
  titulo_populares: 'Mais baixados',
  titulo_grade_categorias: 'Explorar por categoria',
  titulo_recentes: 'Adicionados recentemente',
  footer_descricao: 'Biblioteca de materiais oficiais da União Norte Nordeste Brasileira da Igreja Adventista do Sétimo Dia Movimento de Reforma. Manuais, lições, cartilhas e recursos para o ministério.',
  footer_site_url: 'https://unne.asdmr.org.br',
  footer_site_label: 'unne.asdmr.org.br',
}

export default function AdminDownloadsConfigPage() {
  const [form, setForm] = useState<Settings>(DEFAULTS)
  const [original, setOriginal] = useState<Settings>(DEFAULTS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [novaSugestao, setNovaSugestao] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data, error } = await supabase.from('downloads_settings').select('*').eq('id', 1).maybeSingle()
    if (error) toast.error(error.message)
    if (data) {
      const merged = { ...DEFAULTS, ...(data as any) }
      setForm(merged)
      setOriginal(merged)
    }
    setLoading(false)
  }

  async function save() {
    if (!form.hero_titulo.trim()) return toast.error('Título do hero é obrigatório')
    setSaving(true)
    try {
      const { error } = await supabase.from('downloads_settings').update({
        hero_kicker: form.hero_kicker.trim(),
        hero_titulo: form.hero_titulo.trim(),
        hero_titulo_destaque: form.hero_titulo_destaque?.trim() || null,
        hero_subtitulo: form.hero_subtitulo.trim(),
        hero_imagem_url: form.hero_imagem_url || null,
        busca_placeholder: form.busca_placeholder.trim(),
        buscas_sugeridas: form.buscas_sugeridas,
        mostrar_stats: form.mostrar_stats,
        mostrar_destaques: form.mostrar_destaques,
        mostrar_grade_categorias: form.mostrar_grade_categorias,
        mostrar_populares: form.mostrar_populares,
        mostrar_por_categoria: form.mostrar_por_categoria,
        mostrar_recentes: form.mostrar_recentes,
        titulo_destaques: form.titulo_destaques.trim(),
        titulo_populares: form.titulo_populares.trim(),
        titulo_grade_categorias: form.titulo_grade_categorias.trim(),
        titulo_recentes: form.titulo_recentes.trim(),
        footer_descricao: form.footer_descricao.trim(),
        footer_site_url: form.footer_site_url.trim(),
        footer_site_label: form.footer_site_label.trim(),
      }).eq('id', 1)
      if (error) throw error
      setOriginal(form)
      toast.success('Configurações salvas')
    } catch (e: any) {
      toast.error(e.message || 'Erro salvando')
    } finally { setSaving(false) }
  }

  async function uploadHeroImage(file: File) {
    setUploading(true)
    try {
      const safe = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_')
      const path = `_config/hero/${Date.now()}_${safe}`
      const { error } = await supabase.storage.from('downloads').upload(path, file, {
        contentType: file.type || 'image/jpeg',
        upsert: true,
      })
      if (error) throw error
      const { data: { publicUrl } } = supabase.storage.from('downloads').getPublicUrl(path)
      setForm(f => ({ ...f, hero_imagem_url: publicUrl }))
      toast.success('Imagem do hero atualizada — clique em Salvar')
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  function addSugestao() {
    const t = novaSugestao.trim()
    if (!t) return
    if (form.buscas_sugeridas.includes(t)) return toast.error('Já existe')
    setForm(f => ({ ...f, buscas_sugeridas: [...f.buscas_sugeridas, t] }))
    setNovaSugestao('')
  }

  function removeSugestao(t: string) {
    setForm(f => ({ ...f, buscas_sugeridas: f.buscas_sugeridas.filter(x => x !== t) }))
  }

  function reset() {
    if (!confirm('Restaurar todos os textos e visibilidade para os padrões? As alterações não salvas serão perdidas.')) return
    setForm(DEFAULTS)
  }

  const dirty = JSON.stringify(form) !== JSON.stringify(original)

  if (loading) return <div className="card text-center py-16 text-gray-400">Carregando configurações...</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <Link to="/admin/downloads" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-primary-700">
          <HiOutlineArrowLeft className="w-4 h-4" /> Voltar para Downloads
        </Link>
        <Link to="/downloads" target="_blank" className="text-xs text-primary-700 hover:underline inline-flex items-center gap-1">
          Ver na página pública <HiOutlineExternalLink className="w-3 h-3" />
        </Link>
      </div>

      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Configurações da página</h1>
          <p className="text-sm text-gray-500">Edite os textos do hero, alterne seções e personalize a busca.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={reset} className="btn-secondary text-sm inline-flex items-center gap-1.5">
            <HiOutlineRefresh className="w-4 h-4" />
            Restaurar padrões
          </button>
          <button onClick={save} disabled={saving || !dirty} className="btn-primary text-sm inline-flex items-center gap-1.5">
            <HiOutlineCheck className="w-4 h-4" />
            {saving ? 'Salvando...' : dirty ? 'Salvar alterações' : 'Tudo salvo'}
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Coluna principal — Hero + Footer */}
        <div className="lg:col-span-2 space-y-6">
          {/* HERO */}
          <section className="card space-y-4">
            <div>
              <h2 className="font-semibold text-gray-900">Hero (banner principal)</h2>
              <p className="text-xs text-gray-500">Aparece no topo da página /downloads. Use a "Parte em destaque" para realçar um trecho do título com a cor primária verde.</p>
            </div>

            <div>
              <label className="label-field">Etiqueta superior (kicker)</label>
              <input
                value={form.hero_kicker}
                onChange={e => setForm(f => ({ ...f, hero_kicker: e.target.value }))}
                className="input-field"
                placeholder="Biblioteca digital · NNE"
              />
            </div>

            <div>
              <label className="label-field">Título principal *</label>
              <textarea
                value={form.hero_titulo}
                onChange={e => setForm(f => ({ ...f, hero_titulo: e.target.value }))}
                rows={2}
                className="input-field font-serif text-lg"
                placeholder="Materiais que apoiam o ministério da igreja"
              />
            </div>

            <div>
              <label className="label-field">Parte em destaque (cor primária)</label>
              <input
                value={form.hero_titulo_destaque || ''}
                onChange={e => setForm(f => ({ ...f, hero_titulo_destaque: e.target.value }))}
                className="input-field"
                placeholder="apoiam o ministério"
              />
              <p className="text-[11px] text-gray-400 mt-1">
                Trecho exato do título acima que será realçado em verde claro.
              </p>
            </div>

            <div>
              <label className="label-field">Subtítulo</label>
              <textarea
                value={form.hero_subtitulo}
                onChange={e => setForm(f => ({ ...f, hero_subtitulo: e.target.value }))}
                rows={3}
                className="input-field"
              />
            </div>

            <div>
              <label className="label-field">Imagem de fundo (opcional)</label>
              <div className="flex items-start gap-3">
                <div className="w-32 h-20 rounded-lg overflow-hidden bg-stone-100 ring-1 ring-gray-200 shrink-0">
                  {form.hero_imagem_url ? (
                    <img src={form.hero_imagem_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-stone-300">
                      <HiOutlinePhotograph className="w-6 h-6" />
                    </div>
                  )}
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="btn-secondary text-sm inline-flex items-center gap-1.5"
                    >
                      <HiOutlineUpload className="w-4 h-4" />
                      {uploading ? 'Enviando...' : 'Enviar imagem'}
                    </button>
                    {form.hero_imagem_url && (
                      <button
                        onClick={() => setForm(f => ({ ...f, hero_imagem_url: null }))}
                        className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50"
                        title="Remover imagem"
                      >
                        <HiOutlineX className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <input
                    value={form.hero_imagem_url || ''}
                    onChange={e => setForm(f => ({ ...f, hero_imagem_url: e.target.value || null }))}
                    placeholder="Ou cole uma URL externa"
                    className="input-field text-xs font-mono"
                  />
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={e => e.target.files?.[0] && uploadHeroImage(e.target.files[0])}
                    className="hidden"
                  />
                </div>
              </div>
              <p className="text-[11px] text-gray-400 mt-1">
                Sem imagem, o hero usa o gradiente verde padrão. Use fotos de paisagem em alta resolução (1920×1080+).
              </p>
            </div>
          </section>

          {/* BUSCA */}
          <section className="card space-y-4">
            <div>
              <h2 className="font-semibold text-gray-900">Busca</h2>
              <p className="text-xs text-gray-500">Personalize o placeholder e os chips de sugestão abaixo do campo.</p>
            </div>

            <div>
              <label className="label-field">Placeholder do campo</label>
              <input
                value={form.busca_placeholder}
                onChange={e => setForm(f => ({ ...f, busca_placeholder: e.target.value }))}
                className="input-field"
              />
            </div>

            <div>
              <label className="label-field">Buscas sugeridas (chips)</label>
              <div className="flex flex-wrap gap-1.5 mb-2 min-h-[2rem]">
                {form.buscas_sugeridas.length === 0 && (
                  <p className="text-xs text-gray-400">Nenhuma sugestão. Os chips ficam ocultos.</p>
                )}
                {form.buscas_sugeridas.map(t => (
                  <span key={t} className="inline-flex items-center gap-1 text-xs bg-primary-50 text-primary-800 px-2.5 py-1 rounded-full">
                    {t}
                    <button onClick={() => removeSugestao(t)} className="hover:text-red-600">
                      <HiOutlineX className="w-3.5 h-3.5" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  value={novaSugestao}
                  onChange={e => setNovaSugestao(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addSugestao())}
                  placeholder="Adicionar sugestão (Enter)"
                  className="input-field flex-1"
                />
                <button onClick={addSugestao} className="btn-secondary inline-flex items-center gap-1 text-sm">
                  <HiOutlinePlus className="w-4 h-4" /> Adicionar
                </button>
              </div>
            </div>
          </section>

          {/* TÍTULOS DAS SEÇÕES */}
          <section className="card space-y-4">
            <div>
              <h2 className="font-semibold text-gray-900">Títulos das seções</h2>
              <p className="text-xs text-gray-500">Renomeie cada seção da home. Use a coluna lateral pra ocultar.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Destaques" value={form.titulo_destaques} on={v => setForm(f => ({ ...f, titulo_destaques: v }))} />
              <Field label="Mais baixados" value={form.titulo_populares} on={v => setForm(f => ({ ...f, titulo_populares: v }))} />
              <Field label="Grade de categorias" value={form.titulo_grade_categorias} on={v => setForm(f => ({ ...f, titulo_grade_categorias: v }))} />
              <Field label="Recentes" value={form.titulo_recentes} on={v => setForm(f => ({ ...f, titulo_recentes: v }))} />
            </div>
          </section>

          {/* FOOTER */}
          <section className="card space-y-4">
            <div>
              <h2 className="font-semibold text-gray-900">Rodapé</h2>
              <p className="text-xs text-gray-500">Texto institucional e link para o site da União.</p>
            </div>
            <div>
              <label className="label-field">Descrição</label>
              <textarea
                value={form.footer_descricao}
                onChange={e => setForm(f => ({ ...f, footer_descricao: e.target.value }))}
                rows={3}
                className="input-field"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="label-field">Rótulo do site</label>
                <input
                  value={form.footer_site_label}
                  onChange={e => setForm(f => ({ ...f, footer_site_label: e.target.value }))}
                  className="input-field"
                />
              </div>
              <div>
                <label className="label-field">URL do site</label>
                <input
                  value={form.footer_site_url}
                  onChange={e => setForm(f => ({ ...f, footer_site_url: e.target.value }))}
                  className="input-field font-mono text-sm"
                  placeholder="https://unne.asdmr.org.br"
                />
              </div>
            </div>
          </section>
        </div>

        {/* Sidebar — Visibilidade das seções */}
        <div className="space-y-6">
          <section className="card space-y-3">
            <div>
              <h2 className="font-semibold text-gray-900">Visibilidade das seções</h2>
              <p className="text-xs text-gray-500">Oculte seções inteiras da página inicial.</p>
            </div>
            <ToggleRow
              label="Stats no hero"
              description="Contadores de categorias, materiais e downloads"
              checked={form.mostrar_stats}
              onChange={v => setForm(f => ({ ...f, mostrar_stats: v }))}
            />
            <ToggleRow
              label="Em destaque"
              description="Carrossel de materiais marcados como destaque"
              checked={form.mostrar_destaques}
              onChange={v => setForm(f => ({ ...f, mostrar_destaques: v }))}
            />
            <ToggleRow
              label="Grade de categorias"
              description="Tiles grandes coloridos com as categorias"
              checked={form.mostrar_grade_categorias}
              onChange={v => setForm(f => ({ ...f, mostrar_grade_categorias: v }))}
            />
            <ToggleRow
              label="Mais baixados"
              description="Carrossel ordenado por downloads"
              checked={form.mostrar_populares}
              onChange={v => setForm(f => ({ ...f, mostrar_populares: v }))}
            />
            <ToggleRow
              label="Carrosséis por categoria"
              description="Uma linha por categoria com os materiais mais recentes"
              checked={form.mostrar_por_categoria}
              onChange={v => setForm(f => ({ ...f, mostrar_por_categoria: v }))}
            />
            <ToggleRow
              label="Adicionados recentemente"
              description="Grade final com os materiais mais novos"
              checked={form.mostrar_recentes}
              onChange={v => setForm(f => ({ ...f, mostrar_recentes: v }))}
            />
          </section>

          <section className="card">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Categorias</h3>
            <p className="text-xs text-gray-500 mb-3">Para ocultar uma categoria específica do site, vá em <strong>Categorias</strong> e desligue "Pública" ou "Ativa".</p>
            <Link to="/admin/downloads/categorias" className="btn-secondary text-sm inline-flex items-center gap-1.5 w-full justify-center">
              Gerenciar categorias →
            </Link>
          </section>
        </div>
      </div>
    </div>
  )
}

function Field({ label, value, on }: { label: string; value: string; on: (v: string) => void }) {
  return (
    <div>
      <label className="label-field">{label}</label>
      <input value={value} onChange={e => on(e.target.value)} className="input-field" />
    </div>
  )
}

function ToggleRow({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-start gap-3 cursor-pointer p-2 -mx-2 rounded-lg hover:bg-stone-50">
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`shrink-0 mt-0.5 relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${checked ? 'bg-primary-600' : 'bg-gray-300'}`}
      >
        <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${checked ? 'translate-x-5' : 'translate-x-1'}`} />
      </button>
      <div className="min-w-0">
        <p className="font-medium text-gray-800 text-sm">{label}</p>
        <p className="text-[11px] text-gray-500 leading-snug">{description}</p>
      </div>
    </label>
  )
}
