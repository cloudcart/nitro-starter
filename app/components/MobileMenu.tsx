import {useTranslation} from '@cloudcart/nitrogen';
import {MenuLink, type ParentMenuItem} from '~/components/MenuLink';
import {AccordionItem} from '~/components/ui/Accordion';

const ROW = 'flex min-h-11 items-center border-b border-border hover:no-underline';

/**
 * The main menu in the menu drawer on a phone, as the store's menu has it — the desktop header's items, with no link
 * of its own added (the store's menu holds the home page when the merchant wants it there; the logo always leads
 * home, B-350). One with children opens like an accordion: its own link first ("View all"), then its children.
 * Following a link closes the drawer.
 */
export function MobileMenu({
  items,
  toPath,
  onNavigate,
}: {
  items: ParentMenuItem[];
  toPath: (url: string) => string;
  onNavigate: () => void;
}) {
  const {t} = useTranslation();

  return (
    <nav aria-label={t('menu.label')} className="px-5 py-2">
      <ul>
        {items.map((item) =>
          item.items.length > 0 ? (
            <li key={item.id}>
              <AccordionItem title={item.title} name="mobile-menu">
                <ul className="flex flex-col pl-4">
                  {item.url && (
                    <li>
                      <MenuLink item={item} toPath={toPath} onClick={onNavigate} className="flex min-h-11 items-center">
                        {t('menu.viewAll')}
                      </MenuLink>
                    </li>
                  )}
                  {item.items.map((child) => (
                    <li key={child.id}>
                      <MenuLink
                        item={child}
                        toPath={toPath}
                        onClick={onNavigate}
                        className="flex min-h-11 items-center"
                      />
                    </li>
                  ))}
                </ul>
              </AccordionItem>
            </li>
          ) : (
            <li key={item.id}>
              <MenuLink item={item} toPath={toPath} onClick={onNavigate} className={ROW} />
            </li>
          ),
        )}
      </ul>
    </nav>
  );
}
