import { Link } from 'react-router-dom';

export interface NavItem {
  to: string;
  label: string;
  icon?: string;
  badgeCount?: number;
}

export interface NavProps {
  items: NavItem[];
  activePath: string;
  vertical?: boolean;
  onNavigate?: () => void;
}

export const Nav = ({ items, activePath, vertical = true, onNavigate }: NavProps) => {
  return (
    <ul className={`nav ${vertical ? 'flex-column' : ''}`}>
      {items.map((item) => {
        const isActive =
          activePath === item.to || (item.to !== '/inicio' && activePath.startsWith(item.to));
        return (
          <li className="nav-item" key={item.to}>
            <Link
              to={item.to}
              className={`nav-link ${isActive ? 'active' : ''}`}
              onClick={onNavigate}
            >
              {item.icon && <i className={`bi ${item.icon}`} aria-hidden="true" />}
              <span className="flex-grow-1">{item.label}</span>
              {typeof item.badgeCount === 'number' && item.badgeCount > 0 && (
                <span className="badge rounded-pill text-bg-danger">{item.badgeCount}</span>
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
};
