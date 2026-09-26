import type {ReactNode} from 'react';
import {X} from 'lucide-react';

export function Modal({icon, eyebrow, title, onClose, wide, children}: {
  icon?: ReactNode;
  eyebrow: string;
  title: string;
  onClose: () => void;
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="modal-back" onClick={onClose}>
      <div className={`modal ${wide ? 'wide' : ''}`} onClick={e => e.stopPropagation()} role="dialog" aria-modal>
        <button className="close" onClick={onClose} aria-label="Close"><X /></button>
        {icon && <div className="modal-icon">{icon}</div>}
        <span className="eyebrow">{eyebrow}</span>
        <h2>{title}</h2>
        {children}
      </div>
    </div>
  );
}

export const errorMessage = (e: unknown) => (e instanceof Error ? e.message : 'Something went wrong');
