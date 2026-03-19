import { Link } from 'react-router-dom'
import { HiOutlineHome } from 'react-icons/hi'

export default function NotFoundPage() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <p className="text-7xl font-bold text-primary-600 mb-2">404</p>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Página não encontrada</h1>
        <p className="text-gray-500 mb-8 max-w-md">
          A página que você está procurando não existe ou foi movida.
        </p>
        <Link
          to="/"
          className="btn-primary inline-flex items-center gap-2"
        >
          <HiOutlineHome className="w-5 h-5" />
          Voltar ao Início
        </Link>
      </div>
    </div>
  )
}
