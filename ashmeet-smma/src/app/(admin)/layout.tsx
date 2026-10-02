// Route group placeholder — (admin) layout
// The admin layout is in ./layout.tsx in the same directory
export const dynamic = 'force-dynamic'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
