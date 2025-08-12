/* eslint-disable @next/next/no-img-element */
"use client";
import React, { useState, useRef, useEffect } from "react";
import styles from "./Navbar.module.css";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface User {
  email?: string;
  username?: string;
}
interface NavbarProps {
  user: User | null;
}

export default function Navbar({ user }: NavbarProps) {
  const router = useRouter();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState({
    email: user?.email || "",
    title: "",
    type: "",
    extraField: "",
    file: null as File | File[] | null,
  });


  useEffect(() => {
    setFormData((prev) => ({ ...prev, email: user?.email || "" }));
  }, [user?.email]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, files } = e.target as HTMLInputElement;
    if (files) {
      setFormData((prev) => ({
        ...prev,
        [name]: files.length > 1 ? Array.from(files) : files[0],
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Form submitted:", formData);
    setIsModalOpen(false);
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setIsDropdownOpen(false);
    setIsModalOpen(false);
    router.refresh(); 
  };

  const initials =
    user?.username?.trim()?.charAt(0)?.toUpperCase() || "👤";


  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () =>
      document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <>
      <nav className={styles.navbar}>
        <div className={styles.left}>
          <p>LOGO</p>
        </div>

        <div className={styles.right}>
          {user && (
            <button
              className={styles.newCanvasBtn}
              onClick={() => setIsModalOpen(true)}
            >
              + New canvas
            </button>
          )}

          <div className={styles.profileWrapper} ref={dropdownRef}>
            <button
              type="button"
              className={styles.profileDisplay}
              onClick={() => setIsDropdownOpen((o) => !o)}
              aria-haspopup="menu"
              aria-expanded={isDropdownOpen}
            >
              <div className={styles.profileCircle}>
                <span className={styles.initials}>{initials}</span>
              </div>
              {user && (
                <span className={styles.username}>{user.username}</span>
              )}
            </button>

            {isDropdownOpen && (
              <div className={styles.dropdownMenu} role="menu">
                {user ? (
                  <>
                    <Link href="/profile" className={styles.dropdownItem}>
                      Profile
                    </Link>
                    <Link href="/team" className={styles.dropdownItem}>
                      Team
                    </Link>
                    <Link href="/billing" className={styles.dropdownItem}>
                      Billing
                    </Link>
                    <hr className={styles.dropdownDivider} />
                    <button
                      className={styles.dropdownItem}
                      onClick={handleLogout}
                    >
                      Log out
                    </button>
                  </>
                ) : (
                  <>
                    <Link href="/login" className={styles.dropdownItem}>
                      Sign In / Login
                    </Link>
                    <Link href="/signup" className={styles.dropdownItem}>
                      Sign Up
                    </Link>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </nav>

      {user && isModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h2>Create Canvas</h2>
            <form onSubmit={handleSubmit}>
              <label>Email </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                readOnly
              />

              <label>Canvas Title</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                required
              />

              <label>Canvas Type</label>
              <select
                name="type"
                value={formData.type}
                onChange={handleChange}
                required
              >
                <option value="">Select Type</option>
                <option value="Website">Website</option>
                <option value="Figma">Figma</option>
                <option value="Image">Image</option>
                <option value="PDF">PDF</option>
                <option value="Video">Video</option>
              </select>

              {formData.type === "Website" && (
                <>
                  <label>Website URL</label>
                  <input
                    type="url"
                    name="extraField"
                    placeholder="https://example.com"
                    onChange={handleChange}
                  />
                </>
              )}

              {formData.type === "Figma" && (
                <>
                  <label>Figma URL</label>
                  <input
                    type="url"
                    name="extraField"
                    placeholder="https://figma.com/…"
                    onChange={handleChange}
                  />
                </>
              )}

              {formData.type === "Image" && (
                <>
                  <label>Upload Multiple Images</label>
                  <input
                    type="file"
                    name="file"
                    accept="image/*"
                    multiple
                    onChange={handleChange}
                  />
                </>
              )}

              {formData.type === "PDF" && (
                <>
                  <label>Upload PDF</label>
                  <input
                    type="file"
                    name="file"
                    accept="application/pdf"
                    onChange={handleChange}
                  />
                </>
              )}

              {formData.type === "Video" && (
                <>
                  <label>Upload Video</label>
                  <input
                    type="file"
                    name="file"
                    accept="video/*"
                    onChange={handleChange}
                  />
                </>
              )}

              <div className={styles.modalActions}>
                <button type="submit">Create</button>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
