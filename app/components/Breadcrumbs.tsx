import {Link} from 'react-router';

interface BreadcrumbItem {
  title: string;
  to?: string;
}

export function Breadcrumbs({items}: {items: BreadcrumbItem[]}) {
  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      <ol itemScope itemType="https://schema.org/BreadcrumbList">
        <li itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem">
          <Link to="/" itemProp="item"><span itemProp="name">Home</span></Link>
          <meta itemProp="position" content="1" />
        </li>
        {items.map((item, i) => (
          <li key={i} itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem">
            <span className="breadcrumb-sep" aria-hidden="true">/</span>
            {item.to ? (
              <Link to={item.to} itemProp="item"><span itemProp="name">{item.title}</span></Link>
            ) : (
              <span className="breadcrumb-current" itemProp="name">{item.title}</span>
            )}
            <meta itemProp="position" content={String(i + 2)} />
          </li>
        ))}
      </ol>
    </nav>
  );
}
