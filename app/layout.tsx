import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '基金对比工具',
  description: '中国公募基金数据查询和对比工具',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <body className="bg-bg-page text-text-primary antialiased">
        {children}
      </body>
    </html>
  )
}
