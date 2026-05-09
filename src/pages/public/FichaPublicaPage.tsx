import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'

interface FichaPayload {
  id: string
  nome: string | null
  sexo: string | null
  estado_civil: string | null
  escolaridade: string | null
  profissao: string | null
  data_nascimento: string | null
  cidade: string | null
  estado: string | null
  bairro: string | null
  faixa_etaria: string | null
  tempo_membro: string | null
  como_conheceu: string | null
  distancia_igreja: string | null
  meio_transporte: string | null
  satisfacao: Record<string, number> | null
  prioridades: string[] | null
  participacao: Record<string, number> | null
  pontos_fortes: string[] | null
  pontos_fracos: string[] | null
  cargos_ocupa: string[] | null
  opiniao_departamentos: string | null
  opiniao_estrutura: string | null
  sugestoes: string[] | null
  coisas_criar: string[] | null
  coisas_alterar: string[] | null
  enfase_justificativa: string | null
  motivacao_contribuir: string | null
  tipo_contribuinte: string | null
  etapa_atual: number
  completo: boolean
  created_at: string
}

function fmtDate(d: string | null) {
  if (!d) return '—'
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
    const [y, m, day] = d.split('-')
    return `${day}/${m}/${y}`
  }
  return new Date(d).toLocaleDateString('pt-BR')
}

const ESTADO_CIVIL_LABELS: Record<string, string> = {
  solteiro: 'Solteiro(a)', casado: 'Casado(a)', divorciado: 'Divorciado(a)',
  viuvo: 'Viúvo(a)', separado: 'Separado(a)', uniao_estavel: 'União estável',
}

const SAT_LABELS = ['', 'Muito insatisfeito', 'Insatisfeito', 'Satisfeito', 'Muito satisfeito']

