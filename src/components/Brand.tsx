import { Link } from 'react-router-dom'

export function Brand() {
  return (
    <Link className="brand" to="/" aria-label="HubPages — página inicial">
      <span>Hub</span>
      <strong>Pages</strong>
      <i aria-hidden="true" />
    </Link>
  )
}
