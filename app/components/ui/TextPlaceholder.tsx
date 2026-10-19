/** Widths that vary a column of lines, as text does. */
const WIDTHS = ['w-3/4', 'w-1/2', 'w-2/3', 'w-2/5', 'w-3/5'];

/**
 * The place of a few lines of text while they load: `lines` blocks a line high in the surface colour, of varied
 * widths, at the text size and gap `className` gives — so what comes takes about the same room (B-420).
 */
export function TextPlaceholder({lines, className = ''}: {lines: number; className?: string}) {
  return (
    <div aria-hidden="true" className={`flex flex-col ${className}`}>
      {Array.from({length: lines}, (_, index) => (
        <span key={index} className={`h-lh bg-surface ${WIDTHS[index % WIDTHS.length]}`} />
      ))}
    </div>
  );
}