export default function FichaPublicaPage() {
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')

  const [ficha, setFicha] = useState<FichaPayload | null>(null)
  const [igrejaNome, setIgrejaNome] = useState<string | null>(null)
  const [assocSigla, setAssocSigla] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id || !token) {
      setError('Link inválido. Faltam parâmetros.')
      setLoading(false)
      return
    }
    ;(async () => {
      try {
        const { data, error } = await supabase.functions.invoke('view-public-ficha', {
          body: { responseId: id, shareToken: token },
        })
        if (error || !data?.success) {
          setError(data?.message || 'Ficha não encontrada ou link expirado.')
        } else {
          setFicha(data.ficha as FichaPayload)
          setIgrejaNome(data.igreja_nome ?? null)
          setAssocSigla(data.associacao_sigla ?? null)
        }
      } catch (err: any) {
        setError(err?.message || 'Erro inesperado.')
      } finally {
        setLoading(false)
      }
    })()
  }, [id, token])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-400 text-sm">Carregando ficha...</p>
      </div>
    )
  }

  if (error || !ficha) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="w-12 h-12 mx-auto rounded-full bg-red-100 flex items-center justify-center mb-3">
            <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" /></svg>
          </div>
          <h1 className="text-lg font-bold text-gray-800">Não foi possível abrir esta ficha</h1>
          <p className="text-sm text-gray-500 mt-2">{error || 'Ficha não encontrada.'}</p>
          <p className="text-xs text-gray-400 mt-4">Solicite um novo link a quem te enviou.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero header */}
      <header className="bg-gradient-to-br from-primary-700 to-primary-900 text-white">
        <div className="max-w-3xl mx-auto px-6 py-8">
          <p className="text-xs uppercase tracking-wider text-primary-200">União Norte Nordeste · Censo</p>
          <h1 className="text-2xl sm:text-3xl font-bold mt-1">{ficha.nome || 'Ficha sem nome'}</h1>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-sm text-primary-100">
            {assocSigla && <span className="bg-white/15 backdrop-blur px-2 py-0.5 rounded-md text-xs font-semibold">{assocSigla}</span>}
            {igrejaNome && <span>{igrejaNome}</span>}
            {ficha.cidade && <span>· {ficha.cidade}{ficha.estado ? '/' + ficha.estado : ''}</span>}
            <span className="text-primary-200">·</span>
            <span>{ficha.completo ? 'Completo' : `Parcial (E${ficha.etapa_atual}/11)`}</span>
          </div>
          <p className="text-xs text-primary-200 mt-3">Respondido em {fmtDate(ficha.created_at?.slice(0, 10))} · visualização compartilhada (somente leitura)</p>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        {/* Dados pessoais */}
        <Section title="Dados pessoais">
          <Grid>
            <Field label="Nascimento" value={fmtDate(ficha.data_nascimento)} />
            <Field label="Sexo" value={ficha.sexo === 'masculino' ? 'Masculino' : ficha.sexo === 'feminino' ? 'Feminino' : null} />
            <Field label="Estado civil" value={ficha.estado_civil ? ESTADO_CIVIL_LABELS[ficha.estado_civil] || ficha.estado_civil : null} />
            <Field label="Escolaridade" value={ficha.escolaridade} />
            <Field label="Profissão" value={ficha.profissao} />
            <Field label="Faixa etária" value={ficha.faixa_etaria} />
          </Grid>
        </Section>

        {/* Jornada */}
        {(ficha.tempo_membro || ficha.como_conheceu || ficha.distancia_igreja || ficha.meio_transporte) && (
          <Section title="Jornada na igreja">
            <Grid>
              <Field label="Tempo de membro" value={ficha.tempo_membro} />
              <Field label="Como conheceu" value={ficha.como_conheceu} />
              <Field label="Distância da igreja" value={ficha.distancia_igreja} />
              <Field label="Meio de transporte" value={ficha.meio_transporte} />
            </Grid>
          </Section>
        )}

        {/* Cargos */}
        {ficha.cargos_ocupa && ficha.cargos_ocupa.length > 0 && (
          <Section title="Cargos / Departamentos">
            <div className="flex flex-wrap gap-2">
              {ficha.cargos_ocupa.map(c => (
                <span key={c} className="bg-blue-50 text-blue-700 text-xs font-medium px-2.5 py-1 rounded-full">{c}</span>
              ))}
            </div>
          </Section>
        )}

        {/* Pontos */}
        {((ficha.pontos_fortes && ficha.pontos_fortes.length > 0) || (ficha.pontos_fracos && ficha.pontos_fracos.length > 0)) && (
          <Section title="Avaliação da igreja">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {ficha.pontos_fortes && ficha.pontos_fortes.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-green-700 mb-2 uppercase tracking-wide">Pontos fortes</p>
                  <ul className="space-y-1.5">
                    {ficha.pontos_fortes.map((pf, i) => (
                      <li key={i} className="text-sm text-gray-700 flex gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5 shrink-0" /> {pf}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {ficha.pontos_fracos && ficha.pontos_fracos.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-red-700 mb-2 uppercase tracking-wide">Pontos a melhorar</p>
                  <ul className="space-y-1.5">
                    {ficha.pontos_fracos.map((pf, i) => (
                      <li key={i} className="text-sm text-gray-700 flex gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 shrink-0" /> {pf}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </Section>
        )}

        {/* Satisfação */}
        {ficha.satisfacao && Object.keys(ficha.satisfacao).length > 0 && (
          <Section title="Satisfação">
            <div className="space-y-2">
              {Object.entries(ficha.satisfacao).map(([k, v]) => (
                <div key={k} className="flex items-center justify-between py-1.5 border-b border-gray-100">
                  <span className="text-sm text-gray-700">{k}</span>
                  <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${
                    v >= 3 ? 'bg-green-100 text-green-700' : v >= 2 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {SAT_LABELS[v] || String(v)}
                  </span>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Prioridades */}
        {ficha.prioridades && ficha.prioridades.length > 0 && (
          <Section title="Prioridades sugeridas">
            <div className="flex flex-wrap gap-2">
              {ficha.prioridades.map(p => (
                <span key={p} className="bg-amber-50 text-amber-700 text-xs font-medium px-2.5 py-1 rounded-full">{p}</span>
              ))}
            </div>
          </Section>
        )}

        {/* Participação */}
        {ficha.participacao && Object.keys(ficha.participacao).length > 0 && (
          <Section title="Frequência mensal">
            <div className="space-y-1.5">
              {Object.entries(ficha.participacao).map(([k, v]) => (
                <div key={k} className="flex items-center justify-between py-1 border-b border-gray-100">
                  <span className="text-sm text-gray-700">{k}</span>
                  <span className="text-sm font-medium text-gray-800">{v}x/mês</span>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Observações */}
        {ficha.opiniao_departamentos && (
          <Section title="Observações">
            <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3 leading-relaxed whitespace-pre-line">{ficha.opiniao_departamentos}</p>
          </Section>
        )}

        {/* Footer LGPD */}
        <footer className="text-center text-[11px] text-gray-400 pt-6 border-t border-gray-200">
          Esta visualização é somente leitura e foi gerada por um link de compartilhamento.
          Dados confidenciais — uso restrito conforme LGPD.
        </footer>
      </main>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
      <h2 className="text-base font-semibold text-gray-800 mb-3 pb-2 border-b border-gray-100">{title}</h2>
      {children}
    </section>
  )
}
function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">{children}</div>
}
function Field({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-gray-400">{label}</p>
      <p className="text-sm font-medium text-gray-800 mt-0.5">{value}</p>
    </div>
  )
}
