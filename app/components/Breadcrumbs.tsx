import {Link} from 'react-router';

interface BreadcrumbItem {
  title: string;
  to?: string;
}

export function Breadcrumbs({items}: {items: BreadcrumbItem[]}) {
  return (
    <nav className="text-xs text-gray-400 mb-6" aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center list-none" itemScope itemType="https://schema.org/BreadcrumbList">
        <li itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem">
          <Link to="/" itemProp="item" className="text-gray-400 transition-colors duration-150 hover:text-dark hover:no-underline"><span itemProp="name">Home</span></Link>
          <meta itemProp="position" content="1" />
        </li>
        {items.map((item, i) => (
          <li key={i} itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem">
            <span className="mx-2 text-gray-300" aria-hidden="true">/</span>
            {item.to ? (
              <Link to={item.to} itemProp="item" className="text-gray-400 transition-colors duration-150 hover:text-dark hover:no-underline"><span itemProp="name">{item.title}</span></Link>
            ) : (
              <span className="text-gray-600" itemProp="name">{item.title}</span>
            )}
            <meta itemProp="position" content={String(i + 2)} />
          </li>
        ))}
      </ol>
    </nav>
  );
}
