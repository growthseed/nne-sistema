import { useFormContext } from 'react-hook-form'

export default function Step2Contato() {
  const { register, formState: { errors } } = useFormContext()

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="md:col-span-2">
        <label className="label-field">Email</label>
        <input type="email" {...register('email')} className="input-field" placeholder="seu@email.com" />
        {errors.email && <p className="text-sm text-red-600 mt-1">{errors.email.message as string}</p>}
      </div>

      <div>
        <label className="label-field">Telefone Fixo</label>
        <input {...register('telefone')} className="input-field" placeholder="(00) 0000-0000" />
      </div>

      <div>
        <label className="label-field">Celular / WhatsApp</label>
        <input {...register('celular')} className="input-field" placeholder="(00) 00000-0000" />
      </div>
    </div>
  )
}
