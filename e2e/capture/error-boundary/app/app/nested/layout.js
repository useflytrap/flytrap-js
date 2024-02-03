export default function RootLayout({ children }) {
  return (
    <html>
      <head></head>
      <body>
				<span>Nested Layout</span>
				{children}
			</body>
    </html>
  )
}
