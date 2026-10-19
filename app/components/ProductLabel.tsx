import {Badge} from '~/components/ui/Badge';

/** A merchant's label on a product, in the merchant's colours when it has them: on the card and beside the title. */
export function ProductLabel({
  label,
  className,
}: {
  label: {name: string; color?: string | null; textColor?: string | null};
  className?: string;
}) {
  return (
    <Badge
      variant="plain"
      className={className}
      style={
        label.color ? {backgroundColor: label.color, color: label.textColor || 'var(--color-background)'} : undefined
      }
    >
      {label.name}
    </Badge>
  );
}
