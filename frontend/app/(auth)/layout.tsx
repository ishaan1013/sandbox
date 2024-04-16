export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="w-screen flex items-center justify-center h-screen">
      {children}
    </div>
  )
}
