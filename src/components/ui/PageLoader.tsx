interface PageLoaderProps {
  fullScreen?: boolean
  label?: string
}

export default function PageLoader({ fullScreen = true, label = 'Carregando...' }: PageLoaderProps) {
  return (
    <div className={fullScreen ? 'min-h-screen flex items-center justify-center bg-gray-50' : 'flex items-center justify-center py-12'}>
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto" />
        <p className="mt-4 text-gray-500">{label}</p>
      </div>
    </div>
  )
}
