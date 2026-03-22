import {Link} from 'react-router';

interface BreadcrumbItem {
  title: string;
  to?: string;
}

export function Breadcrumbs({items}: {items: BreadcrumbItem[]}) {
  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      <Link to="/">Home</Link>
      {items.map((item, i) => (
        <span key={i}>
          <span className="breadcrumb-sep">/</span>
          {item.to ? (
            <Link to={item.to}>{item.title}</Link>
          ) : (
            <span className="breadcrumb-current">{item.title}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
