import {ImageIcon} from '~/components/ui/icons';

/** Where a picture is missing: a quiet picture sign in the middle of the box it fills, instead of an empty grey. */
export function ImagePlaceholder({className = ''}: {className?: string}) {
  return (
    <div aria-hidden="true" className={`flex size-full items-center justify-center bg-surface ${className}`}>
      <ImageIcon className="size-10 text-border" />
    </div>
  );
}
