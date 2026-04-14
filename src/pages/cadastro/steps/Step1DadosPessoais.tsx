import { useFormContext } from 'react-hook-form'
import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { FiAlertTriangle } from 'react-icons/fi'
import { Link } from 'react-router-dom'

const estadosCivis = ['Solteiro(a)', 'Casado(a)', 'Divorciado(a)', 'Viúvo(a)', 'Separado(a)']

interface PossivelDuplicata {
  id: string
  nome: string
  data_nascimento?: string
  cpf?: string
  igreja_nome?: string
}

export default function Step1DadosPessoais() {
  const { register, formState: { errors }, getValues, watch, setValue } = useFormContext()
  const [duplicatas, setDuplicatas] = useState<PossivelDuplicata[]>([])
  const [checking, setChecking] = useState(false)

  const verificarDuplicata = useCallback(async () => {
    const nome = getValues('nome')?.trim()
    const nascimento = getValues('data_nascimento')
    const cpf = getValues('cpf')?.trim()

    if (!nome || nome.length < 3) return

    setChecking(true)
    try {
      const encontrados: PossivelDuplicata[] = []

      // Busca por CPF (match exato)
      if (cpf && cpf.length >= 11) {
        const cpfLimpo = cpf.replace(/\D/g, '')
        const { data: porCpf } = await supabase
          .from('pessoas')
          .select('id, nome, data_nascimento, cpf, igreja:igrejas(nome)')
          .eq('cpf', cpfLimpo)
          .limit(5)
        if (porCpf) {
          for (const p of porCpf) {
            encontrados.push({
              id: p.id,
              nome: p.nome,
              data_nascimento: p.data_nascimento || undefined,
              cpf: p.cpf || undefined,
              igreja_nome: (p.igreja as any)?.nome,
            })
          }
        }
      }

      // Busca por nome similar
      if (encontrados.length === 0) {
        const { data: porNome } = await supabase
          .from('pessoas')
          .select('id, nome, data_nascimento, cpf, igreja:igrejas(nome)')
          .ilike('nome', `%${nome}%`)
          .limit(10)

        if (porNome) {
          for (const p of porNome) {
            // Se tem nascimento, filtra por match
            if (nascimento && p.data_nascimento && p.data_nascimento === nascimento) {
              encontrados.push({
                id: p.id,
                nome: p.nome,
                data_nascimento: p.data_nascimento,
                cpf: p.cpf || undefined,
                igreja_nome: (p.igreja as any)?.nome,
              })
            } else if (!nascimento) {
              // Sem nascimento, mostra todos com nome similar
              encontrados.push({
                id: p.id,
                nome: p.nome,
                data_nascimento: p.data_nascimento || undefined,
                cpf: p.cpf || undefined,
                igreja_nome: (p.igreja as any)?.nome,
              })
            }
          }

          // Se não achou por nascimento, mostra pelo nome
          if (encontrados.length === 0 && porNome.length > 0) {
            const nomeNorm = nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            for (const p of porNome) {
              const pNorm = p.nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
              if (pNorm === nomeNorm) {
                encontrados.push({
                  id: p.id,
                  nome: p.nome,
                  data_nascimento: p.data_nascimento || undefined,
                  cpf: p.cpf || undefined,
                  igreja_nome: (p.igreja as any)?.nome,
                })
              }
            }
          }
        }
      }

      setDuplicatas(encontrados)
    } catch {
      // silencioso
    } finally {
      setChecking(false)
    }
  }, [getValues])

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="label-field">Nome Completo *</label>
          <input
            {...register('nome')}
            className="input-field"
            placeholder="Nome completo"
            onBlur={verificarDuplicata}
          />
          {errors.nome && <p className="text-sm text-red-600 mt-1">{errors.nome.message as string}</p>}
        </div>

        <div>
          <label className="label-field">Data de Nascimento *</label>
          {(() => {
            const val = watch('data_nascimento') || ''
            const parts = val.split('-')
            const yyyy = parts[0] || '', mm = parts[1] || '', dd = parts[2] || ''
            const meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
            const anoAtual = new Date().getFullYear()
            const setD = (d: string, m: string, y: string) => { if (d && m && y) setValue('data_nascimento', `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`) }
            return (
              <div className="flex gap-2" onBlur={verificarDuplicata}>
                <select value={dd} onChange={e => setD(e.target.value, mm, yyyy)} className="flex-1 input-field">
                  <option value="">Dia</option>
                  {Array.from({length:31},(_,i)=>i+1).map(d => <option key={d} value={String(d).padStart(2,'0')}>{d}</option>)}
                </select>
                <select value={mm} onChange={e => setD(dd, e.target.value, yyyy)} className="flex-1 input-field">
                  <option value="">Mês</option>
                  {meses.map((m,i) => <option key={i} value={String(i+1).padStart(2,'0')}>{m}</option>)}
                </select>
                <select value={yyyy} onChange={e => setD(dd, mm, e.target.value)} className="flex-1 input-field">
                  <option value="">Ano</option>
                  {Array.from({length:100},(_,i)=>anoAtual-i).map(y => <option key={y} value={String(y)}>{y}</option>)}
                </select>
              </div>
            )
          })()}
          {errors.data_nascimento && <p className="text-sm text-red-600 mt-1">{errors.data_nascimento.message as string}</p>}
        </div>

        <div>
          <label className="label-field">Sexo *</label>
          <select {...register('sexo')} className="input-field">
            <option value="">Selecione</option>
            <option value="M">Masculino</option>
            <option value="F">Feminino</option>
          </select>
          {errors.sexo && <p className="text-sm text-red-600 mt-1">{errors.sexo.message as string}</p>}
        </div>

        <div>
          <label className="label-field">Estado Civil *</label>
          <select {...register('estado_civil')} className="input-field">
            <option value="">Selecione</option>
            {estadosCivis.map(ec => <option key={ec} value={ec}>{ec}</option>)}
          </select>
          {errors.estado_civil && <p className="text-sm text-red-600 mt-1">{errors.estado_civil.message as string}</p>}
        </div>

        <div>
          <label className="label-field">CPF</label>
          <input
            {...register('cpf')}
            className="input-field"
            placeholder="000.000.000-00"
            onBlur={verificarDuplicata}
          />
        </div>

        <div>
          <label className="label-field">RG</label>
          <input {...register('rg')} className="input-field" placeholder="Documento de identidade" />
        </div>

        <div>
          <label className="label-field">Nacionalidade *</label>
          <input {...register('nacionalidade')} className="input-field" placeholder="Ex: Brasileira" defaultValue="Brasileira" />
          {errors.nacionalidade && <p className="text-sm text-red-600 mt-1">{errors.nacionalidade.message as string}</p>}
        </div>

        <div>
          <label className="label-field">Naturalidade *</label>
          <input {...register('naturalidade')} className="input-field" placeholder="Cidade onde nasceu" />
          {errors.naturalidade && <p className="text-sm text-red-600 mt-1">{errors.naturalidade.message as string}</p>}
        </div>
      </div>

      {/* Alerta de duplicata */}
      {checking && (
        <p className="text-xs text-gray-400">Verificando duplicatas...</p>
      )}
      {duplicatas.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <FiAlertTriangle className="w-5 h-5 text-amber-600" />
            <span className="font-semibold text-amber-800">Possível duplicata encontrada</span>
          </div>
          <p className="text-sm text-amber-700 mb-3">
            {duplicatas.length === 1
              ? 'Já existe um registro com dados similares no sistema:'
              : `Encontrados ${duplicatas.length} registros com dados similares:`}
          </p>
          <div className="space-y-2">
            {duplicatas.map(d => (
              <div key={d.id} className="flex items-center justify-between bg-white rounded px-3 py-2 border border-amber-100">
                <div>
                  <span className="font-medium text-gray-800">{d.nome}</span>
                  {d.data_nascimento && (
                    <span className="text-xs text-gray-500 ml-2">
                      Nasc: {new Date(d.data_nascimento).toLocaleDateString('pt-BR')}
                    </span>
                  )}
                  {d.igreja_nome && (
                    <span className="text-xs text-gray-500 ml-2">· {d.igreja_nome}</span>
                  )}
                </div>
                <Link
                  to={`/membros/${d.id}`}
                  target="_blank"
                  className="text-xs text-primary-600 hover:underline whitespace-nowrap"
                >
                  Ver cadastro →
                </Link>
              </div>
            ))}
          </div>
          <p className="text-xs text-amber-600 mt-3">
            Verifique se não é a mesma pessoa antes de continuar. Você pode prosseguir se for um cadastro diferente.
          </p>
        </div>
      )}
    </div>
  )
}
