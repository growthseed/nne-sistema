import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { trackEvent, trackError } from '@/lib/observability'

// Invokes a Supabase Edge Function with retry + friendly error messages.
// The default supabase-js error "Failed to send a request to the Edge Function"
// (FunctionsFetchError) is opaque to the user — here we retry transient network
// failures and translate the message.
async function invokeWithRetry<T = any>(
  fnName: string,
  body: unknown,
  retries = 2,
): Promise<T> {
  let lastError: any
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const { data, error } = await supabase.functions.invoke(fnName, { body: body as Record<string, unknown> })
      if (error) {
        // FunctionsHttpError carries a Response on .context — try to read JSON message
        const ctx = (error as any).context
        if (ctx && typeof ctx.json === 'function') {
          try {
            const parsed = await ctx.json()
            if (parsed?.message) throw new Error(parsed.message)
          } catch { /* ignore parse errors */ }
        }
        throw error
      }
      return data as T
    } catch (err: any) {
      lastError = err
      const isNetworkError =
        err?.name === 'FunctionsFetchError' ||
        /Failed to send|network|fetch/i.test(err?.message || '')
      if (!isNetworkError || attempt === retries) break
      await new Promise(r => setTimeout(r, 600 * (attempt + 1)))
    }
  }
  if (/Failed to send|FunctionsFetchError/i.test(lastError?.message || '') ||
      lastError?.name === 'FunctionsFetchError') {
    throw new Error('Sem conexão com o servidor. Verifique sua internet e tente novamente.')
  }
  throw lastError
}
import {
  HiOutlineCursorClick,
  HiOutlineClock,
  HiOutlineLockClosed,
  HiOutlineSparkles,
  HiOutlineUser,
  HiOutlineIdentification,
  HiOutlineClipboardList,
  HiOutlineCalendar,
  HiOutlineChatAlt2,
  HiOutlineLocationMarker,
  HiOutlineCheckCircle,
  HiOutlineEmojiHappy,
  HiOutlineStar,
  HiOutlineLightBulb,
} from 'react-icons/hi'
import type { IconType } from 'react-icons'

// ========== TYPES ==========
interface FormData {
  [key: string]: any
}

interface Igreja {
  id: string
  nome: string
  endereco_cidade: string | null
  endereco_estado: string | null
  associacao_id: string | null
  uniao_id: string | null
}

// ========== CONSTANTS ==========
const TOTAL_STEPS = 12
const STORAGE_KEY = 'nne_pesquisa_rascunho'

const PROFISSOES = [
  'Administrador(a)','Advogado(a)','Agricultor(a)','Analista de Sistemas','Arquiteto(a)',
  'Assistente Administrativo','Assistente Social','Autônomo(a)','Auxiliar de Escritório',
  'Bancário(a)','Barbeiro(a)','Bibliotecário(a)','Cabeleireiro(a)','Carpinteiro(a)',
  'Comerciante','Contador(a)','Cozinheiro(a)','Dentista','Designer','Do Lar',
  'Eletricista','Empresário(a)','Enfermeiro(a)','Engenheiro(a)','Estudante',
  'Farmacêutico(a)','Fisioterapeuta','Funcionário(a) Público(a)','Gerente',
  'Jornalista','Marceneiro(a)','Mecânico(a)','Médico(a)','Militar','Motorista',
  'Nutricionista','Operador(a) de Máquinas','Pastor(a)','Pedagogo(a)','Pedreiro(a)',
  'Pintor(a)','Policial','Professor(a)','Programador(a)','Psicólogo(a)',
  'Recepcionista','Secretário(a)','Segurança','Servidor(a) Público(a)',
  'Técnico(a) de Enfermagem','Técnico(a) em Informática','Vendedor(a)','Veterinário(a)',
  'Aposentado(a)','Desempregado(a)','Outro',
]

const SATISFACAO_ITENS = [
  'Culto Divino','Escola Sabatina','Culto de Domingo','Culto de quarta-feira',
  'Pequenos grupos','Música em geral','Visão missionária','Departamento Infantil',
  'Área social','Área administrativa','Evangelização','Integração social',
  'Departamento Jovem','Programa da terceira idade',
]

const FREQUENCIA_ITENS = [
  'Escola Sabatina','Culto Divino','Culto de Domingo','Culto de quarta-feira',
  'Pequenos grupos','Atividades missionárias durante a semana',
]

const ENFASES_OPTIONS = [
  'Treinamento de líderes','Recreação','Cultos de oração','Crianças','Adolescentes',
  'Terceira idade','Visitação','Estudo bíblico','Área financeira','Doutrinamento',
  'Sustento de missionários','Ampliação do espaço físico','Saúde dos membros',
  'Assistência aos novos convertidos','Discipulado','Ação social','Evangelismo',
  'Evangelismo digital','Jovens','Música','Ministério com famílias',
  'Programa de rádio e TV','Área para retiro','Integração/comunhão dos membros','Administração',
]

const CARGOS_OPTIONS = [
  'Diácono/Diaconisa','Diretor(a) de Escola Sabatina','Professor(a) de Escola Sabatina',
  'Tesoureiro(a)','Secretário(a)','Líder de Jovens','Líder de Crianças',
  'Músico/Cantor','Sonoplastia/Multimídia','Evangelismo','Nenhum cargo','Outro',
]

const UFS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO']

