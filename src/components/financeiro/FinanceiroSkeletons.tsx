function SkeletonBlock({ className }: { className: string }) {
  return <div className={`animate-pulse rounded bg-gray-200 ${className}`} />
}

export function FinanceiroStatsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="card flex flex-col items-center py-6">
          <SkeletonBlock className="h-8 w-32" />
          <SkeletonBlock className="mt-3 h-4 w-24" />
        </div>
      ))}
    </div>
  )
}

export function FinanceiroTableSkeleton({
  titleWidth = 'w-56',
  rows = 5,
  embedded = false,
}: {
  titleWidth?: string
  rows?: number
  embedded?: boolean
}) {
  const content = (
    <>
      <div className="border-b border-gray-100 px-4 py-4">
        <SkeletonBlock className={`h-6 ${titleWidth}`} />
      </div>

      <div className="hidden lg:block">
        <div className="space-y-4 px-4 py-4">
          <div className="grid grid-cols-5 gap-4">
            <SkeletonBlock className="h-4 w-24" />
            <SkeletonBlock className="h-4 w-20" />
            <SkeletonBlock className="h-4 w-20" />
            <SkeletonBlock className="h-4 w-20" />
            <SkeletonBlock className="h-4 w-16" />
          </div>
          {Array.from({ length: rows }).map((_, index) => (
            <div key={index} className="grid grid-cols-5 gap-4 border-t border-gray-100 pt-4">
              <SkeletonBlock className="h-5 w-32" />
              <SkeletonBlock className="h-5 w-20" />
              <SkeletonBlock className="h-5 w-24" />
              <SkeletonBlock className="h-5 w-24" />
              <SkeletonBlock className="h-5 w-16" />
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3 p-4 lg:hidden">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="rounded-lg border border-gray-100 p-4">
            <SkeletonBlock className="h-5 w-40" />
            <div className="mt-3 grid grid-cols-2 gap-2">
              <SkeletonBlock className="h-14 w-full" />
              <SkeletonBlock className="h-14 w-full" />
              <SkeletonBlock className="h-14 w-full" />
              <SkeletonBlock className="h-14 w-full" />
            </div>
          </div>
        ))}
      </div>
    </>
  )

  if (embedded) {
    return content
  }

  return (
    <div className="card overflow-hidden p-0">
      {content}
    </div>
  )
}
