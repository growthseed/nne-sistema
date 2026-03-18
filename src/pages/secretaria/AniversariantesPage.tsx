import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { calcularIdade, formatDateBR, MESES_NOMES } from '@/lib/secretaria-constants'
import { HiOutlineCalendar, HiOutlineCake, HiOutlinePhone, HiOutlineCheck } from 'react-icons/hi'

interface Aniversariante {
  id: string
  nome: string
  data_nascimento: string
  celular: string | null
  telefone: string | null
  igreja_nome: string | null
  felicitado: boolean
}

export default function AniversariantesPage() {
  const { profile } = useAuth()
  const [pessoas, setPessoas] = useState<Aniversariante[]>([])
  const [loading, setLoading] = useState(true)
  const [periodo, setPeriodo] = useState<'7dias' | '30dias' | 'mes'>('7dias')
  const [felicitados, setFelicitados] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetchAniversariantes()
  }, [profile]) // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchAniversariantes() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('pessoas')
        .select('id, nome, data_nascimento, celular, telefone, igreja:igrejas(nome)')
        .eq('tipo', 'membro')
        .eq('situacao', 'ativo')
        .not('data_nascimento', 'is', null)

      if (error) throw error

      // Check felicitados this year
      const anoAtual = new Date().getFullYear()
      const { data: notifs } = await supabase
        .from('notificacoes_aniversario')
        .select('pessoa_id')
        .eq('ano', anoAtual)

      const felicitadosSet = new Set((notifs || []).map(n => n.pessoa_id))
      setFelicitados(felicitadosSet)

      setPessoas((data || []).map(p => ({
        id: p.id,
        nome: p.nome,
        data_nascimento: p.data_nascimento,
        celular: p.celular,
        telefone: p.telefone,
        igreja_nome: (p.igreja as any)?.nome || null,
        felicitado: felicitadosSet.has(p.id),
      })))
    } catch (err) {
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  const filtered = useMemo(() => {
    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)

    return pessoas.filter(p => {
      const nasc = new Date(p.data_nascimento + 'T00:00:00')
      const aniv = new Date(hoje.getFullYear(), nasc.getMonth(), nasc.getDate())
      if (aniv < hoje) aniv.setFullYear(aniv.getFullYear() + 1)
      const diffDays = Math.ceil((aniv.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24))

      if (periodo === '7dias') return diffDays >= 0 && diffDays <= 7
      if (periodo === '30dias') return diffDays >= 0 && diffDays <= 30
      // mes = mês atual
      return nasc.getMonth() === hoje.getMonth()
    }).sort((a, b) => {
      const hoje = new Date()
      const nascA = new Date(a.data_nascimento + 'T00:00:00')
      const nascB = new Date(b.data_nascimento + 'T00:00:00')
      const anivA = new Date(hoje.getFullYear(), nascA.getMonth(), nascA.getDate())
      const anivB = new Date(hoje.getFullYear(), nascB.getMonth(), nascB.getDate())
      if (anivA < hoje) anivA.setFullYear(anivA.getFullYear() + 1)
      if (anivB < hoje) anivB.setFullYear(anivB.getFullYear() + 1)
      return anivA.getTime() - anivB.getTime()
    })
  }, [pessoas, periodo])

  // Counts
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  const hojeCont = pessoas.filter(p => {
    const n = new Date(p.data_nascimento + 'T00:00:00')
    return n.getMonth() === hoje.getMonth() && n.getDate() === hoje.getDate()
  }).length
  const semanaCont = pessoas.filter(p => {
    const n = new Date(p.data_nascimento + 'T00:00:00')
    const aniv = new Date(hoje.getFullYear(), n.getMonth(), n.getDate())
    if (aniv < hoje) aniv.setFullYear(aniv.getFullYear() + 1)
    const diff = Math.ceil((aniv.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24))
    return diff >= 0 && diff <= 7
  }).length
  const mesCont = pessoas.filter(p => {
    const n = new Date(p.data_nascimento + 'T00:00:00')
    return n.getMonth() === hoje.getMonth()
  }).length

  async function marcarFelicitado(pessoaId: string) {
    const anoAtual = new Date().getFullYear()
    const { error } = await supabase.from('notificacoes_aniversario').upsert({
      pessoa_id: pessoaId,
      ano: anoAtual,
      tipo: 'whatsapp',
      status: 'enviado',
      enviado_por: profile?.id,
    }, { onConflict: 'pessoa_id,ano' })

    if (!error) {
      setFelicitados(prev => new Set([...prev, pessoaId]))
    }
  }

  function getWhatsAppLink(pessoa: Aniversariante) {
    const phone = (pessoa.celular || pessoa.telefone || '').replace(/\D/g, '')
    if (!phone) return null
    const phoneWithCountry = phone.startsWith('55') ? phone : `55${phone}`
    const idade = calcularIdade(pessoa.data_nascimento) + 1
    const msg = encodeURIComponent(
      `Olá, ${pessoa.nome.split(' ')[0]}! 🎉\n\nA igreja deseja um feliz aniversário! Que Deus abençoe seus ${idade} anos com muita saúde e paz.\n\nCom carinho,\nSua igreja ❤️`
    )
    return `https://wa.me/${phoneWithCountry}?text=${msg}`
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Aniversariantes</h1>
        <p className="text-gray-500 mt-1">Felicite os membros e envie mensagens de carinho</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card py-4 text-center">
          <p className="text-3xl font-bold text-pink-600">{hojeCont}</p>
          <p className="text-xs text-gray-500 mt-1">Hoje</p>
        </div>
        <div className="card py-4 text-center">
          <p className="text-3xl font-bold text-blue-600">{semanaCont}</p>
          <p className="text-xs text-gray-500 mt-1">Esta Semana</p>
        </div>
        <div className="card py-4 text-center">
          <p className="text-3xl font-bold text-purple-600">{mesCont}</p>
          <p className="text-xs text-gray-500 mt-1">{MESES_NOMES[hoje.getMonth()]}</p>
        </div>
      </div>

      {/* Period Selector */}
      <div className="flex gap-2">
        {[
          { key: '7dias' as const, label: '7 dias' },
          { key: '30dias' as const, label: '30 dias' },
          { key: 'mes' as const, label: 'Mês atual' },
        ].map(p => (
          <button
            key={p.key}
            onClick={() => setPeriodo(p.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              periodo === p.key
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[1,2,3,4,5].map(i => (
            <div key={i} className="card py-4 px-4">
              <div className="h-12 bg-gray-200 rounded animate-pulse" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card py-12 text-center">
          <HiOutlineCake className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Nenhum aniversariante neste período</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(p => {
            const idade = calcularIdade(p.data_nascimento) + 1
            const nasc = new Date(p.data_nascimento + 'T00:00:00')
            const diaMes = `${nasc.getDate().toString().padStart(2, '0')}/${(nasc.getMonth() + 1).toString().padStart(2, '0')}`
            const isToday = nasc.getMonth() === hoje.getMonth() && nasc.getDate() === hoje.getDate()
            const waLink = getWhatsAppLink(p)
            const jFelicitado = felicitados.has(p.id)

            return (
              <div key={p.id} className={`card py-3 px-4 flex items-center gap-3 ${isToday ? 'ring-2 ring-pink-300 bg-pink-50/50' : ''}`}>
                <div className={`w-11 h-11 rounded-full flex items-center justify-center font-semibold text-sm shrink-0 ${isToday ? 'bg-pink-200 text-pink-700' : 'bg-gray-100 text-gray-600'}`}>
                  {p.nome.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">
                    {p.nome}
                    {isToday && <span className="ml-2 text-xs bg-pink-200 text-pink-700 px-2 py-0.5 rounded-full">Hoje!</span>}
                  </p>
                  <p className="text-xs text-gray-500 truncate">{p.igreja_nome || '—'}</p>
                </div>
                <div className="text-right shrink-0 mr-2">
                  <p className="text-sm font-semibold text-gray-700">{diaMes}</p>
                  <p className="text-xs text-gray-400">{idade} anos</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {waLink && (
                    <a
                      href={waLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-8 h-8 rounded-lg bg-green-100 text-green-600 flex items-center justify-center hover:bg-green-200 transition-colors"
                      title="Enviar WhatsApp"
                    >
                      <HiOutlinePhone className="w-4 h-4" />
                    </a>
                  )}
                  <button
                    onClick={() => marcarFelicitado(p.id)}
                    disabled={jFelicitado}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                      jFelicitado
                        ? 'bg-green-200 text-green-700 cursor-default'
                        : 'bg-gray-100 text-gray-500 hover:bg-blue-100 hover:text-blue-600'
                    }`}
                    title={jFelicitado ? 'Felicitado' : 'Marcar como felicitado'}
                  >
                    <HiOutlineCheck className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <p className="text-xs text-gray-400 text-center">
        Mostrando {filtered.length} aniversariante{filtered.length !== 1 ? 's' : ''}
      </p>
    </div>
  )
}
