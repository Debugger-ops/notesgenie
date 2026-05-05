'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import styles from '../styles/navbar.module.css';

export default function Navbar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const toggleMobile = () => setMobileOpen((prev) => !prev);

  const isActive = (href: string) =>
    pathname === href ? `${styles.navLink} ${styles.navLinkActive}` : styles.navLink;

  return (
    <nav className={styles.navbar}>
      <div className={styles.navContainer}>
        <Link href="/" className={styles.logo}>
          <span className={styles.logoIcon}>🧞</span>
          <span>
            Note<span className={styles.logoHighlight}>Genie</span>
          </span>
        </Link>

        {session && (
          <div className={`${styles.navLinks} ${mobileOpen ? styles.navLinksOpen : ''}`}>
            <Link href="/dashboard" className={isActive('/dashboard')}>
              Dashboard
            </Link>
            <Link href="/upload" className={isActive('/upload')}>
              Upload
            </Link>
            <Link href="/settings" className={isActive('/settings')}>
              ⚙️ Settings
            </Link>
          </div>
        )}

        {session ? (
          <div className={styles.userSection}>
            <span className={styles.userName}>{session.user?.name ?? 'User'}</span>
            <button
              className={styles.logoutButton}
              onClick={() => signOut({ callbackUrl: '/' })}
            >
              Logout
            </button>
          </div>
        ) : null}

        {session && (
          <button
            className={styles.mobileToggle}
            onClick={toggleMobile}
            aria-label="Toggle navigation"
          >
            {mobileOpen ? '\u2715' : '\u2630'}
          </button>
        )}
      </div>
    </nav>
  );
}
