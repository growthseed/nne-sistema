import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import {
  HiOutlineArrowLeft, HiOutlinePhotograph, HiOutlineUpload,
  HiOutlineTrash, HiOutlineDocumentText, HiOutlineExternalLink,
  HiOutlinePlus, HiOutlineX, HiOutlineCheck,
} from 'react-icons/hi'

interface CategoriaOpt { id: string; slug: string; nome: string }
interface SubcategoriaOpt { id: string; nome: string; slug: string; categoria_id: string }

interface Form {
  slug: string
  titulo: string
  subtitulo: string
  descricao: string
  categoria_id: string
  subcategoria_id: string
  capa_url: string
  publicado_em: string
  trimestre: string
  ano: string
  idioma: string
  tags: string
  destaque: boolean
  publico: boolean
  ativo: boolean
  origem_externa_url: string
}

interface FileRow {
  id: string
  rotulo: string
  formato: string
  url: string
  filename: string | null
  tamanho_bytes: number | null
  mime_type: string | null
  ordem: number
  ativo: boolean
}

const EMPTY: Form = {
  slug: '', titulo: '', subtitulo: '', descricao: '',
  categoria_id: '', subcategoria_id: '',
  capa_url: '', publicado_em: '', trimestre: '', ano: '',
  idioma: 'pt-BR', tags: '',
  destaque: false, publico: true, ativo: true,
  origem_externa_url: '',
}

function slugify(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 80)
}

function extOf(name: string): string {
  const m = name.match(/\.([a-z0-9]{2,5})$/i)
  return m ? m[1].toLowerCase() : 'bin'
}

function mimeOf(name: string): string {
  const e = extOf(name)
  if (e === 'pdf') return 'application/pdf'
  if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].includes(e)) return `image/${e === 'jpg' ? 'jpeg' : e}`
  if (['mp4', 'webm'].includes(e)) return `video/${e}`
  if (e === 'docx') return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  if (e === 'pptx') return 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  if (e === 'xlsx') return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  if (e === 'zip') return 'application/zip'
  return 'application/octet-stream'
}

function rotuloFromName(name: string): string {
  const base = name.replace(/\.[^.]+$/, '')
  return base.replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim()
    .replace(/\b\w/g, c => c.toUpperCase())
}

