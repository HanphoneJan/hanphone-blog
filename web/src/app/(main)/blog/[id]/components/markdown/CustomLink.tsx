'use client'

interface CustomLinkProps {
  href?: string
  children: React.ReactNode
  [key: string]: any
}

export function CustomLink({ href, children, ...props }: CustomLinkProps) {
  const isExternal = href && (href.startsWith('http://') || href.startsWith('https://'))

  return (
    <a
      href={href}
      target={isExternal ? '_blank' : undefined}
      rel={isExternal ? 'noopener noreferrer' : undefined}
      className="text-[rgb(var(--primary))] hover:underline"
      {...props}
    >
      {children}
    </a>
  )
}

export default CustomLink
