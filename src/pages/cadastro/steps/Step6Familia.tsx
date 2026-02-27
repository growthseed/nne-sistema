import { useFormContext } from 'react-hook-form'

const parentescos = ['Cônjuge', 'Filho(a)', 'Pai', 'Mãe', 'Irmão(ã)', 'Outro']

export default function Step6Familia() {
  const { register } = useFormContext()

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label className="label-field">Família (Código)</label>
        <input {...register('familia_id')} className="input-field" placeholder="ID da família (se houver)" />
        <p className="text-xs text-gray-400 mt-1">Vincule a uma família existente ou deixe em branco</p>
      </div>

      <div>
        <label className="label-field">Parentesco</label>
        <select {...register('parentesco')} className="input-field">
          <option value="">Selecione</option>
          {parentescos.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      <div className="md:col-span-2">
        <label className="label-field">Nome do Cônjuge</label>
        <input {...register('conjuge_nome')} className="input-field" placeholder="Nome completo do cônjuge (se casado)" />
      </div>
    </div>
  )
}