export default function AdminDownloadsEditPage() {
  const { id } = useParams<{ id?: string }>()
  const isNew = !id
  const nav = useNavigate()

  const [form, setForm] = useState<Form>(EMPTY)
  const [categorias, setCategorias] = useState<CategoriaOpt[]>([])
  const [subcategorias, setSubcategorias] = useState<SubcategoriaOpt[]>([])
  const [files, setFiles] = useState<FileRow[]>([])
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [uploadingCapa, setUploadingCapa] = useState(false)
  const [uploadingFiles, setUploadingFiles] = useState(false)
  const [slugAuto, setSlugAuto] = useState(isNew)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const capaInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { loadInitial() }, [id])
  useEffect(() => {
    if (slugAuto && form.titulo) setForm(f => ({ ...f, slug: slugify(f.titulo) }))
  }, [form.titulo, slugAuto])

  async function loadInitial() {
    setLoading(true)
    try {
      const [catRes, subRes] = await Promise.all([
        supabase.from('downloads_categorias').select('id, slug, nome').eq('ativo', true).order('ordem'),
        supabase.from('downloads_subcategorias').select('id, slug, nome, categoria_id').eq('ativo', true).order('ordem'),
      ])
      setCategorias((catRes.data || []) as CategoriaOpt[])
      setSubcategorias((subRes.data || []) as SubcategoriaOpt[])

      if (!isNew) {
        const { data: it } = await supabase.from('downloads_items').select('*').eq('id', id!).maybeSingle()
        if (!it) {
          toast.error('Material não encontrado')
          nav('/admin/downloads')
          return
        }
        setForm({
          slug: it.slug || '',
          titulo: it.titulo || '',
          subtitulo: it.subtitulo || '',
          descricao: it.descricao || '',
          categoria_id: it.categoria_id || '',
          subcategoria_id: it.subcategoria_id || '',
          capa_url: it.capa_url || '',
          publicado_em: it.publicado_em || '',
          trimestre: it.trimestre ? String(it.trimestre) : '',
          ano: it.ano ? String(it.ano) : '',
          idioma: it.idioma || 'pt-BR',
          tags: (it.tags || []).join(', '),
          destaque: !!it.destaque,
          publico: it.publico !== false,
          ativo: it.ativo !== false,
          origem_externa_url: it.origem_externa_url || '',
        })
        const { data: fls } = await supabase.from('downloads_files').select('*').eq('item_id', id!).order('ordem')
        setFiles((fls || []) as FileRow[])
      }
    } catch (e: any) {
      toast.error(e.message || 'Erro carregando')
    } finally { setLoading(false) }
  }

  const subsForCat = subcategorias.filter(s => s.categoria_id === form.categoria_id)

  async function save() {
    if (!form.titulo.trim()) return toast.error('Informe o título')
    if (!form.categoria_id) return toast.error('Selecione a categoria')
    if (!form.slug.trim()) return toast.error('Slug é obrigatório')

    setSaving(true)
    try {
      const payload = {
        slug: form.slug.trim(),
        titulo: form.titulo.trim(),
        subtitulo: form.subtitulo.trim() || null,
        descricao: form.descricao.trim() || null,
        categoria_id: form.categoria_id,
        subcategoria_id: form.subcategoria_id || null,
        capa_url: form.capa_url || null,
        publicado_em: form.publicado_em || null,
        trimestre: form.trimestre ? parseInt(form.trimestre) : null,
        ano: form.ano ? parseInt(form.ano) : null,
        idioma: form.idioma || 'pt-BR',
        tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
        destaque: form.destaque,
        publico: form.publico,
        ativo: form.ativo,
        origem_externa_url: form.origem_externa_url.trim() || null,
        fonte: 'manual',
      }

      if (isNew) {
        const { data, error } = await supabase.from('downloads_items').insert(payload).select('id').single()
        if (error) throw error
        toast.success('Material criado. Agora você pode subir os arquivos.')
        nav(`/admin/downloads/${data.id}`, { replace: true })
      } else {
        const { error } = await supabase.from('downloads_items').update(payload).eq('id', id!)
        if (error) throw error
        toast.success('Material atualizado')
      }
    } catch (e: any) {
      toast.error(e.message || 'Erro salvando')
    } finally { setSaving(false) }
  }

  async function uploadCapa(file: File) {
    setUploadingCapa(true)
    try {
      const safe = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_')
      const slug = form.slug || 'capa'
      const path = `_capas/${slug}/${Date.now()}_${safe}`
      const { error } = await supabase.storage.from('downloads').upload(path, file, {
        contentType: file.type || mimeOf(file.name),
        upsert: true,
      })
      if (error) throw error
      const { data: { publicUrl } } = supabase.storage.from('downloads').getPublicUrl(path)
      setForm(f => ({ ...f, capa_url: publicUrl }))
      toast.success('Capa enviada')
    } catch (e: any) {
      toast.error(e.message || 'Erro no upload')
    } finally {
      setUploadingCapa(false)
      if (capaInputRef.current) capaInputRef.current.value = ''
    }
  }

  async function uploadArquivos(list: FileList) {
    if (isNew) return toast.error('Salve o material primeiro para subir arquivos.')
    if (!list.length) return
    setUploadingFiles(true)
    try {
      const cat = categorias.find(c => c.id === form.categoria_id)
      const catSlug = cat?.slug || 'outros'
      let ordemBase = (files.length + 1) * 10
      for (const file of Array.from(list)) {
        const ext = extOf(file.name)
        const safe = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_')
        const path = `${catSlug}/${form.slug}/${Date.now()}_${safe}`
        const { error: upErr } = await supabase.storage.from('downloads').upload(path, file, {
          contentType: file.type || mimeOf(file.name),
          upsert: false,
        })
        if (upErr) {
          toast.error(`${file.name}: ${upErr.message}`)
          continue
        }
        const { data: { publicUrl } } = supabase.storage.from('downloads').getPublicUrl(path)
        const { data: row, error: insErr } = await supabase.from('downloads_files').insert({
          item_id: id!,
          rotulo: rotuloFromName(file.name),
          formato: ext,
          url: publicUrl,
          filename: file.name,
          tamanho_bytes: file.size,
          mime_type: file.type || mimeOf(file.name),
          ordem: ordemBase,
        }).select('*').single()
        if (insErr) {
          toast.error(`${file.name}: ${insErr.message}`)
          continue
        }
        setFiles(prev => [...prev, row as FileRow])
        ordemBase += 10
      }
      toast.success('Arquivos enviados')
    } finally {
      setUploadingFiles(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function updateFile(fileId: string, patch: Partial<FileRow>) {
    const { error } = await supabase.from('downloads_files').update(patch).eq('id', fileId)
    if (error) return toast.error(error.message)
    setFiles(prev => prev.map(f => f.id === fileId ? { ...f, ...patch } : f))
  }

  async function deleteFile(file: FileRow) {
    if (!confirm(`Remover "${file.rotulo}"?`)) return
    const { error } = await supabase.from('downloads_files').delete().eq('id', file.id)
    if (error) return toast.error(error.message)
    setFiles(prev => prev.filter(f => f.id !== file.id))
    toast.success('Arquivo removido')
  }

  if (loading) return <div className="card text-center py-16 text-gray-400">Carregando...</div>

  return (
    <div className="space-y-6">
      {/* Top */}
      <div className="flex items-center justify-between gap-3">
        <Link to="/admin/downloads" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-primary-700">
          <HiOutlineArrowLeft className="w-4 h-4" /> Voltar para Downloads
        </Link>
        {!isNew && form.categoria_id && (
          <Link
            to={`/downloads/${categorias.find(c => c.id === form.categoria_id)?.slug || ''}/${form.slug}`}
            target="_blank"
            className="text-xs text-primary-700 hover:underline inline-flex items-center gap-1"
          >
            Ver publicado <HiOutlineExternalLink className="w-3 h-3" />
          </Link>
        )}
      </div>

      <div className="flex items-start justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-900">
          {isNew ? 'Novo material' : 'Editar material'}
        </h1>
        <button onClick={save} disabled={saving} className="btn-primary inline-flex items-center gap-1.5">
          <HiOutlineCheck className="w-4 h-4" />
          {saving ? 'Salvando...' : isNew ? 'Criar material' : 'Salvar alterações'}
        </button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Coluna esquerda — dados */}
        <div className="lg:col-span-2 space-y-6">
          <section className="card space-y-4">
            <h2 className="font-semibold text-gray-800">Informações principais</h2>

            <div>
              <label className="label-field">Título *</label>
              <input
                value={form.titulo}
                onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
                placeholder="Ex.: Chave Mestra · 2º Trimestre 2026"
                className="input-field"
              />
            </div>

            <div>
              <label className="label-field">Subtítulo</label>
              <input
                value={form.subtitulo}
                onChange={e => setForm(f => ({ ...f, subtitulo: e.target.value }))}
                placeholder="Frase curta complementar"
                className="input-field"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="label-field mb-0">Slug (URL) *</label>
                <label className="text-xs text-gray-500 inline-flex items-center gap-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={slugAuto}
                    onChange={e => setSlugAuto(e.target.checked)}
                    className="rounded"
                  />
                  Gerar automaticamente
                </label>
              </div>
              <input
                value={form.slug}
                onChange={e => { setSlugAuto(false); setForm(f => ({ ...f, slug: slugify(e.target.value) })) }}
                placeholder="chave-mestra-2o-trimestre-2026"
                className="input-field font-mono text-sm"
              />
              <p className="text-[11px] text-gray-400 mt-1">URL: /downloads/{`<categoria>`}/<strong>{form.slug || 'slug'}</strong></p>
            </div>

            <div>
              <label className="label-field">Descrição</label>
              <textarea
                value={form.descricao}
                onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
                placeholder="Descreva o material, público-alvo, conteúdo..."
                rows={5}
                className="input-field"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label-field">Categoria *</label>
                <select
                  value={form.categoria_id}
                  onChange={e => setForm(f => ({ ...f, categoria_id: e.target.value, subcategoria_id: '' }))}
                  className="input-field"
                >
                  <option value="">Selecione...</option>
                  {categorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
              <div>
                <label className="label-field">Subcategoria</label>
                <select
                  value={form.subcategoria_id}
                  onChange={e => setForm(f => ({ ...f, subcategoria_id: e.target.value }))}
                  className="input-field"
                  disabled={!form.categoria_id || subsForCat.length === 0}
                >
                  <option value="">{subsForCat.length === 0 ? '—' : 'Nenhuma'}</option>
                  {subsForCat.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="label-field">Trimestre</label>
                <select
                  value={form.trimestre}
                  onChange={e => setForm(f => ({ ...f, trimestre: e.target.value }))}
                  className="input-field"
                >
                  <option value="">—</option>
                  <option value="1">1º</option>
                  <option value="2">2º</option>
                  <option value="3">3º</option>
                  <option value="4">4º</option>
                </select>
              </div>
              <div>
                <label className="label-field">Ano</label>
                <input
                  type="number"
                  min="2000" max="2100"
                  value={form.ano}
                  onChange={e => setForm(f => ({ ...f, ano: e.target.value }))}
                  className="input-field"
                />
              </div>
              <div>
                <label className="label-field">Publicado em</label>
                <input
                  type="date"
                  value={form.publicado_em}
                  onChange={e => setForm(f => ({ ...f, publicado_em: e.target.value }))}
                  className="input-field"
                />
              </div>
              <div>
                <label className="label-field">Idioma</label>
                <select
                  value={form.idioma}
                  onChange={e => setForm(f => ({ ...f, idioma: e.target.value }))}
                  className="input-field"
                >
                  <option value="pt-BR">Português</option>
                  <option value="en">Inglês</option>
                  <option value="es">Espanhol</option>
                </select>
              </div>
            </div>

            <div>
              <label className="label-field">Tags (separadas por vírgula)</label>
              <input
                value={form.tags}
                onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
                placeholder="lição, infantil, professores, 2026"
                className="input-field"
              />
            </div>

            <div>
              <label className="label-field">URL da fonte original (opcional)</label>
              <input
                value={form.origem_externa_url}
                onChange={e => setForm(f => ({ ...f, origem_externa_url: e.target.value }))}
                placeholder="https://downloads.adventistas.org/..."
                className="input-field font-mono text-sm"
              />
            </div>
          </section>

          {/* Arquivos */}
          <section className="card">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-semibold text-gray-800">Arquivos para download</h2>
                <p className="text-xs text-gray-500">PDF, imagens, vídeos, e-books, planilhas, etc. (até 100MB cada)</p>
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isNew || uploadingFiles}
                className="btn-primary inline-flex items-center gap-1.5 text-sm"
                title={isNew ? 'Salve o material primeiro' : 'Adicionar arquivos'}
              >
                <HiOutlinePlus className="w-4 h-4" />
                {uploadingFiles ? 'Enviando...' : 'Adicionar arquivos'}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={e => e.target.files && uploadArquivos(e.target.files)}
                className="hidden"
              />
            </div>

            {isNew && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4">
                Salve o material primeiro para liberar o upload de arquivos.
              </p>
            )}

            {files.length === 0 ? (
              <div className="text-center py-10 border-2 border-dashed border-gray-200 rounded-xl text-gray-400">
                <HiOutlineUpload className="w-8 h-8 mx-auto" />
                <p className="text-sm mt-2">Nenhum arquivo ainda.</p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {files.map((f, idx) => (
                  <li key={f.id} className="py-3 flex items-center gap-3">
                    <div className="w-9 h-9 bg-stone-100 rounded-lg flex items-center justify-center shrink-0">
                      <HiOutlineDocumentText className="w-4 h-4 text-stone-500" />
                    </div>
                    <div className="flex-1 min-w-0 grid sm:grid-cols-[1fr_120px] gap-2 items-center">
                      <input
                        value={f.rotulo}
                        onChange={e => setFiles(prev => prev.map(p => p.id === f.id ? { ...p, rotulo: e.target.value } : p))}
                        onBlur={e => updateFile(f.id, { rotulo: e.target.value })}
                        placeholder="Rótulo (ex: Rol do Berço)"
                        className="input-field text-sm py-1.5"
                      />
                      <div className="flex items-center gap-2 text-[11px] text-gray-500">
                        <span className="uppercase font-semibold">{f.formato}</span>
                        {f.tamanho_bytes && <>· <span>{fmtBytes(f.tamanho_bytes)}</span></>}
                      </div>
                    </div>
                    <a
                      href={f.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-lg text-gray-400 hover:text-primary-700 hover:bg-gray-100"
                      title="Abrir"
                    >
                      <HiOutlineExternalLink className="w-4 h-4" />
                    </a>
                    <button
                      onClick={() => deleteFile(f)}
                      className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50"
                      title="Remover"
                    >
                      <HiOutlineTrash className="w-4 h-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* Coluna direita — visibilidade + capa */}
        <div className="space-y-6">
          <section className="card">
            <h2 className="font-semibold text-gray-800 mb-3">Capa</h2>
            <div className="aspect-[3/4] bg-stone-100 rounded-xl overflow-hidden border border-gray-200">
              {form.capa_url ? (
                <img src={form.capa_url} alt="Capa" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-stone-400">
                  <HiOutlinePhotograph className="w-12 h-12" />
                  <p className="text-xs mt-2">Sem capa</p>
                </div>
              )}
            </div>
            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={() => capaInputRef.current?.click()}
                disabled={uploadingCapa}
                className="btn-secondary text-sm inline-flex items-center gap-1.5 flex-1 justify-center"
              >
                <HiOutlineUpload className="w-4 h-4" />
                {uploadingCapa ? 'Enviando...' : form.capa_url ? 'Trocar' : 'Enviar capa'}
              </button>
              {form.capa_url && (
                <button
                  onClick={() => setForm(f => ({ ...f, capa_url: '' }))}
                  className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50"
                  title="Remover capa"
                >
                  <HiOutlineX className="w-4 h-4" />
                </button>
              )}
              <input
                ref={capaInputRef}
                type="file"
                accept="image/*"
                onChange={e => e.target.files?.[0] && uploadCapa(e.target.files[0])}
                className="hidden"
              />
            </div>
            <div className="mt-3">
              <label className="label-field text-xs">Ou cole uma URL externa</label>
              <input
                value={form.capa_url}
                onChange={e => setForm(f => ({ ...f, capa_url: e.target.value }))}
                placeholder="https://..."
                className="input-field text-xs font-mono"
              />
            </div>
          </section>

          <section className="card">
            <h2 className="font-semibold text-gray-800 mb-3">Visibilidade</h2>
            <div className="space-y-2 text-sm">
              <Switch
                label="Ativo"
                description="Quando desligado, o material não aparece em nenhum lugar"
                checked={form.ativo}
                onChange={v => setForm(f => ({ ...f, ativo: v }))}
              />
              <Switch
                label="Público"
                description="Visível em /downloads para qualquer pessoa"
                checked={form.publico}
                onChange={v => setForm(f => ({ ...f, publico: v }))}
              />
              <Switch
                label="Em destaque"
                description="Aparece em primeiro plano na home de Downloads"
                checked={form.destaque}
                onChange={v => setForm(f => ({ ...f, destaque: v }))}
              />
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

function Switch({ label, description, checked, onChange }: { label: string; description?: string; checked: boolean; onChange: (v: boolean) => void }) {
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
        <p className="font-medium text-gray-800">{label}</p>
        {description && <p className="text-[11px] text-gray-500 leading-snug">{description}</p>}
      </div>
    </label>
  )
}

function fmtBytes(b: number): string {
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`
  if (b < 1024 * 1024 * 1024) return `${(b / 1024 / 1024).toFixed(1)} MB`
  return `${(b / 1024 / 1024 / 1024).toFixed(2)} GB`
}
