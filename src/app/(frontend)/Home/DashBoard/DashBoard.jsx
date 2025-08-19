"use client";
import React, { useState, useMemo, useRef, useEffect } from "react";
import styles from "./DashBoard.module.css";

const DashBoard = ({ data }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOrder, setSortOrder] = useState("asc");
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterCategory, setFilterCategory] = useState("all");
  const [searchOpen, setSearchOpen] = useState(false);

  const filterRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (filterRef.current && !filterRef.current.contains(event.target)) {
        setFilterOpen(false);
      }
    }

    if (filterOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [filterOpen]);

  const filteredData = useMemo(() => {
    let filtered = data;

    if (filterCategory !== "all") {
      filtered = filtered.filter((item) => item.category === filterCategory);
    }

    if (searchTerm.trim()) {
      filtered = filtered.filter((item) =>
        item.title.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    filtered = filtered.sort((a, b) => {
      if (sortOrder === "asc") {
        return a.title.localeCompare(b.title);
      } else {
        return b.title.localeCompare(a.title);
      }
    });

    return filtered;
  }, [data, searchTerm, sortOrder, filterCategory]);

  return (
    <div className={styles.dashboardContainer}>
      <div className={styles.dashboardControls}>
        <button
          className={styles.controlBtn}
          onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
        >
          {sortOrder === "asc" ? "↑ Sort Asc" : "↓ Sort Desc"}
        </button>

        <div className={styles.filterWrapper} ref={filterRef}>
          <button
            className={styles.controlBtn}
            onClick={() => setFilterOpen(!filterOpen)}
          >
            ☰ Filter
          </button>
          {filterOpen && (
            <div className={styles.filterDropdown}>
              <button onClick={() => setFilterCategory("all")}>All</button>
              <button onClick={() => setFilterCategory("work")}>Work</button>
              <button onClick={() => setFilterCategory("personal")}>
                Personal
              </button>
              <button onClick={() => setFilterCategory("other")}>Other</button>
            </div>
          )}
        </div>

        <div className={styles.searchWrapper}>
          <button
            className={styles.searchIcon}
            onClick={() => setSearchOpen(!searchOpen)}
          >
            🔍
          </button>
          <input
            type="text"
            className={`${styles.controlSearch} ${
              searchOpen ? styles.showSearch : ""
            }`}
            placeholder="Search dashboard canvases..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>


      <div className={styles.dashboardResults}>
        {filteredData.length > 0 ? (
          filteredData.map((item) => (
            <div key={item.id} className={styles.dashboardCard}>
              <h4>{item.title}</h4>
              <p>{item.category}</p>
            </div>
          ))
        ) : (
          <p className={styles.noResults}>No results found</p>
        )}
      </div>
    </div>
  );
};

export default DashBoard;
