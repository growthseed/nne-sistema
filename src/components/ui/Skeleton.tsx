interface SkeletonProps {
  className?: string
}

export function SkeletonLine({ className = '' }: SkeletonProps) {
  return <div className={`h-4 bg-gray-200 rounded animate-pulse ${className}`} />
}

export function SkeletonCard({ className = '' }: SkeletonProps) {
  return <div className={`h-24 bg-gray-200 rounded-xl animate-pulse ${className}`} />
}

export function SkeletonAvatar({ className = '' }: SkeletonProps) {
  return <div className={`h-10 w-10 bg-gray-200 rounded-full animate-pulse flex-shrink-0 ${className}`} />
}

export default function Skeleton({ className = '' }: SkeletonProps) {
  return <div className={`bg-gray-200 rounded animate-pulse ${className}`} />
}
