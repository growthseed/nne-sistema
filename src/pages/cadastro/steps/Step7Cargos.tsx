import { useFormContext } from 'react-hook-form'

const cargos = [
  'Ancião', 'Diácono', 'Diaconisa', 'Diretor(a) de ES',
  'Professor(a) de ES', 'Tesoureiro(a)', 'Secretário(a)',
  'Diretor(a) de Música', 'Diretor(a) de Jovens', 'Outro',
]

const departamentos = [
  'Escola Sabatina', 'Jovens', 'Música', 'Diaconia',
  'Obra Missionária', 'Educação', 'Saúde', 'Comunicação',
  'Mordomia', 'Família', 'Outro',
]

export default function Step7Cargos() {
  const { register } = useFormContext()

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label className="label-field">Cargo na Igreja</label>
        <select {...register('cargo')} className="input-field">
          <option value="">Nenhum</option>
          {cargos.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div>
        <label className="label-field">Departamento</label>
        <select {...register('departamento')} className="input-field">
          <option value="">Nenhum</option>
          {departamentos.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>
    </div>
  )
}
