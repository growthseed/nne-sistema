import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import {
  HiOutlineUser, HiOutlineCamera, HiOutlineMail, HiOutlinePhone,
  HiOutlineCalendar, HiOutlineLocationMarker, HiOutlineOfficeBuilding,
  HiOutlinePencil, HiOutlineCheck, HiOutlineInformationCircle,
} from 'react-icons/hi'

interface PerfilAluno {
  id: string; nome: string; email: string | null; foto_url: string | null
  data_nascimento: string | null; sexo: string | null; telefone: string | null
  cidade: string | null; estado: string | null; igreja_nome: string | null
  bio: string | null; perfil_completo: boolean
}

export default function PortalPerfilPage() {
  const navigate = useNavigate()
  const [perfil, setPerfil] = useState<PerfilAluno | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(false)
  const [saved, setSaved] = useState(false)
  const [userId, setUserId] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => { loadPerfil() }, [])

  async function loadPerfil() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { navigate('/portal/login', { replace: true }); return }

    const u = session.user
    setUserId(u.id)

    // Try to get existing profile
    const { data } = await supabase.from('eb_perfis_aluno').select('*').eq('id', u.id).single()

    if (data) {
      setPerfil(data)
    } else {
      // Create profile from auth metadata
      const newPerfil: PerfilAluno = {
        id: u.id,
        nome: u.user_metadata?.nome || u.user_metadata?.full_name || u.email?.split('@')[0] || '',
        email: u.email || null,
        foto_url: u.user_metadata?.avatar_url || null,
        data_nascimento: null, sexo: null, telefone: null,
        cidade: null, estado: null, igreja_nome: null, bio: null,
        perfil_completo: false,
      }
      await supabase.from('eb_perfis_aluno').insert(newPerfil)
      setPerfil(newPerfil)
      setEditing(true) // Auto-open edit for new profiles
    }
    setLoading(false)
  }

  async function savePerfil() {
    if (!perfil) return
    setSaving(true)

    // Check completeness
    const complete = !!(perfil.nome && perfil.data_nascimento && perfil.sexo && perfil.telefone)
    const updated = { ...perfil, perfil_completo: complete, updated_at: new Date().toISOString() }

    await supabase.from('eb_perfis_aluno').update(updated).eq('id', perfil.id)
    setPerfil({ ...perfil, perfil_completo: complete })
    setEditing(false)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !perfil) return

    // Validate
    if (!file.type.startsWith('image/')) { alert('Selecione uma imagem (JPG, PNG)'); return }
    if (file.size > 2 * 1024 * 1024) { alert('A imagem deve ter no máximo 2MB'); return }

    const ext = file.name.split('.').pop()
    const path = `perfis/${userId}.${ext}`

    const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
    if (error) {
      // If bucket doesn't exist, use base64 URL
      const reader = new FileReader()
      reader.onload = async () => {
        const url = reader.result as string
        setPerfil({ ...perfil, foto_url: url })
        await supabase.from('eb_perfis_aluno').update({ foto_url: url }).eq('id', perfil.id)
      }
      reader.readAsDataURL(file)
      return
    }

    const { data: publicUrl } = supabase.storage.from('avatars').getPublicUrl(path)
    setPerfil({ ...perfil, foto_url: publicUrl.publicUrl })
    await supabase.from('eb_perfis_aluno').update({ foto_url: publicUrl.publicUrl }).eq('id', perfil.id)
  }

  function updateField(field: keyof PerfilAluno, value: string) {
    if (!perfil) return
    setPerfil({ ...perfil, [field]: value || null })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-green-200 border-t-green-600 rounded-full animate-spin" />
      </div>
    )
  }

  if (!perfil) return null

  const initial = perfil.nome?.charAt(0).toUpperCase() || 'A'
  const completionPct = [perfil.nome, perfil.data_nascimento, perfil.sexo, perfil.telefone, perfil.cidade, perfil.foto_url]
    .filter(Boolean).length
  const completionTotal = 6
  const completionPercent = Math.round((completionPct / completionTotal) * 100)

  return (
    <div className="min-h-screen bg-gray-50 py-6 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Back */}
        <button onClick={() => navigate('/portal')} className="text-sm text-gray-500 hover:text-green-600 flex items-center gap-1">
          &larr; Voltar ao portal
        </button>

        {/* Profile completion alert */}
        {!perfil.perfil_completo && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
            <HiOutlineInformationCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-800">Complete seu perfil</p>
              <p className="text-xs text-amber-600 mt-0.5">Preencha seus dados para uma experiência completa na Escola Bíblica.</p>
              <div className="mt-2 flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-amber-200 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500 rounded-full transition-all" style={{ width: `${completionPercent}%` }} />
                </div>
                <span className="text-xs font-medium text-amber-700">{completionPercent}%</span>
              </div>
            </div>
          </div>
        )}

        {/* Photo + Name Header */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Banner */}
          <div className="h-24 bg-gradient-to-r from-green-600 via-green-500 to-emerald-500" />

          <div className="px-6 pb-6 -mt-12">
            {/* Avatar */}
            <div className="relative inline-block">
              {perfil.foto_url ? (
                <img src={perfil.foto_url} alt="" className="w-24 h-24 rounded-2xl object-cover border-4 border-white shadow-lg" />
              ) : (
                <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 text-white flex items-center justify-center text-3xl font-bold border-4 border-white shadow-lg">
                  {initial}
                </div>
              )}
              <button onClick={() => fileRef.current?.click()}
                className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-white border-2 border-gray-200 flex items-center justify-center text-gray-500 hover:text-green-600 hover:border-green-300 transition-colors shadow-sm">
                <HiOutlineCamera className="w-4 h-4" />
              </button>
              <input ref={fileRef} type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
            </div>

            {/* Photo guidelines */}
            <p className="text-[10px] text-gray-400 mt-1 ml-1">
              Foto quadrada recomendada (1:1). JPG ou PNG, max 2MB.
            </p>

            <div className="mt-3 flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold text-gray-900">{perfil.nome}</h1>
                <p className="text-sm text-gray-500">{perfil.email}</p>
              </div>
              {!editing ? (
                <button onClick={() => setEditing(true)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-green-50 text-green-700 rounded-xl text-sm font-medium hover:bg-green-100 transition-colors">
                  <HiOutlinePencil className="w-4 h-4" /> Editar
                </button>
              ) : (
                <button onClick={savePerfil} disabled={saving}
                  className="flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50">
                  {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <HiOutlineCheck className="w-4 h-4" />}
                  Salvar
                </button>
              )}
            </div>
            {saved && <p className="text-xs text-green-600 mt-2">Perfil salvo com sucesso!</p>}
          </div>
        </div>

        {/* Personal Data */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
          <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2">
            <HiOutlineUser className="w-4 h-4 text-green-600" /> Dados Pessoais
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FieldInput label="Nome completo" icon={HiOutlineUser} value={perfil.nome}
              onChange={v => updateField('nome', v)} editing={editing} />
            <FieldInput label="E-mail" icon={HiOutlineMail} value={perfil.email || ''} disabled
              onChange={() => {}} editing={false} />
            <FieldInput label="Telefone" icon={HiOutlinePhone} value={perfil.telefone || ''}
              onChange={v => updateField('telefone', v)} editing={editing} placeholder="(00) 00000-0000" />
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1.5 flex items-center gap-1.5">
                <HiOutlineCalendar className="w-3.5 h-3.5 text-gray-400" /> Data de nascimento
              </label>
              {editing ? (
                <input type="date" value={perfil.data_nascimento || ''}
                  onChange={e => updateField('data_nascimento', e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 focus:ring-2 focus:ring-green-500/30 focus:border-green-500 outline-none" />
              ) : (
                <p className="text-sm text-gray-800 py-2.5">
                  {perfil.data_nascimento ? new Date(perfil.data_nascimento + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}
                </p>
              )}
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1.5 block">Sexo</label>
              {editing ? (
                <select value={perfil.sexo || ''} onChange={e => updateField('sexo', e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 focus:ring-2 focus:ring-green-500/30 focus:border-green-500 outline-none">
                  <option value="">Selecione...</option>
                  <option value="masculino">Masculino</option>
                  <option value="feminino">Feminino</option>
                </select>
              ) : (
                <p className="text-sm text-gray-800 py-2.5 capitalize">{perfil.sexo || '—'}</p>
              )}
            </div>
          </div>
        </div>

        {/* Location */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
          <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2">
            <HiOutlineLocationMarker className="w-4 h-4 text-green-600" /> Localização
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FieldInput label="Cidade" icon={HiOutlineLocationMarker} value={perfil.cidade || ''}
              onChange={v => updateField('cidade', v)} editing={editing} />
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1.5 block">Estado</label>
              {editing ? (
                <select value={perfil.estado || ''} onChange={e => updateField('estado', e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 focus:ring-2 focus:ring-green-500/30 focus:border-green-500 outline-none">
                  <option value="">Selecione...</option>
                  {['AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO'].map(uf =>
                    <option key={uf} value={uf}>{uf}</option>
                  )}
                </select>
              ) : (
                <p className="text-sm text-gray-800 py-2.5">{perfil.estado || '—'}</p>
              )}
            </div>
            <FieldInput label="Igreja que frequenta" icon={HiOutlineOfficeBuilding} value={perfil.igreja_nome || ''}
              onChange={v => updateField('igreja_nome', v)} editing={editing} />
          </div>
        </div>

        {/* Bio */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-3">
          <h2 className="text-sm font-bold text-gray-800">Sobre mim</h2>
          {editing ? (
            <textarea value={perfil.bio || ''} onChange={e => updateField('bio', e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-green-500/30 focus:border-green-500 outline-none min-h-[80px]"
              placeholder="Conte um pouco sobre você, seu testemunho, suas motivações para estudar a Bíblia..." />
          ) : (
            <p className="text-sm text-gray-700">{perfil.bio || 'Nenhuma informação adicionada.'}</p>
          )}
        </div>
      </div>
    </div>
  )
}

// ===== Field Component =====
function FieldInput({ label, icon: Icon, value, onChange, editing, disabled, placeholder }: {
  label: string; icon: any; value: string; onChange: (v: string) => void
  editing: boolean; disabled?: boolean; placeholder?: string
}) {
  return (
    <div>
      <label className="text-xs font-medium text-gray-600 mb-1.5 flex items-center gap-1.5">
        <Icon className="w-3.5 h-3.5 text-gray-400" /> {label}
      </label>
      {editing && !disabled ? (
        <input type="text" value={value} onChange={e => onChange(e.target.value)}
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-green-500/30 focus:border-green-500 outline-none"
          placeholder={placeholder} />
      ) : (
        <p className="text-sm text-gray-800 py-2.5">{value || '—'}</p>
      )}
    </div>
  )
}
