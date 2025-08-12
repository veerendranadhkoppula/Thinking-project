"use client";

import { useEffect, useState } from "react";
import styles from "./Profile.module.css";
import { Eye, EyeOff } from "lucide-react"; // npm install lucide-react

export default function ProfilePage() {
  const [user, setUser] = useState<{ username: string; email: string } | null>(null);
  const [form, setForm] = useState({ currentPassword: "", newPassword: "" });
  const [message, setMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    fetch("/api/user/me")
      .then((res) => res.json())
      .then((data) => {
        if (!data.error) {
          setUser(data);
        }
      });
  }, []);

  const handlePasswordChange = async () => {
    const res = await fetch("/api/user/update-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const data = await res.json();
    setMessage(data.message || data.error);
  };

  if (!user) return <p>Loading...</p>;

  const initials = user.username
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  return (
    <div className={styles.container}>
      <div className={styles.avatar}>{initials}</div>

      <div className={styles.field}>
        <label>Full Name</label>
        <input type="text" value={user.username} readOnly />
      </div>

      <div className={styles.field}>
        <label>Email</label>
        <input type="email" value={user.email} readOnly />
      </div>

      <div className={styles.field}>
        <label>Current Password</label>
        <div className={styles.passwordWrapper}>
          <input
            type={showPassword ? "text" : "password"}
            onChange={(e) => setForm({ ...form, currentPassword: e.target.value })}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className={styles.eyeBtn}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </div>

      <div className={styles.field}>
        <label>New Password</label>
        <input
          type="password"
          onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
        />
      </div>

      <button className={styles.btn} onClick={handlePasswordChange}>
        Change Password
      </button>

      {message && <p className={styles.message}>{message}</p>}
    </div>
  );
}
