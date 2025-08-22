"use client";
import React, { useState } from "react";
import styles from "./CanvasSettings.module.css";

const CanvasSettings = () => {
  const [activeTab, setActiveTab] = useState("version");

  const [versions, setVersions] = useState([
    { id: 1, type: "Manual", url: "https://example.com" },
    { id: 2, type: "Proxy", url: "https://demo.com" },
  ]);

  const [newVersion, setNewVersion] = useState({
    type: "Manual",
    url: "",
    figmaUrl: "",
    assets: [],
  });

  const editors = [
    { id: 1, name: "veer", email: "veer@example.com" },
    { id: 2, name: "veerendra", email: "veerendra@example.com" },
  ];

  const guests = [
    { id: 1, name: "nadh", email: "nadh@example.com" },
  ];

  const viewports = [
    { id: 1, name: "Desktop", width: 1440, height: 900 },
    { id: 2, name: "Mobile", width: 375, height: 812 },
  ];

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (files) {
      setNewVersion((prev) => ({ ...prev, [name]: Array.from(files) }));
    } else {
      setNewVersion((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const newEntry = {
      id: versions.length + 1,
      type: newVersion.type,
      url: newVersion.url,
      figmaUrl: newVersion.figmaUrl,
      assets: newVersion.assets,
    };
    console.log("✅ New Version Saved:", newEntry);
    setVersions((prev) => [...prev, newEntry]);
    setNewVersion({ type: "Manual", url: "", figmaUrl: "", assets: [] });
  };

  return (
    <div className={styles.container}>
      <div className={styles.sidebar}>
        <button
          className={`${styles.tabButton} ${activeTab === "version" ? styles.active : ""}`}
          onClick={() => setActiveTab("version")}
        >
          Version
        </button>
        <button
          className={`${styles.tabButton} ${activeTab === "editor" ? styles.active : ""}`}
          onClick={() => setActiveTab("editor")}
        >
          Editor
        </button>
        <button
          className={`${styles.tabButton} ${activeTab === "guest" ? styles.active : ""}`}
          onClick={() => setActiveTab("guest")}
        >
          Guest
        </button>
        <button
          className={`${styles.tabButton} ${activeTab === "viewport" ? styles.active : ""}`}
          onClick={() => setActiveTab("viewport")}
        >
          Viewport
        </button>
        <button
          className={`${styles.tabButton} ${activeTab === "task" ? styles.active : ""}`}
          onClick={() => setActiveTab("task")}
        >
          Task Manager
        </button>
      </div>

      <div className={styles.content}>
        {activeTab === "version" && (
          <div className={styles.section}>
            <h2>CREATE NEW VERSION</h2>
            <form onSubmit={handleSubmit}>
              <div>
                <h3>Website Injection</h3>
                <select
                  name="type"
                  value={newVersion.type}
                  onChange={handleChange}
                >
                  <option>Manual</option>
                  <option>Proxy</option>
                  <option>Chrome Extension</option>
                </select>
                <input
                  type="text"
                  name="url"
                  placeholder="Website URL"
                  value={newVersion.url}
                  onChange={handleChange}
                />
              </div>
              <div>
                <h3>Upload Assets</h3>
                <input
                  type="file"
                  name="assets"
                  multiple
                  onChange={handleChange}
                />
                <input
                  type="text"
                  name="figmaUrl"
                  placeholder="Figma File URL"
                  value={newVersion.figmaUrl}
                  onChange={handleChange}
                />
              </div>
              <button type="submit">Save Version</button>
            </form>
            {/* <ul>
              {versions.map((v) => (
                <li key={v.id}>
                  {v.type} - {v.url} {v.figmaUrl && `(Figma: ${v.figmaUrl})`}
                </li>
              ))}
            </ul> */}
          </div>
        )}

        {activeTab === "editor" && (
          <div className={styles.section}>
            <h2>Editors</h2>
            <button>Add New</button>
            <table>
              <thead>
                <tr>
                  <th>Name</th><th>Email</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {editors.map(e => (
                  <tr key={e.id}>
                    <td>{e.name}</td>
                    <td>{e.email}</td>
                    <td><button>Delete</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === "guest" && (
          <div className={styles.section}>
            <h2>Guests</h2>
            <button>Add New</button>
            <table>
              <thead>
                <tr>
                  <th>Name</th><th>Email</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {guests.map(g => (
                  <tr key={g.id}>
                    <td>{g.name}</td>
                    <td>{g.email}</td>
                    <td><button>Delete</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === "viewport" && (
          <div className={styles.section}>
            <h2>Viewport</h2>
            <button>Add New</button>
            <table>
              <thead>
                <tr>
                  <th>Name</th><th>Width</th><th>Height</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {viewports.map(v => (
                  <tr key={v.id}>
                    <td>{v.name}</td>
                    <td>{v.width}</td>
                    <td>{v.height}</td>
                    <td><button>Delete</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === "task" && (
          <div className={styles.section}>
            <h2>Task Manager</h2>
            <p>Dummy task list (will connect to backend later).</p>
            <ul>
              <li>Fix bug in injection</li>
              <li>Update editor list</li>
              <li>Optimize viewport configs</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default CanvasSettings;
