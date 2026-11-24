
import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  Gift,
  HandHeart,
  LayoutDashboard,
  LogOut,
  Menu,
  Route as RouteIcon,
  Tags,
  UserCircle,
  Users,
  Workflow,
  X
} from 'lucide-react';

import { useAuth } from '../lib/auth';
import type { Role } from '../lib/types';
import { Avatar } from './ui';
import { Brand } from './Logo';

interface Item {
  to: string;
  label: string;
  icon: React.ReactNode;
  roles?: Role[];
  end?: boolean;
}

const NAV_GROUPS: { label: string; items: Item[] }[] = [
  {
    label: 'Workspace',
    items: [
      {
        to: '/app',
        label: 'Dashboard',
        icon: <LayoutDashboard size={19} />,
        end: true
      }
    ]
  },
  {
    label: 'Resource Sharing',
    items: [
      {
        to: '/app/donations',
        label: 'Donations',
        icon: <Gift size={19} />
      },
      {
        to: '/app/requests',
        label: 'My Requests',
        icon: <HandHeart size={19} />,
        roles: ['RECIPIENT']
      },
      {
        to: '/app/allocations',
        label: 'Allocations',
        icon: <Workflow size={19} />,
        roles: ['ADMIN']
      }
    ]
  },
  {
    label: 'Operations',
    items: [
      {
        to: '/app/pickups',
        label: 'Pickups & Deliveries',
        icon: <RouteIcon size={19} />,
        roles: ['ADMIN', 'VOLUNTEER']
      }
    ]
  },
  {
    label: 'Community',
    items: [
      {
        to: '/app/categories',
        label: 'Categories',
        icon: <Tags size={19} />
      },
      {
        to: '/app/members',
        label: 'Members',
        icon: <Users size={19} />,
        roles: ['ADMIN']
      }
    ]
  },
  {
    label: 'Account',
    items: [
      {
        to: '/app/profile',
        label: 'Profile & Settings',
        icon: <UserCircle size={19} />
      }
    ]
  }
];

export default function AppLayout() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  if (!user) return null;

  const visible = (item: Item) =>
    !item.roles || item.roles.includes(user.role);

  const pageTitle =
    pathname === '/app'
      ? 'Dashboard'
      : NAV_GROUPS.flatMap(group => group.items)
          .find(item => item.to === pathname)?.label || 'Workspace';

  const renderLink = (item: Item) => (
    <NavLink
      key={item.to}
      to={item.to}
      end={item.end}
      className={({ isActive }) => isActive ? 'active' : ''}
    >
      {item.icon}
      <span>{item.label}</span>
    </NavLink>
  );

  return (
    <div className="shell">

      {/* Sidebar */}
      <aside
        className={`sidebar ${open ? 'open' : ''}`}
        aria-label="Primary navigation"
      >
        <Link to="/app" className="brand">
          <Brand />
        </Link>

        <nav className="nav">
          {NAV_GROUPS.map(group => {
            const items = group.items.filter(visible);

            if (items.length === 0) return null;

            return (
              <div className="nav-group" key={group.label}>
                <div className="nav-label">
                  {group.label}
                </div>

                {items.map(renderLink)}
              </div>
            );
          })}
        </nav>

        {/* Signed-in user */}
        <div className="side-user">
          <Avatar name={user.full_name} />

          <div className="side-user-info">
            <b>{user.full_name}</b>
            <span>{user.role.toLowerCase()}</span>
          </div>

          <button
            className="icon-btn"
            onClick={logout}
            aria-label="Sign out"
            title="Sign out"
          >
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      <div
        className={`scrim ${open ? 'open' : ''}`}
        onClick={() => setOpen(false)}
      />

      {/* Main content */}
      <div className="main">

        {/* Header */}
        <header className="topbar">

          <div className="topbar-left">

            <Link to="/app" className="brand mobile-brand">
              <Brand />
            </Link>

            <div className="topbar-title">
              <span>SHARESPHERE WORKSPACE</span>
              <strong>{pageTitle}</strong>
            </div>

          </div>

          <div className="topbar-right">

            <div className="header-user">
              <Avatar name={user.full_name} />

              <div>
                <b>{user.full_name}</b>
                <span>{user.role.toLowerCase()}</span>
              </div>
            </div>

            <button
              className="icon-btn menu-toggle"
              aria-label={open ? 'Close menu' : 'Open menu'}
              aria-expanded={open}
              onClick={() => setOpen(!open)}
            >
              {open ? <X size={22} /> : <Menu size={22} />}
            </button>

          </div>
        </header>

        <main className="content">
          <Outlet />
        </main>

      </div>
    </div>
  );
}
