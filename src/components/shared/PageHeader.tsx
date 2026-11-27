interface Props {
  title: string
  description: string
  detail?: string
}

export function PageHeader({ title, description, detail }: Props) {
  return (
    <header className="page-heading">
      {detail && <p className="page-detail">{detail}</p>}
      <h1>{title}</h1>
      <p className="page-description">{description}</p>
    </header>
  )
}
