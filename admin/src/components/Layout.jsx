import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const links = [
  { to: '/', label: 'Dashboard', icon: '📊', end: true },
  { to: '/subjects', label: 'Subjects', icon: '🗂️' },
  { to: '/questions', label: 'Questions', icon: '❓' },
  { to: '/users', label: 'Users', icon: '👥' },
  { to: '/attempts', label: 'Attempts', icon: '📝' },
  { to: '/announcements', label: 'Announcements', icon: '📢' },
];

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const initials = user?.name ? user.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase() : 'A';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="admin-shell">
      <aside className="sidebar">
        <div className="logo">
          <span className="logo-icon">🛡️</span>
          Quiz<span className="gradient-text">Admin</span>
        </div>
        <nav className="side-nav">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) => `side-link ${isActive ? 'active' : ''}`}
            >
              <span>{l.icon}</span> {l.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-user">
          <span className="avatar">{initials}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 13.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name}</div>
            <div style={{ fontSize: 11.5, color: 'var(--text-faint)' }}>Administrator</div>
          </div>
          <button className="btn btn-outline btn-sm" onClick={handleLogout}>↪</button>
        </div>
      </aside>
      <main className="admin-main">{children}</main>
    </div>
  );
}