// ========== COMPONENT ==========
export default function CadastroPublicoPage() {
  const [step, setStep] = useState(0)
  const [form, setForm] = useState<FormData>({})
  const [igrejas, setIgrejas] = useState<Igreja[]>([])
  const [igrejaSearch, setIgrejaSearch] = useState('')
  const [showIgrejaDropdown, setShowIgrejaDropdown] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [showLgpd, setShowLgpd] = useState(false)
  const [responseId, setResponseId] = useState<string | null>(null)
  const [draftToken, setDraftToken] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<string | null>(null)
  const [showResumePrompt, setShowResumePrompt] = useState(false)
  const [stepError, setStepError] = useState('')
  const savingRef = useRef(false)
  useEffect(() => {
    fetchIgrejas()
    checkSavedDraft()
  }, [])

  function checkSavedDraft() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const draft = JSON.parse(saved)
        if (draft.responseId && draft.draftToken && draft.form && draft.step > 0) {
          setShowResumePrompt(true)
        }
      }
    } catch { /* ignore */ }
  }

  function resumeDraft() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const draft = JSON.parse(saved)
        setResponseId(draft.responseId)
        setDraftToken(draft.draftToken)
        setForm(draft.form)
        setStep(draft.step)
        if (draft.igrejaSearch) setIgrejaSearch(draft.igrejaSearch)
      }
    } catch { /* ignore */ }
    setShowResumePrompt(false)
  }

  function discardDraft() {
    localStorage.removeItem(STORAGE_KEY)
    setResponseId(null)
    setDraftToken(null)
    setShowResumePrompt(false)
  }

  async function fetchIgrejas() {
    const { data } = await supabase
      .from('igrejas')
      .select('id, nome, endereco_cidade, endereco_estado, associacao_id, uniao_id')
      .eq('ativo', true)
      .order('nome')
    if (data) setIgrejas(data as Igreja[])
  }

  function set(field: string, value: any) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function persistDraftLocally(nextResponseId: string, nextDraftToken: string, targetStep: number) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      responseId: nextResponseId,
      draftToken: nextDraftToken,
      form,
      step: targetStep,
      igrejaSearch,
    }))
  }

  async function buscarCep(cepRaw: string) {
    const cep = cepRaw.replace(/\D/g, '')
    if (cep.length !== 8) return
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`)
      const data = await res.json()
      if (!data.erro) {
        setForm(prev => ({
          ...prev,
          endereco: data.logradouro || prev.endereco,
          bairro: data.bairro || prev.bairro,
          cidade: data.localidade || prev.cidade,
          estado: data.uf || prev.estado,
        }))
      }
    } catch { /* silently fail */ }
  }

  function updateDateFromParts(dia?: string, mes?: string, ano?: string) {
    if (dia && mes && ano) {
      setForm(prev => ({ ...prev, dataNascimento: `${ano}-${mes}-${dia}` }))
    }
  }

  function toggle(field: string, value: string) {
    const arr: string[] = form[field] || []
    set(field, arr.includes(value) ? arr.filter((v: string) => v !== value) : [...arr, value])
  }

  // Build the DB payload from current form state
  const buildPayload = useCallback((targetStep: number, complete = false) => {
    const satisfacao: Record<string, number> = {}
    SATISFACAO_ITENS.forEach(item => {
      const key = `sat_${item.replace(/\s/g, '_').toLowerCase()}`
      if (form[key]) satisfacao[item] = Number(form[key])
    })

    const participacao: Record<string, number> = {}
    FREQUENCIA_ITENS.forEach(item => {
      const key = `freq_${item.replace(/\s/g, '_').toLowerCase()}`
      if (form[key] !== undefined) participacao[item] = Number(form[key])
    })

    // Lookup church hierarchy
    const selectedIgreja = igrejas.find(ig => ig.id === form.igrejaId)

    return {
      lgpd_aceite: true,
      lgpd_timestamp: new Date().toISOString(),
      nome: form.nome || null,
      email: form.email || null,
      telefone: form.telefone || null,
      whatsapp_parente: form.whatsappParente || null,
      whatsapp_parente_nome: form.whatsappParenteNome || null,
      whatsapp_parente_parentesco: form.whatsappParenteParentesco || null,
      cep: form.cep || null,
      rua: form.endereco || null,
      numero: form.numero || null,
      bairro: form.bairro || null,
      cidade: form.cidade || null,
      estado: form.estado || null,
      data_nascimento: form.dataNascimento || null,
      sexo: form.sexo === 'M' ? 'masculino' : form.sexo === 'F' ? 'feminino' : null,
      faixa_etaria: form.faixaIdade || null,
      estado_civil: form.estadoCivil || null,
      escolaridade: form.escolaridade || null,
      profissao: form.profissao || null,
      tempo_membro: form.tempoMembro || null,
      como_conheceu: form.primeiroContato || null,
      como_conheceu_outro: form.primeiroContatoOutro || null,
      distancia_igreja: form.distanciaIgreja || null,
      meio_transporte: form.transporte || null,
      igreja_id: form.igrejaId || null,
      associacao_id: selectedIgreja?.associacao_id || null,
      uniao_id: selectedIgreja?.uniao_id || null,
      pontos_fortes: [form.pontoForte1, form.pontoForte2, form.pontoForte3].filter(Boolean),
      pontos_fracos: [form.pontoFraco1, form.pontoFraco2, form.pontoFraco3].filter(Boolean),
      cargos_ocupa: form.cargos || [],
      satisfacao,
      prioridades: form.enfases || [],
      participacao,
      influencias: form.influencias || [],
      influencias_outro: form.influenciasOutro || null,
      tempo_deslocamento: form.tempoDeslocamento || null,
      opiniao_estrutura: form.opiniaoEstrutura || null,
      sugestoes: [form.sugestao1, form.sugestao2, form.sugestao3].filter(Boolean),
      coisas_criar: [form.criar1, form.criar2, form.criar3].filter(Boolean),
      coisas_alterar: [form.alterar1, form.alterar2, form.alterar3].filter(Boolean),
      enfase_justificativa: form.enfaseJustificativa || null,
      motivacao_contribuir: form.motivadoContribuir || null,
      tipo_contribuinte: form.tipoContribuinte || null,
      opiniao_departamentos: form.observacoes || null,
      etapa_atual: targetStep,
      completo: complete,
    }
  }, [form, igrejas])

  // Auto-save to DB
  async function autoSave(targetStep: number) {
    if (savingRef.current) return
    savingRef.current = true
    setSaving(true)

    try {
      const payload = buildPayload(targetStep)
      const data = await invokeWithRetry<{ success: boolean; id?: string; draftToken?: string; message?: string }>(
        'save-public-cadastro',
        { responseId, draftToken, payload, complete: false },
      )

      if (!data?.success || !data?.id || !data?.draftToken) {
        throw new Error(data?.message || 'Não foi possível salvar o rascunho.')
      }

      setResponseId(data.id)
      setDraftToken(data.draftToken)
      persistDraftLocally(data.id, data.draftToken, targetStep)

      setLastSaved(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }))
    } catch (err) {
      console.error('Erro ao salvar rascunho:', err)
    } finally {
      savingRef.current = false
      setSaving(false)
    }
  }

  async function next() {
    // Validate current step before advancing (skip step 0 = welcome)
    if (step >= 1) {
      const validationMsg = validateStep(step)
      if (validationMsg) {
        setStepError(validationMsg)
        window.scrollTo({ top: 0, behavior: 'smooth' })
        return
      }
    }
    setStepError('')
    const nextStep = Math.min(step + 1, TOTAL_STEPS - 1)
    setStep(nextStep)
    window.scrollTo({ top: 0, behavior: 'smooth' })
    // Auto-save from step 2 onwards
    if (nextStep >= 2) {
      await autoSave(nextStep)
    }
  }

  function prev() {
    setStep(s => Math.max(s - 1, 0))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Validation per step - returns error message or empty string
  function validateStep(s: number): string {
    switch (s) {
      case 1:
        if (!form.nome?.trim()) return 'Preencha seu nome completo'
        if (!form.telefone?.trim()) return 'Preencha seu WhatsApp'
        if (!form.email?.trim()) return 'Preencha seu e-mail'
        if (form.usarWhatsappParente) {
          if (!form.whatsappParente?.trim()) return 'Preencha o WhatsApp do parente'
          if (!form.whatsappParenteNome?.trim()) return 'Preencha o nome do parente'
          if (!form.whatsappParenteParentesco) return 'Selecione o parentesco'
        }
        return ''
      case 2:
        if (!form.dataNascimento) return 'Informe sua data de nascimento'
        if (!form.sexo) return 'Selecione seu sexo'
        return ''
      case 3:
        if (!form.estadoCivil) return 'Selecione seu estado civil'
        if (!form.escolaridade) return 'Selecione sua escolaridade'
        if (!form.profissao) return 'Selecione sua profissão'
        return ''
      case 4:
        if (!form.tempoMembro) return 'Informe há quanto tempo é membro'
        return ''
      case 5:
        if (!form.primeiroContato) return 'Selecione como foi seu primeiro contato'
        if (!(form.influencias?.length > 0)) return 'Selecione pelo menos uma influência'
        return ''
      case 6:
        if (!form.distanciaIgreja) return 'Selecione a distância até a igreja'
        if (!form.transporte) return 'Selecione como chega à igreja'
        if (!form.tempoDeslocamento) return 'Selecione o tempo de deslocamento'
        if (!form.igrejaId) return 'Selecione sua igreja'
        return ''
      case 7:
        if (!form.pontoForte1?.trim()) return 'Informe pelo menos um ponto forte'
        if (!form.pontoFraco1?.trim()) return 'Informe pelo menos um ponto fraco'
        return ''
      case 8: {
        const missing = SATISFACAO_ITENS.find(item => {
          const key = `sat_${item.replace(/\s/g, '_').toLowerCase()}`
          return !form[key]
        })
        if (missing) return `Avalie "${missing}"`
        return ''
      }
      case 9:
        if (!(form.enfases?.length >= 3)) return 'Selecione no mínimo 3 prioridades'
        return ''
      case 10: {
        const missingFreq = FREQUENCIA_ITENS.find(item => {
          const key = `freq_${item.replace(/\s/g, '_').toLowerCase()}`
          return form[key] === undefined || form[key] === ''
        })
        if (missingFreq) return `Informe a frequência de "${missingFreq}"`
        if (!form.motivadoContribuir) return 'Selecione seu nível de motivação'
        if (!form.tipoContribuinte) return 'Selecione como tem contribuído'
        return ''
      }
      case 11:
        // Etapa final: opinião sobre estrutura é OPCIONAL.
        // Antes era obrigatória e causava travamento - 25 usuários chegaram até aqui
        // mas não puderam finalizar por não quererem opinar. Agora é opcional.
        return ''
      default:
        return ''
    }
  }

  async function handleSubmit() {
    // Final validation of step 11
    const validationError = validateStep(11)
    if (validationError) {
      setError(validationError)
      return
    }

    setSubmitting(true)
    setError('')
    try {
      const payload = buildPayload(TOTAL_STEPS, true)
      const data = await invokeWithRetry<{ success: boolean; id?: string; message?: string }>(
        'save-public-cadastro',
        { responseId, draftToken, payload, complete: true },
      )

      if (!data?.success) {
        throw new Error(data?.message || 'Não foi possível enviar o formulário.')
      }

      trackEvent('cadastro_publico_sucesso', { responseId: data.id })

      // Clear draft from localStorage
      localStorage.removeItem(STORAGE_KEY)
      setResponseId(null)
      setDraftToken(null)
      setSuccess(true)
    } catch (err: any) {
      trackError(err, { context: 'cadastro_publico_submit', responseId: responseId ?? undefined })
      setError(err.message || 'Erro ao enviar formulário')
    } finally {
      setSubmitting(false)
    }
  }

  // Manual save button handler
  async function handleSaveDraft() {
    await autoSave(step)
  }

  const filteredIgrejas = igrejas.filter(ig =>
    ig.nome.toLowerCase().includes(igrejaSearch.toLowerCase()) ||
    (ig.endereco_cidade || '').toLowerCase().includes(igrejaSearch.toLowerCase())
  )

  // ========== RESUME PROMPT ==========
  if (showResumePrompt) {
    return (
      <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Pesquisa em andamento</h2>
          <p className="text-gray-500 mb-6">Encontramos uma pesquisa que você não finalizou. Deseja continuar de onde parou?</p>
          <div className="flex gap-3">
            <button onClick={discardDraft} className="flex-1 px-4 py-3 rounded-xl border-2 border-gray-200 text-gray-600 font-semibold hover:bg-gray-50 transition-colors">
              Iniciar Nova
            </button>
            <button onClick={resumeDraft} className="flex-1 bg-[#006D43] text-white px-4 py-3 rounded-xl font-semibold hover:bg-[#005535] transition-colors">
              Continuar
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ========== SUCCESS SCREEN ==========
  if (success) {
    return (
      <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-[#006D43] rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-[#006D43] mb-3">Cadastro Enviado!</h2>
          <p className="text-gray-500 mb-6">Em breve entraremos em contato. Obrigado por participar!</p>
          <button onClick={() => { setSuccess(false); setStep(0); setForm({}); setResponseId(null); setDraftToken(null); setLastSaved(null); setError(''); setStepError('') }} className="bg-[#006D43] text-white px-6 py-3 rounded-xl font-semibold hover:bg-[#005535] transition-colors">
            Fazer Novo Cadastro
          </button>
        </div>
      </div>
    )
  }

  // ========== RENDER ==========
  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      {/* Header */}
      <header className="bg-white text-center py-6 border-b-[3px] border-[#006D43]">
        <img src="/img/logo-nne.png" alt="União Norte Nordeste" className="mx-auto h-14 mb-3" />
        <h1 className="text-2xl font-bold text-[#006D43]">Planejando o Crescimento</h1>
        <p className="text-gray-700 text-sm mt-1">Igreja Adventista do Sétimo Dia Movimento de Reforma</p>
        <small className="text-gray-500 text-xs">Para membros e interessados</small>
      </header>

      <div className="max-w-[700px] mx-auto px-4 py-6">
        {/* Progress - hidden on welcome step */}
        {step > 0 && (
          <>
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-400 text-sm">Etapa {step} de {TOTAL_STEPS - 1}</p>
              {/* Auto-save indicator */}
              <div className="flex items-center gap-2">
                {saving && (
                  <span className="text-xs text-gray-400 flex items-center gap-1">
                    <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                    Salvando...
                  </span>
                )}
                {!saving && lastSaved && (
                  <span className="text-xs text-green-600 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    Salvo {lastSaved}
                  </span>
                )}
              </div>
            </div>
            <div className="h-1.5 bg-gray-200 rounded-full mb-6 overflow-hidden">
              <div className="h-full bg-[#006D43] rounded-full transition-all duration-500" style={{ width: `${(step / (TOTAL_STEPS - 1)) * 100}%` }} />
            </div>
          </>
        )}

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-6 sm:p-8">

          {/* ===== STEP 0: WELCOME / BOAS-VINDAS ===== */}
          {step === 0 && (
            <div>
              {/* Hero */}
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-[#006D43] to-[#00a368] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-green-200">
                  <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Bem-vindo(a)!</h2>
                <p className="text-gray-500 mt-1">Estamos felizes com a sua participação</p>
              </div>

              {/* Objective Card */}
              <div className="bg-gradient-to-br from-[#006D43] to-[#008a55] rounded-2xl p-5 text-white mb-5">
                <h4 className="font-bold text-lg mb-2">Sobre esta pesquisa</h4>
                <p className="text-green-100 text-sm leading-relaxed">
                  O projeto <strong className="text-white">Planejando o Crescimento</strong> tem como objetivo ouvir você, membro e interessado, para entendermos
                  melhor as necessidades, desafios e oportunidades da nossa igreja. Suas respostas serão fundamentais
                  para traçar estratégias que promovam o <strong className="text-white">crescimento espiritual, organizacional e missionário</strong> das
                  congregações da União Norte-Nordeste.
                </p>
              </div>

              {/* Gatilhos - Benefit Cards */}
              <div className="grid grid-cols-2 gap-3 mb-5">
                <BenefitCard
                  Icon={HiOutlineCursorClick}
                  title="Sua voz importa"
                  desc="Cada resposta ajuda a moldar o futuro da sua igreja"
                />
                <BenefitCard
                  Icon={HiOutlineClock}
                  title="5 a 8 minutos"
                  desc="Rápido e fácil de responder"
                />
                <BenefitCard
                  Icon={HiOutlineLockClosed}
                  title="100% Confidencial"
                  desc="Dados protegidos pela LGPD"
                />
                <BenefitCard
                  Icon={HiOutlineSparkles}
                  title="Impacto real"
                  desc="Resultados aplicados diretamente nas congregações"
                />
              </div>

              {/* How it works */}
              <div className="bg-gray-50 rounded-xl p-5 mb-5">
                <h5 className="font-bold text-gray-800 text-sm mb-3">Como funciona?</h5>
                <div className="space-y-3">
                  {[
                    ['1', 'Dados pessoais', 'Identificação e contato básico'],
                    ['2', 'Sua jornada', 'Como conheceu a igreja e seu tempo de membro'],
                    ['3', 'Sua opinião', 'Avalie atividades, aponte pontos fortes e fracos'],
                    ['4', 'Sugestões', 'Deixe ideias para o crescimento da igreja'],
                  ].map(([num, title, desc]) => (
                    <div key={num} className="flex items-start gap-3">
                      <span className="w-7 h-7 rounded-full bg-[#006D43] text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{num}</span>
                      <div>
                        <p className="font-semibold text-gray-800 text-sm">{title}</p>
                        <p className="text-gray-500 text-xs">{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Auto-save info */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4 text-sm text-blue-800">
                <strong>Suas respostas são salvas automaticamente</strong> a cada etapa. Você pode sair e continuar depois sem perder o que já respondeu.
              </div>

              {/* LGPD Accordion */}
              <div className="border border-gray-200 rounded-xl overflow-hidden mb-4">
                <button
                  type="button"
                  onClick={() => setShowLgpd(!showLgpd)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                >
                  <span className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <svg className="w-4 h-4 text-[#006D43]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                    Política de Privacidade (LGPD)
                  </span>
                  <svg className={`w-4 h-4 text-gray-500 transition-transform ${showLgpd ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </button>

                {showLgpd && (
                  <div className="px-4 py-4 max-h-[350px] overflow-y-auto text-sm leading-relaxed border-t border-gray-200">
                    <h5 className="text-[#006D43] font-bold mb-3">Política de Privacidade e Proteção de Dados</h5>
                    <p className="text-gray-500 italic text-xs mb-4 pb-3 border-b border-gray-200">Em conformidade com a Lei Geral de Proteção de Dados Pessoais (Lei nº 13.709/2018 - LGPD)</p>

                    <h6 className="font-bold text-gray-800 mt-4 mb-2">1. Identificação do Controlador de Dados</h6>
                    <div className="bg-gradient-to-r from-green-50 to-green-100 border-l-4 border-[#006D43] p-4 rounded-r-lg text-xs mb-3">
                      <p><strong>Razão Social:</strong> União Missionária Norte-Nordeste Brasileira dos Adventistas do Sétimo Dia Movimento de Reforma</p>
                      <p><strong>Nome Fantasia:</strong> União Norte-Nordeste</p>
                      <p><strong>CNPJ:</strong> 62.080.902/0001-32</p>
                      <p><strong>Endereço:</strong> Rua Coronel Aluísio Borba, 505, Sala A - CEP 60.813-730 - Fortaleza/CE</p>
                      <p><strong>Contato DPO:</strong> tesouraria@uniaonorte.org.br</p>
                      <p><strong>Telefone:</strong> (61) 9994-2995 | (61) 8222-0044</p>
                    </div>

                    <h6 className="font-bold text-gray-800 mt-4 mb-2">2. Público Destinatário</h6>
                    <p>Este formulário de pesquisa é destinado exclusivamente a <strong>membros batizados, interessados regulares e simpatizantes</strong> da Igreja Adventista do Sétimo Dia Movimento de Reforma, vinculados às congregações sob jurisdição da União Norte-Nordeste.</p>

                    <h6 className="font-bold text-gray-800 mt-4 mb-2">3. Base Legal para Tratamento (Art. 7º da LGPD)</h6>
                    <ul className="list-disc pl-5 space-y-1">
                      <li><strong>Consentimento do titular (Art. 7º, I):</strong> Ao preencher este formulário e marcar a caixa de aceite, você manifesta seu consentimento livre, informado e inequívoco.</li>
                      <li><strong>Execução de atividades religiosas (Art. 7º, IX):</strong> O tratamento é necessário para atender aos interesses legítimos do controlador.</li>
                      <li><strong>Cumprimento de obrigação legal (Art. 7º, II):</strong> Manutenção de registros eclesiásticos conforme estatuto social.</li>
                    </ul>

                    <h6 className="font-bold text-gray-800 mt-4 mb-2">4. Categorias de Dados Coletados</h6>
                    <table className="w-full border-collapse text-xs mb-3">
                      <thead><tr className="bg-[#006D43] text-white"><th className="p-2 text-left">Categoria</th><th className="p-2 text-left">Dados</th><th className="p-2 text-left">Finalidade</th></tr></thead>
                      <tbody className="divide-y divide-gray-200">
                        <tr><td className="p-2 font-semibold">Identificação</td><td className="p-2">Nome, e-mail, telefone</td><td className="p-2">Identificação e comunicação</td></tr>
                        <tr><td className="p-2 font-semibold">Localização</td><td className="p-2">Endereço, CEP, cidade, estado</td><td className="p-2">Vinculação à congregação local</td></tr>
                        <tr><td className="p-2 font-semibold">Perfil Demográfico</td><td className="p-2">Idade, gênero, estado civil, escolaridade</td><td className="p-2">Análise estatística e planejamento</td></tr>
                        <tr><td className="p-2 font-semibold">Dados Eclesiásticos</td><td className="p-2">Igreja, tempo de membro, cargos</td><td className="p-2">Gestão e assistência pastoral</td></tr>
                        <tr><td className="p-2 font-semibold">Opinativos</td><td className="p-2">Respostas da pesquisa, sugestões</td><td className="p-2">Melhoria dos serviços religiosos</td></tr>
                      </tbody>
                    </table>

                    <h6 className="font-bold text-gray-800 mt-4 mb-2">5. Finalidades do Tratamento</h6>
                    <ul className="list-disc pl-5 space-y-1">
                      <li><strong>Gestão Eclesiástica:</strong> Cadastro e acompanhamento de membros</li>
                      <li><strong>Comunicação Institucional:</strong> Informações sobre cultos e eventos</li>
                      <li><strong>Assistência Pastoral:</strong> Acompanhamento espiritual e visitas</li>
                      <li><strong>Pesquisa Interna:</strong> Análise estatística para planejamento</li>
                      <li><strong>Relatórios Denominacionais:</strong> Relatórios para instâncias superiores</li>
                    </ul>

                    <h6 className="font-bold text-gray-800 mt-4 mb-2">6. Compartilhamento de Dados</h6>
                    <p>Seus dados <strong>NUNCA</strong> serão vendidos ou compartilhados com terceiros para fins comerciais.</p>

                    <h6 className="font-bold text-gray-800 mt-4 mb-2">7. Seus Direitos (Arts. 17 a 22 da LGPD)</h6>
                    <p>Você tem direito a: Acesso, Correção, Eliminação, Portabilidade, Informação e Revogação do consentimento.</p>
                    <p className="mt-2"><strong>Contato DPO:</strong> tesouraria@uniaonorte.org.br | (61) 9994-2995</p>
                  </div>
                )}
              </div>

              {/* LGPD Acceptance */}
              <label className="flex items-start gap-3 p-4 bg-green-50 border-2 border-green-200 rounded-xl cursor-pointer hover:border-[#006D43] transition-colors">
                <input type="checkbox" checked={!!form.aceite_lgpd} onChange={e => set('aceite_lgpd', e.target.checked)} className="w-5 h-5 mt-0.5 accent-[#006D43] shrink-0" />
                <span className="text-sm text-gray-700">Li e concordo com a <button type="button" onClick={(e) => { e.preventDefault(); setShowLgpd(true) }} className="text-[#006D43] font-semibold underline">Política de Privacidade</button> e autorizo o tratamento dos meus dados conforme a LGPD.</span>
              </label>

              {/* CTA */}
              <button
                onClick={form.aceite_lgpd ? next : undefined}
                disabled={!form.aceite_lgpd}
                className="w-full mt-5 bg-gradient-to-r from-[#006D43] to-[#008a55] text-white py-4 rounded-xl font-bold text-lg hover:from-[#005535] hover:to-[#007a4a] transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-green-200 disabled:shadow-none"
              >
                Iniciar Pesquisa
              </button>
              {!form.aceite_lgpd && (
                <p className="text-center text-xs text-gray-400 mt-2">Aceite os termos de privacidade para continuar</p>
              )}
            </div>
          )}

          {/* ===== STEP 1: IDENTIFICAÇÃO E CONTATO ===== */}
          {step === 1 && (
            <div>
              <StepHeader Icon={HiOutlineUser} title="Identificação e Contato" subtitle="Informe seus dados pessoais e de contato" />

              <Field label="Nome Completo *">
                <input type="text" value={form.nome || ''} onChange={e => set('nome', e.target.value)} placeholder="Seu nome completo" className="inp" />
              </Field>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
                <Field label="WhatsApp *">
                  <input type="tel" value={form.telefone || ''} onChange={e => set('telefone', e.target.value)} placeholder="(00) 00000-0000" className="inp" />
                </Field>
                <Field label="E-mail *">
                  <input type="email" value={form.email || ''} onChange={e => set('email', e.target.value)} placeholder="seu@email.com" className="inp" />
                </Field>
              </div>

              {/* WhatsApp de parente/responsável */}
              <div className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!form.usarWhatsappParente}
                    onChange={e => set('usarWhatsappParente', e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-700">Não tenho WhatsApp - usar o de um parente/responsável</span>
                </label>

                {form.usarWhatsappParente && (
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <Field label="WhatsApp do parente *">
                      <input type="tel" value={form.whatsappParente || ''} onChange={e => set('whatsappParente', e.target.value)} placeholder="(00) 00000-0000" className="inp" />
                    </Field>
                    <Field label="Nome do parente *">
                      <input type="text" value={form.whatsappParenteNome || ''} onChange={e => set('whatsappParenteNome', e.target.value)} placeholder="Nome completo" className="inp" />
                    </Field>
                    <Field label="Parentesco *">
                      <select value={form.whatsappParenteParentesco || ''} onChange={e => set('whatsappParenteParentesco', e.target.value)} className="inp">
                        <option value="">Selecione</option>
                        <option value="filho_a">Filho(a)</option>
                        <option value="neto_a">Neto(a)</option>
                        <option value="esposo_a">Esposo(a)</option>
                        <option value="irmao_a">Irmão/Irmã</option>
                        <option value="sobrinho_a">Sobrinho(a)</option>
                        <option value="pai_mae">Pai/Mãe</option>
                        <option value="genro_nora">Genro/Nora</option>
                        <option value="amigo">Amigo(a)</option>
                        <option value="outro">Outro</option>
                      </select>
                    </Field>
                  </div>
                )}
              </div>

              <div className="border-t-2 border-gray-100 my-5 pt-5">
                <h5 className="font-bold text-gray-800 mb-3">Endereço</h5>
                <div className="grid grid-cols-3 gap-3">
                  <Field label="CEP"><input type="text" value={form.cep || ''} onChange={e => { const v = e.target.value; set('cep', v); if (v.replace(/\D/g, '').length === 8) buscarCep(v) }} placeholder="00000-000" maxLength={9} className="inp" /></Field>
                  <div className="col-span-2"><Field label="Logradouro"><input type="text" value={form.endereco || ''} onChange={e => set('endereco', e.target.value)} placeholder="Rua, Avenida..." className="inp" /></Field></div>
                </div>
                <div className="grid grid-cols-4 gap-3 mt-3">
                  <Field label="Número"><input type="text" value={form.numero || ''} onChange={e => set('numero', e.target.value)} placeholder="123" className="inp" /></Field>
                  <Field label="Complemento"><input type="text" value={form.complemento || ''} onChange={e => set('complemento', e.target.value)} placeholder="Apto, Bloco..." className="inp" /></Field>
                  <Field label="Bairro"><input type="text" value={form.bairro || ''} onChange={e => set('bairro', e.target.value)} placeholder="Bairro" className="inp" /></Field>
                  <div>{/* spacer */}</div>
                </div>
                <div className="grid grid-cols-3 gap-3 mt-3">
                  <div className="col-span-2"><Field label="Cidade"><input type="text" value={form.cidade || ''} onChange={e => set('cidade', e.target.value)} placeholder="Cidade" className="inp" /></Field></div>
                  <Field label="Estado">
                    <select value={form.estado || ''} onChange={e => set('estado', e.target.value)} className="inp">
                      <option value="">UF</option>
                      {UFS.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                    </select>
                  </Field>
                </div>
              </div>

              <Nav onPrev={prev} onNext={next} onSave={handleSaveDraft} saving={saving} error={stepError} />
            </div>
          )}

          {/* ===== STEP 2: IDENTIFICAÇÃO BÁSICA ===== */}
          {step === 2 && (
            <div>
              <StepHeader Icon={HiOutlineIdentification} title="I. Identificação" subtitle="Informações básicas sobre você" />

              <Field label="1. Data de Nascimento">
                <div className="grid grid-cols-3 gap-2">
                  <select value={form._nascDia || ''} onChange={e => { set('_nascDia', e.target.value); updateDateFromParts(e.target.value, form._nascMes, form._nascAno) }} className="inp">
                    <option value="">Dia</option>
                    {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                      <option key={d} value={String(d).padStart(2, '0')}>{String(d).padStart(2, '0')}</option>
                    ))}
                  </select>
                  <select value={form._nascMes || ''} onChange={e => { set('_nascMes', e.target.value); updateDateFromParts(form._nascDia, e.target.value, form._nascAno) }} className="inp">
                    <option value="">Mês</option>
                    {['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'].map((m, i) => (
                      <option key={i} value={String(i + 1).padStart(2, '0')}>{m}</option>
                    ))}
                  </select>
                  <select value={form._nascAno || ''} onChange={e => { set('_nascAno', e.target.value); updateDateFromParts(form._nascDia, form._nascMes, e.target.value) }} className="inp">
                    <option value="">Ano</option>
                    {Array.from({ length: 100 }, (_, i) => new Date().getFullYear() - i).map(y => (
                      <option key={y} value={String(y)}>{y}</option>
                    ))}
                  </select>
                </div>
              </Field>

              <Field label="2. Sexo" className="mt-4">
                <div className="grid grid-cols-2 gap-3">
                  <OptionCard selected={form.sexo === 'M'} onClick={() => set('sexo', 'M')}>Masculino</OptionCard>
                  <OptionCard selected={form.sexo === 'F'} onClick={() => set('sexo', 'F')}>Feminino</OptionCard>
                </div>
              </Field>

              <Nav onPrev={prev} onNext={next} onSave={handleSaveDraft} saving={saving} error={stepError} />
            </div>
          )}

          {/* ===== STEP 3: ESTADO CIVIL / ESCOLARIDADE / PROFISSÒO ===== */}
          {step === 3 && (
            <div>
              <StepHeader Icon={HiOutlineClipboardList} title="Continuação" subtitle="Mais informações sobre seu perfil" />

              <Field label="3. Estado Civil">
                <div className="grid grid-cols-2 gap-2">
                  {['solteiro','casado','viuvo','divorciado'].map(v => (
                    <OptionCard key={v} selected={form.estadoCivil === v} onClick={() => set('estadoCivil', v)}>
                      {v === 'solteiro' ? 'Solteiro(a)' : v === 'casado' ? 'Casado(a)' : v === 'viuvo' ? 'Viúvo(a)' : 'Divorciado/Separado'}
                    </OptionCard>
                  ))}
                </div>
              </Field>

              <Field label="4. Escolaridade" className="mt-4">
                <div className="grid grid-cols-2 gap-2">
                  {[['fundamental_incompleto','Ensino Fundamental Incompleto'],['fundamental','Ensino Fundamental'],['medio_incompleto','Ensino Médio Incompleto'],['medio_completo','Ensino Médio Completo'],['superior_incompleto','Ensino Superior Incompleto'],['superior_completo','Ensino Superior Completo'],['pos','Pós/Mestrado/Doutorado']].map(([v, l]) => (
                    <OptionCard key={v} selected={form.escolaridade === v} onClick={() => set('escolaridade', v)}>{l}</OptionCard>
                  ))}
                </div>
              </Field>

              <Field label="Profissão" className="mt-4">
                <select value={form.profissao || ''} onChange={e => set('profissao', e.target.value)} className="inp">
                  <option value="">Selecione sua profissão...</option>
                  {PROFISSOES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </Field>

              <Nav onPrev={prev} onNext={next} onSave={handleSaveDraft} saving={saving} error={stepError} />
            </div>
          )}

          {/* ===== STEP 4: TEMPO DE MEMBRO ===== */}
          {step === 4 && (
            <div>
              <StepHeader Icon={HiOutlineClock} title="Sua Jornada" subtitle="Tempo de caminhada na igreja" />

              <Field label="5. Há quanto tempo sou membro desta igreja? (em anos)">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[['interessado','Sou interessado/visitante'],['menos1','Menos de 1 ano'],['1a5','1 a 5'],['6a10','6 a 10'],['11a20','11 a 20'],['21a30','21 a 30'],['mais30','Mais de 30']].map(([v, l]) => (
                    <OptionCard key={v} selected={form.tempoMembro === v} onClick={() => set('tempoMembro', v)}>{l}</OptionCard>
                  ))}
                </div>
              </Field>

              <Nav onPrev={prev} onNext={next} onSave={handleSaveDraft} saving={saving} error={stepError} />
            </div>
          )}

          {/* ===== STEP 5: AVALIAÇÃO - PRIMEIRO CONTATO ===== */}
          {step === 5 && (
            <div>
              <StepHeader Icon={HiOutlineChatAlt2} title="II. Avaliação" subtitle="Como você conheceu e chegou à igreja" />

              <Field label="6. Como foi seu primeiro contato com esta igreja?">
                <p className="text-xs text-gray-400 mb-2">Marque apenas uma opção</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[['amigo_parente','Um amigo ou parente me convidou'],['conjuge_membro','Meu cônjuge já era membro'],['veio_pais','Vim com meus pais'],['nasci_igreja','Nasci na igreja'],['visita_membro','Recebi uma visita e gostei'],['campanha','Campanha evangelística'],['colportagem','Colportagem'],['internet','Conheci pela internet'],['sem_convite','Vim sem convite'],['outro','Outro']].map(([v, l]) => (
                    <OptionCard key={v} selected={form.primeiroContato === v} onClick={() => set('primeiroContato', v)}>{l}</OptionCard>
                  ))}
                </div>
                {form.primeiroContato === 'outro' && (
                  <input type="text" value={form.primeiroContatoOutro || ''} onChange={e => set('primeiroContatoOutro', e.target.value)} placeholder="Especifique como conheceu a igreja" className="inp mt-2" />
                )}
              </Field>

              <Field label="7. O que influenciou você a pertencer a esta igreja?" className="mt-5">
                <p className="text-xs text-gray-400 mb-2">Marque quantas opções desejar</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[['perto_casa','É perto de minha casa'],['igreja_familia','É a igreja de minha família'],['filhos','Meus filhos'],['trabalho_missionario','O trabalho missionário'],['receptividade','A receptividade da igreja'],['gosto_cultos','Gosto dos cultos'],['estrutura_conforto','A estrutura e o conforto'],['doutrina_biblica','Doutrina Bíblica diferente'],['outro','Outro']].map(([v, l]) => (
                    <CheckCard key={v} checked={(form.influencias || []).includes(v)} onClick={() => toggle('influencias', v)}>{l}</CheckCard>
                  ))}
                </div>
                {(form.influencias || []).includes('outro') && (
                  <input type="text" value={form.influenciasOutro || ''} onChange={e => set('influenciasOutro', e.target.value)} placeholder="Especifique o que influenciou você" className="inp mt-2" />
                )}
              </Field>

              <Nav onPrev={prev} onNext={next} onSave={handleSaveDraft} saving={saving} error={stepError} />
            </div>
          )}

          {/* ===== STEP 6: LOCALIZAÇÃO / TRANSPORTE / IGREJA ===== */}
          {step === 6 && (
            <div>
              <StepHeader Icon={HiOutlineLocationMarker} title="Localização" subtitle="Como você chega à igreja" />

              <Field label="Qual a distância da sua casa até a igreja?">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[['menos5km','Menos de 5 km'],['6a10km','6 a 10 km'],['11a20km','11 a 20 km'],['21a30km','21 a 30 km'],['31a50km','31 a 50 km'],['mais50km','Mais de 50 km']].map(([v, l]) => (
                    <OptionCard key={v} selected={form.distanciaIgreja === v} onClick={() => set('distanciaIgreja', v)}>{l}</OptionCard>
                  ))}
                </div>
              </Field>

              <Field label="8. Como chego à igreja?" className="mt-5">
                <div className="grid grid-cols-2 gap-2">
                  {[['onibus','Ônibus'],['carro','Carro'],['pe','A pé'],['outro','Outro']].map(([v, l]) => (
                    <OptionCard key={v} selected={form.transporte === v} onClick={() => set('transporte', v)}>{l}</OptionCard>
                  ))}
                </div>
              </Field>

              <Field label="9. Quanto tempo demoro para chegar aos cultos oficiais?" className="mt-5">
                <div className="grid grid-cols-2 gap-2">
                  {[['menos5','Menos de 5 min'],['5a15','5 a 15 min'],['15a30','15 a 30 min'],['mais30','Mais de 30 min']].map(([v, l]) => (
                    <OptionCard key={v} selected={form.tempoDeslocamento === v} onClick={() => set('tempoDeslocamento', v)}>{l}</OptionCard>
                  ))}
                </div>
              </Field>

              <Field label="Selecione a igreja mais próxima de você" className="mt-5">
                <div className="relative">
                  <input
                    type="text"
                    value={igrejaSearch}
                    onChange={e => { setIgrejaSearch(e.target.value); setShowIgrejaDropdown(true) }}
                    onFocus={() => setShowIgrejaDropdown(true)}
                    placeholder="Digite para buscar uma igreja..."
                    className="inp"
                  />
                  {showIgrejaDropdown && (
                    <div className="absolute z-50 top-full left-0 right-0 bg-white border-2 border-[#006D43] rounded-b-xl max-h-60 overflow-y-auto">
                      {filteredIgrejas.map(ig => (
                        <div key={ig.id} className="px-4 py-3 cursor-pointer hover:bg-green-50 border-b border-gray-100"
                          onClick={() => { set('igrejaId', ig.id); setIgrejaSearch(ig.nome); setShowIgrejaDropdown(false) }}>
                          <strong className="text-gray-800 block">{ig.nome}</strong>
                          <small className="text-gray-500">{ig.endereco_cidade}{ig.endereco_estado ? ` - ${ig.endereco_estado}` : ''}</small>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Field>

              <Nav onPrev={prev} onNext={next} onSave={handleSaveDraft} saving={saving} error={stepError} />
            </div>
          )}

          {/* ===== STEP 7: PONTOS FORTES/FRACOS + CARGOS ===== */}
          {step === 7 && (
            <div>
              <StepHeader Icon={HiOutlineCheckCircle} title="Sua Opinião" subtitle="11. Destaque três pontos fortes e três pontos fracos da igreja atualmente" />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-xl p-4">
                  <label className="font-semibold text-gray-800 text-sm block mb-2">Três Pontos Fortes</label>
                  <input type="text" value={form.pontoForte1 || ''} onChange={e => set('pontoForte1', e.target.value)} placeholder="1º ponto forte" className="inp mb-2" />
                  <input type="text" value={form.pontoForte2 || ''} onChange={e => set('pontoForte2', e.target.value)} placeholder="2º ponto forte" className="inp mb-2" />
                  <input type="text" value={form.pontoForte3 || ''} onChange={e => set('pontoForte3', e.target.value)} placeholder="3º ponto forte" className="inp" />
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <label className="font-semibold text-gray-800 text-sm block mb-2">Três Pontos Fracos</label>
                  <input type="text" value={form.pontoFraco1 || ''} onChange={e => set('pontoFraco1', e.target.value)} placeholder="1º ponto fraco" className="inp mb-2" />
                  <input type="text" value={form.pontoFraco2 || ''} onChange={e => set('pontoFraco2', e.target.value)} placeholder="2º ponto fraco" className="inp mb-2" />
                  <input type="text" value={form.pontoFraco3 || ''} onChange={e => set('pontoFraco3', e.target.value)} placeholder="3º ponto fraco" className="inp" />
                </div>
              </div>

              <Field label="Que cargo ou departamento você desempenhou no último ano?" className="mt-5">
                <p className="text-xs text-gray-400 mb-2">Marque as opções que se aplicam</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {CARGOS_OPTIONS.map(c => (
                    <CheckCard key={c} checked={(form.cargos || []).includes(c)} onClick={() => toggle('cargos', c)}>{c}</CheckCard>
                  ))}
                </div>
              </Field>

              <Nav onPrev={prev} onNext={next} onSave={handleSaveDraft} saving={saving} error={stepError} />
            </div>
          )}

          {/* ===== STEP 8: SATISFAÇÃO ===== */}
          {step === 8 && (
            <div>
              <StepHeader Icon={HiOutlineEmojiHappy} title="Satisfação" subtitle="12. Indique seu grau de satisfação com as seguintes atividades" />

              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="text-xs text-gray-500">
                      <th className="text-left p-2 w-1/3">Atividades</th>
                      <th className="p-2 text-center">Muito satisfeito</th>
                      <th className="p-2 text-center">Satisfeito</th>
                      <th className="p-2 text-center">Insatisfeito</th>
                      <th className="p-2 text-center">Muito insatisfeito</th>
                    </tr>
                  </thead>
                  <tbody>
                    {SATISFACAO_ITENS.map(item => {
                      const key = `sat_${item.replace(/\s/g, '_').toLowerCase()}`
                      return (
                        <tr key={item} className="border-b border-gray-100">
                          <td className="p-2 font-medium text-gray-700">{item}</td>
                          {[4, 3, 2, 1].map(v => (
                            <td key={v} className="p-2 text-center">
                              <input type="radio" name={key} checked={form[key] === String(v)} onChange={() => set(key, String(v))} className="w-4 h-4 accent-[#006D43]" />
                            </td>
                          ))}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <Nav onPrev={prev} onNext={next} onSave={handleSaveDraft} saving={saving} error={stepError} />
            </div>
          )}

          {/* ===== STEP 9: ÊNFASES / PRIORIDADES ===== */}
          {step === 9 && (
            <div>
              <StepHeader Icon={HiOutlineStar} title="Prioridades" subtitle="13. Assinale itens que deveriam receber maior ênfase por parte da igreja" />
              <p className="text-xs text-gray-400 mb-3">Marque no mínimo 3 opções</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {ENFASES_OPTIONS.map(e => (
                  <CheckCard key={e} checked={(form.enfases || []).includes(e)} onClick={() => toggle('enfases', e)}>{e}</CheckCard>
                ))}
              </div>
              <p className="text-gray-400 text-xs mt-2">Selecionados: {(form.enfases || []).length} (mínimo 3)</p>

              <Field label="Justifique suas escolhas (opcional)" className="mt-4">
                <textarea value={form.enfaseJustificativa || ''} onChange={e => set('enfaseJustificativa', e.target.value)} className="inp" rows={2} placeholder="Justifique suas escolhas" />
              </Field>

              <Nav onPrev={prev} onNext={next} onSave={handleSaveDraft} saving={saving} error={stepError} />
            </div>
          )}

          {/* ===== STEP 10: FREQUÊNCIA + CONTRIBUIÇÃO ===== */}
          {step === 10 && (
            <div>
              <StepHeader Icon={HiOutlineCalendar} title="Participação" subtitle="14. Em um mês normal, qual sua frequência para participar das seguintes atividades?" />
              <p className="text-xs text-gray-400 mb-3">0 = nunca | 1 = uma vez/mês | 2 = duas vezes | 3 = três vezes | 4 = quatro vezes</p>

              <div className="overflow-x-auto mb-6">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="text-xs text-gray-500">
                      <th className="text-left p-2 w-1/3">Atividade</th>
                      {[0,1,2,3,4].map(v => <th key={v} className="p-2 text-center">{v}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {FREQUENCIA_ITENS.map(item => {
                      const key = `freq_${item.replace(/\s/g, '_').toLowerCase()}`
                      return (
                        <tr key={item} className="border-b border-gray-100">
                          <td className="p-2 font-medium text-gray-700">{item}</td>
                          {[0,1,2,3,4].map(v => (
                            <td key={v} className="p-2 text-center">
                              <input type="radio" name={key} checked={form[key] === String(v)} onChange={() => set(key, String(v))} className="w-4 h-4 accent-[#006D43]" />
                            </td>
                          ))}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <div className="border-t-2 border-gray-100 pt-5">
                <Field label="15. Tendo em vista o que sua igreja realiza, o quanto você se sente motivado a contribuir financeiramente?">
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {[['0','Nada motivado'],['1','Pouco motivado'],['2','Neutro'],['3','Motivado'],['4','Muito motivado']].map(([v, l]) => (
                      <OptionCard key={v} selected={form.motivadoContribuir === v} onClick={() => set('motivadoContribuir', v)}>{l}</OptionCard>
                    ))}
                  </div>
                </Field>

                <Field label="16. Como você tem contribuído?" className="mt-4">
                  <p className="text-xs text-gray-400 mb-2">Fiel nos dízimos, primícias, sabatina de bênçãos, ofertas</p>
                  <div className="grid grid-cols-3 gap-2">
                    {[['esporadico','Esporádico'],['regular','Regular'],['dizimista_fiel','Dizimista Fiel']].map(([v, l]) => (
                      <OptionCard key={v} selected={form.tipoContribuinte === v} onClick={() => set('tipoContribuinte', v)}>{l}</OptionCard>
                    ))}
                  </div>
                </Field>
              </div>

              <Nav onPrev={prev} onNext={next} onSave={handleSaveDraft} saving={saving} error={stepError} />
            </div>
          )}

          {/* ===== STEP 11: SUGESTÕES FINAIS ===== */}
          {step === 11 && (
            <div>
              <StepHeader Icon={HiOutlineLightBulb} title="Sugestões" subtitle="Sua opinião é muito importante para o crescimento da igreja" />

              <Field label="17. Qual a sua opinião sobre a estrutura dos departamentos da sua igreja?">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[['manter','Deve permanecer como está'],['manter_melhorias','Deve permanecer como está, com melhorias'],['reduzir','Deve ser reduzida'],['aumentar','Deve aumentar']].map(([v, l]) => (
                    <OptionCard key={v} selected={form.opiniaoEstrutura === v} onClick={() => set('opiniaoEstrutura', v)}>{l}</OptionCard>
                  ))}
                </div>
              </Field>

              <div className="bg-gray-50 rounded-xl p-4 mt-4">
                <label className="font-semibold text-gray-800 text-sm block mb-2">18. Se você acha que deve haver mudanças na estrutura, que sugestões você tem?</label>
                <input type="text" value={form.sugestao1 || ''} onChange={e => set('sugestao1', e.target.value)} placeholder="1ª sugestão" className="inp mb-2" />
                <input type="text" value={form.sugestao2 || ''} onChange={e => set('sugestao2', e.target.value)} placeholder="2ª sugestão" className="inp mb-2" />
                <input type="text" value={form.sugestao3 || ''} onChange={e => set('sugestao3', e.target.value)} placeholder="3ª sugestão" className="inp" />
              </div>

              <p className="font-semibold text-gray-800 text-sm mt-5 mb-3">19. Visando o crescimento e desenvolvimento presente e futuro da sua igreja, deixe abaixo suas sugestões:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-xl p-4">
                  <label className="font-semibold text-green-700 text-sm block mb-2">+ Coisas que devem ser criadas</label>
                  <input type="text" value={form.criar1 || ''} onChange={e => set('criar1', e.target.value)} placeholder="1." className="inp mb-2" />
                  <input type="text" value={form.criar2 || ''} onChange={e => set('criar2', e.target.value)} placeholder="2." className="inp mb-2" />
                  <input type="text" value={form.criar3 || ''} onChange={e => set('criar3', e.target.value)} placeholder="3." className="inp" />
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <label className="font-semibold text-amber-600 text-sm block mb-2">Coisas que devem ser alteradas</label>
                  <input type="text" value={form.alterar1 || ''} onChange={e => set('alterar1', e.target.value)} placeholder="1." className="inp mb-2" />
                  <input type="text" value={form.alterar2 || ''} onChange={e => set('alterar2', e.target.value)} placeholder="2." className="inp mb-2" />
                  <input type="text" value={form.alterar3 || ''} onChange={e => set('alterar3', e.target.value)} placeholder="3." className="inp" />
                </div>
              </div>

              <Field label="Observações adicionais (opcional)" className="mt-4">
                <textarea value={form.observacoes || ''} onChange={e => set('observacoes', e.target.value)} className="inp" rows={3} placeholder="Observações" />
              </Field>

              <div className="bg-green-50 border border-green-200 rounded-xl p-4 mt-4 text-sm text-green-800">
                <strong>Seus dados estão protegidos!</strong> Conforme os termos aceitos, suas informações serão tratadas com sigilo e segurança.
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 mt-3 text-sm text-red-700">{error}</div>
              )}

              <div className="flex items-center justify-between mt-6 pt-5 border-t border-gray-100">
                <button onClick={prev} className="px-6 py-3 rounded-xl border-2 border-gray-200 text-gray-600 font-semibold hover:bg-gray-50 transition-colors">
                  Voltar
                </button>
                <div className="flex items-center gap-2">
                  <button onClick={handleSaveDraft} disabled={saving} className="px-4 py-3 rounded-xl border-2 border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-50">
                    {saving ? 'Salvando...' : 'Salvar Rascunho'}
                  </button>
                  <button onClick={handleSubmit} disabled={submitting} className="bg-[#006D43] text-white px-6 py-3 rounded-xl font-semibold hover:bg-[#005535] transition-colors disabled:opacity-50">
                    {submitting ? 'Enviando...' : 'Enviar Formulário'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 mt-6 mb-4">
          Seus dados estão seguros conosco
        </p>
      </div>
    </div>
  )
}

// ========== HELPER COMPONENTS ==========

function StepHeader({ Icon, title, subtitle }: { Icon: IconType; title: string; subtitle: string }) {
  return (
    <div className="mb-5">
      <h3 className="text-xl font-bold text-[#006D43] flex items-center gap-2">
        <Icon className="w-6 h-6" aria-hidden="true" />
        {title}
      </h3>
      <p className="text-gray-500 text-sm mt-1">{subtitle}</p>
    </div>
  )
}

function BenefitCard({ Icon, title, desc }: { Icon: IconType; title: string; desc: string }) {
  return (
    <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center flex flex-col items-center">
      <Icon className="w-7 h-7 text-[#006D43] mb-1" aria-hidden="true" />
      <p className="font-bold text-gray-800 text-sm">{title}</p>
      <p className="text-gray-500 text-xs mt-0.5">{desc}</p>
    </div>
  )
}

function Field({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={className}>
      <label className="block text-sm font-semibold text-gray-800 mb-2">{label}</label>
      {children}
    </div>
  )
}

function OptionCard({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all ${
        selected
          ? 'border-[#006D43] bg-green-50 text-[#006D43]'
          : 'border-gray-200 text-gray-700 hover:border-green-300 hover:bg-green-50/50'
      }`}
    >
      {children}
    </button>
  )
}

function CheckCard({ checked, onClick, children }: { checked: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <label
      onClick={onClick}
      className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border-2 text-sm cursor-pointer transition-all ${
        checked
          ? 'border-[#006D43] bg-green-50'
          : 'border-gray-200 hover:border-green-300'
      }`}
    >
      <input type="checkbox" checked={checked} readOnly className="w-4 h-4 accent-[#006D43]" />
      <span>{children}</span>
    </label>
  )
}

function Nav({ onPrev, onNext, onSave, saving, error }: { onPrev?: () => void; onNext?: () => void; onSave?: () => void; saving?: boolean; error?: string }) {
  return (
    <div className="mt-6 pt-5 border-t border-gray-100">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 text-sm text-red-700 font-medium">{error}</div>
      )}
    <div className="flex items-center justify-between">
      {onPrev ? (
        <button onClick={onPrev} className="px-6 py-3 rounded-xl border-2 border-gray-200 text-gray-600 font-semibold hover:bg-gray-50 transition-colors">
          Voltar
        </button>
      ) : <div />}
      <div className="flex items-center gap-2">
        {onSave && (
          <button onClick={onSave} disabled={saving} className="px-3 py-3 rounded-xl border-2 border-gray-200 text-gray-500 text-xs font-medium hover:bg-gray-50 transition-colors disabled:opacity-50" title="Salvar rascunho">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
          </button>
        )}
        {onNext && (
          <button onClick={onNext} className="bg-[#006D43] text-white px-6 py-3 rounded-xl font-semibold hover:bg-[#005535] transition-colors">
            Continuar
          </button>
        )}
      </div>
    </div>
    </div>
  )
}




