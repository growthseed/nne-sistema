import { useFormContext } from 'react-hook-form'

const estadosCivis = ['Solteiro(a)', 'Casado(a)', 'Divorciado(a)', 'Viúvo(a)', 'Separado(a)']

export default function Step1DadosPessoais() {
  const { register, formState: { errors } } = useFormContext()

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="md:col-span-2">
        <label className="label-field">Nome Completo *</label>
        <input {...register('nome')} className="input-field" placeholder="Nome completo" />
        {errors.nome && <p className="text-sm text-red-600 mt-1">{errors.nome.message as string}</p>}
      </div>

      <div>
        <label className="label-field">Data de Nascimento *</label>
        <input type="date" {...register('data_nascimento')} className="input-field" />
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
        <input {...register('cpf')} className="input-field" placeholder="000.000.000-00" />
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
  )
}
