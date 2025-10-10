import React, { useState, useEffect } from "react";
import PageElementsEditor from "./PageElementsEditor";
import ThemeToggle from "./ThemeToggle";
import "./App.css";

import "./theme.css";

// Full App.js — crash-safe and preserves all features from your previous code
export default function App() {
  const [activeRoot, setActiveRoot] = useState(null);
  const [expandedPage, setExpandedPage] = useState(null);
  const [expandedTestSet, setExpandedTestSet] = useState(null);
  const [expandedTestCase, setExpandedTestCase] = useState(null);

  // Initialize jsonData as object with data property to avoid null errors
  const [jsonData, setJsonData] = useState({ data: {} });
  const [selectedFileName, setSelectedFileName] = useState("No file chosen");

  const [editedSteps, setEditedSteps] = useState([]);
  const [deletedIndices, setDeletedIndices] = useState(new Set());
  const [newStepIndex, setNewStepIndex] = useState(null);
  const [editableCell, setEditableCell] = useState(null);

  // Settings dialog state
  const [showSettings, setShowSettings] = useState(false);
  const [editedApplication, setEditedApplication] = useState({});

  // Load from backend on mount — guard against empty or malformed responses
  useEffect(() => {
    fetch("http://localhost:5000/api/data")
      .then((res) => res.json())
      .then((data) => {
        if (!data || typeof data !== "object") data = { data: {} };
        if (!data.data) data.data = {};
        setJsonData(data);
        setSelectedFileName("data.json (from backend)");
        if (data.data.application) setEditedApplication(data.data.application);
      })
      .catch((err) => {
        console.error("Failed to load data:", err);
        setJsonData({ data: {} });
      });
  }, []);

  // Utility: format keys nicely
  const formatHeader = (key) =>
    key
      ? key
          .replace(/_/g, " ")
          .replace(/([a-z])([A-Z])/g, "$1 $2")
          .split(" ")
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
          .join(" ")
      : "";

  // --- Steps helpers (safe access) ---
  const getBaseSteps = () =>
    jsonData?.data?.testsetConfig?.testsets?.[expandedTestSet]?.testCases?.[expandedTestCase]?.steps || [];

  const getDisplayedSteps = () => {
    const base = getBaseSteps();
    const displayed = base.map((s) => ({ ...s }));
    for (let i = 0; i < editedSteps.length; i++) {
      if (editedSteps[i]) {
        if (i < displayed.length) displayed[i] = { ...displayed[i], ...editedSteps[i] };
        else displayed[i] = { ...(editedSteps[i] || {}) };
      }
    }
    for (let i = base.length; i < editedSteps.length; i++) {
      if (editedSteps[i]) displayed[i] = { ...(editedSteps[i] || {}) };
    }
    return displayed;
  };

  const getStepValue = (stepIdx, key) => editedSteps[stepIdx]?.[key] ?? getBaseSteps()[stepIdx]?.[key] ?? "";

  const getStepKeys = () => {
    const base = getBaseSteps();
    if (base.length > 0) return Object.keys(base[0]);
    for (let i = 0; i < editedSteps.length; i++) {
      if (editedSteps[i] && Object.keys(editedSteps[i]).length) return Object.keys(editedSteps[i]);
    }
    return ["testCaseId", "seq"];
  };

  const isEditableKey = (k) => k !== "testCaseId";
  const focusCell = (row, key) => setEditableCell({ row, col: key });

  // --- Keyboard navigation inside step inputs ---
  const handleCellKeyDown = (e, rowIdx, key, visibleKeys) => {
    const input = e.target;
    const currentIndex = visibleKeys.indexOf(key);

    // Helper to walk to next/prev editable index
    const findNextEditableIndex = (start, step) => {
      let nextIndex = start + step;
      while (nextIndex >= 0 && nextIndex < visibleKeys.length && !isEditableKey(visibleKeys[nextIndex])) {
        nextIndex += step;
      }
      return nextIndex;
    };

    if (e.key === "Tab" || (e.key === "ArrowRight" && input.selectionStart === input.value.length)) {
      e.preventDefault();
      let nextIndex = findNextEditableIndex(currentIndex, 1);

      if (nextIndex < visibleKeys.length) {
        focusCell(rowIdx, visibleKeys[nextIndex]);
      } else {
        const displayed = getDisplayedSteps();
        // compute visible rows (skip deleted)
        const totalRows = displayed.filter((_, i) => !deletedIndices.has(i)).length;
        if (rowIdx + 1 < totalRows) {
          const firstEditable = visibleKeys.find(isEditableKey);
          if (firstEditable) focusCell(rowIdx + 1, firstEditable);
          else setEditableCell(null);
        } else {
          setEditableCell(null);
        }
      }
    } else if (e.key === "ArrowLeft" && input.selectionStart === 0) {
      e.preventDefault();
      let prevIndex = findNextEditableIndex(currentIndex, -1);
      if (prevIndex >= 0) {
        focusCell(rowIdx, visibleKeys[prevIndex]);
        setTimeout(() => {
          const prevInput = document.querySelector(`td[data-row="${rowIdx}"][data-col="${visibleKeys[prevIndex]}"] input`);
          if (prevInput) {
            prevInput.selectionStart = prevInput.selectionEnd = prevInput.value.length;
          }
        }, 0);
      } else {
        if (rowIdx > 0) {
          const prevRowIdx = rowIdx - 1;
          let lastEditableIndex = findNextEditableIndex(visibleKeys.length, -1);
          if (lastEditableIndex >= 0) {
            focusCell(prevRowIdx, visibleKeys[lastEditableIndex]);
            setTimeout(() => {
              const prevInput = document.querySelector(`td[data-row="${prevRowIdx}"][data-col="${visibleKeys[lastEditableIndex]}"] input`);
              if (prevInput) {
                prevInput.selectionStart = prevInput.selectionEnd = prevInput.value.length;
              }
            }, 0);
          } else {
            setEditableCell(null);
          }
        } else {
          setEditableCell(null);
        }
      }
    } else if (e.key === "Enter") {
      e.preventDefault();
      let nextIndex = findNextEditableIndex(currentIndex, 1);
      if (nextIndex < visibleKeys.length) {
        focusCell(rowIdx, visibleKeys[nextIndex]);
      } else {
        setEditableCell(null);
      }
    }
  };

  // --- Local edit helpers ---
  const updateLocalStepValue = (rowIdx, key, value) => {
    setEditedSteps((prev) => {
      const updated = [...prev];
      updated[rowIdx] = { ...(updated[rowIdx] || {}) };
      updated[rowIdx][key] = value;
      return updated;
    });
  };

  const addStepLocal = () => {
    const base = getBaseSteps();
    const idx = Math.max(editedSteps.length, base.length);
    const parentTestCaseId =
      jsonData?.data?.testsetConfig?.testsets?.[expandedTestSet]?.testCases?.[expandedTestCase]?.id || "";
    const newStep = { testCaseId: parentTestCaseId, seq: "" };
    setEditedSteps((prev) => {
      const updated = [...prev];
      updated[idx] = newStep;
      return updated;
    });
    setNewStepIndex(idx);
    setTimeout(() => focusCell(idx, "seq"), 50);
  };

  const deleteStepLocal = (stepIdx) => {
    const base = getBaseSteps();
    if (stepIdx < base.length) {
      setDeletedIndices((prev) => new Set(prev).add(stepIdx));
      setEditedSteps((prev) => {
        const updated = [...prev];
        updated[stepIdx] = undefined;
        return updated;
      });
    } else {
      setEditedSteps((prev) => {
        const updated = [...prev];
        updated[stepIdx] = undefined;
        return updated;
      });
      if (newStepIndex === stepIdx) setNewStepIndex(null);
    }
    if (editableCell?.row === stepIdx) setEditableCell(null);
  };

  // --- Backend interactions ---
  const saveToBackend = (updatedData) => {
    fetch("http://localhost:5000/api/data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updatedData),
    })
      .then((res) => res.json())
      .then((msg) => console.log("✅ Saved:", msg))
      .catch((err) => console.error("❌ Save failed:", err));
  };

  const saveChangesToBackend = () => {
    const base = getBaseSteps();
    const newSteps = [];
    for (let i = 0; i < base.length; i++) {
      if (deletedIndices.has(i)) continue;
      newSteps.push({ ...base[i], ...(editedSteps[i] || {}) });
    }
    for (let i = base.length; i < editedSteps.length; i++) {
      if (editedSteps[i]) newSteps.push({ ...editedSteps[i] });
    }
    // apply to a guarded copy
    const updatedData = { ...jsonData };
    updatedData.data = updatedData.data || {};
    updatedData.data.testsetConfig = updatedData.data.testsetConfig || {};
    updatedData.data.testsetConfig.testsets = updatedData.data.testsetConfig.testsets || [];
    // ensure target testset/testcase exist (safe guard)
    if (!updatedData.data.testsetConfig.testsets[expandedTestSet]) {
      alert("Cannot save: selected testset not available.");
      return;
    }
    if (!updatedData.data.testsetConfig.testsets[expandedTestSet].testCases[expandedTestCase]) {
      alert("Cannot save: selected testcase not available.");
      return;
    }
    updatedData.data.testsetConfig.testsets[expandedTestSet].testCases[expandedTestCase].steps = newSteps;
    setJsonData(updatedData);
    saveToBackend(updatedData);
    setEditedSteps([]);
    setDeletedIndices(new Set());
    setNewStepIndex(null);
    setEditableCell(null);
    alert("Changes saved to backend!");
  };

const cancelLocalEdits = () => {
  // If there is a new row being added, reset all fields except testCaseId
  if (newStepIndex !== null) {
    setEditedSteps(prev => {
      const updated = [...prev];
      const currentStep = updated[newStepIndex] || {};
      const testCaseId = currentStep.testCaseId; // Preserve testCaseId
      
      // Get all keys and reset them to empty except testCaseId
      const resetStep = { testCaseId };
      const allKeys = getStepKeys();
      allKeys.forEach(key => {
        if (key !== 'testCaseId') {
          resetStep[key] = '';
        }
      });
      
      updated[newStepIndex] = resetStep;
      return updated;
    });
  }

  // Clear focus on any active input field
  setEditableCell(null); 
};


  // --- Settings (Application) dialog ---
  const openSettings = () => {
    if (jsonData?.data?.application) {
      const originalApp = Array.isArray(jsonData.data.application)
        ? jsonData.data.application[0]
        : jsonData.data.application;
      setEditedApplication({ ...originalApp });
    } else {
      setEditedApplication({});
    }
    setShowSettings(true);
  };

  const closeSettings = () => setShowSettings(false);

  const handleApplicationChange = (key, value) =>
    setEditedApplication((prev) => ({ ...prev, [key]: value }));

  const saveApplicationSettings = () => {
    if (!jsonData) return;
    const originalApp = Array.isArray(jsonData.data.application)
      ? jsonData.data.application[0]
      : jsonData.data.application;
    const mergedApp = { ...(originalApp || {}), ...editedApplication };
    const updatedData = {
      ...jsonData,
      data: {
        ...jsonData.data,
        application: [mergedApp],
      },
    };
    setJsonData(updatedData);
    saveToBackend(updatedData);
    setShowSettings(false);
    alert("Application settings saved!");
  };

  const renderApplicationTable = (data) => {
    if (!data) return <p>No application data available</p>;

    const appData = Array.isArray(data) ? data[0] : data;
    if (!appData || typeof appData !== "object") return <p>No valid application data</p>;

    const keys = Object.keys(appData);

    return (
      <div className="table-wrapper">
        <table className="json-table application-table">
          <thead>
            <tr>
              <th>Property</th>
              <th>Value</th>
            </tr>
          </thead>
          <tbody>
            {keys.map((key) => (
              <tr key={key}>
                <td style={{ fontWeight: "600", background: "#f8fafc" }}>{formatHeader(key)}</td>
                <td>
                  <input
                    type="text"
                    value={editedApplication[key] ?? appData[key] ?? ""}
                    onChange={(e) => handleApplicationChange(key, e.target.value)}
                    className="application-input"
                    placeholder={`Enter ${formatHeader(key)}`}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
     
      </div>
    );
  };

  // --- Column resizing ---
  const handleMouseDown = (e, th) => {
    const startX = e.clientX;
    const startWidth = th.offsetWidth;

    const handleMouseMove = (event) => {
      const newWidth = startWidth + (event.clientX - startX);
      if (newWidth > 30) th.style.width = `${newWidth}px`;
    };

    const handleMouseUp = () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  // --- Table rendering for arrays/objects (safe) ---
  const renderTable = (data, level = "root") => {
    if (data === undefined || data === null) return <p>No data</p>;

    if (Array.isArray(data)) {
      const firstRow = data[0] || {};
      let keysToDisplay = Object.keys(firstRow);
      if (level === "testsets") keysToDisplay = keysToDisplay.filter((k) => k !== "testCases" && k !== "steps");
      if (level === "testcases") keysToDisplay = keysToDisplay.filter((k) => k !== "steps");
      if (level === "pageconfig") keysToDisplay = keysToDisplay.filter((k) => k !== "pageElements");

      return (
        <div className="table-wrapper">
          <table className="json-table">
            <thead>
              <tr>
                <th style={{ width: "30px" }}></th>
                {keysToDisplay.map((key) => (
                  <th key={key} style={{ position: "relative" }}>
                    {formatHeader(key)}
                    <div className="resize-handle" onMouseDown={(e) => handleMouseDown(e, e.target.parentElement)} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, idx) => {
                const safeRow = row || {};
                const hasChildren =
                  (level === "pageconfig" && safeRow.pageElements) ||
                  (level === "testsets" && safeRow.testCases) ||
                  (level === "testcases" && safeRow.steps);
                const isExpanded =
                  (level === "pageconfig" && expandedPage === idx) ||
                  (level === "testsets" && expandedTestSet === idx) ||
                  (level === "testcases" && expandedTestCase === idx);

                return (
                  <React.Fragment key={idx}>
                    <tr>
                      <td
                        style={{ cursor: hasChildren ? "pointer" : "default", textAlign: "center", fontWeight: "bold" }}
                        onClick={() => {
                          if (!hasChildren) return;
                          if (level === "pageconfig") setExpandedPage(isExpanded ? null : idx);
                          if (level === "testsets") {
                            setExpandedTestSet(isExpanded ? null : idx);
                            setExpandedTestCase(null);
                            setEditedSteps([]);
                            setDeletedIndices(new Set());
                            setNewStepIndex(null);
                            setEditableCell(null);
                          }
                          if (level === "testcases") setExpandedTestCase(isExpanded ? null : idx);
                        }}
                      >
                        {hasChildren ? (isExpanded ? "➖" : "➕") : ""}
                      </td>

                      {keysToDisplay.map((key, i) => (
                        <td key={i}>
                          {key === "navigation" ? (
                            safeRow[key]?.navigationValue ? (
                              <a href={safeRow[key].navigationValue} target="_blank" rel="noopener noreferrer">
                                {safeRow[key].navigationValue}
                              </a>
                            ) : (
                              "-"
                            )
                          ) : typeof safeRow[key] === "object" ? (
                            JSON.stringify(safeRow[key])
                          ) : (
                            String(safeRow[key])
                          )}
                        </td>
                      ))}
                    </tr>

                    {/* nested pageElements */}
{level === "pageconfig" && expandedPage === idx && safeRow.pageElements && (
  <tr>
    <td colSpan={keysToDisplay.length + 1} style={{ padding: 0 }}>
      <PageElementsEditor
        pageData={safeRow}
        pageIndex={idx}
        jsonData={jsonData}
        setJsonData={setJsonData}
        saveToBackend={saveToBackend}
        formatHeader={formatHeader}
      />
    </td>
  </tr>
)}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>

          {/* If testsets level — show nested testcases below */}
          {level === "testsets" && expandedTestSet !== null && data[expandedTestSet]?.testCases && (
            <div style={{ marginTop: "10px" }}>
              <h3>Test Cases for {data[expandedTestSet]?.name ?? "—"}</h3>
              {renderTable(data[expandedTestSet].testCases, "testcases")}
            </div>
          )}

          {/* If testcases level — show steps editor when a testcase is expanded */}
          {level === "testcases" && expandedTestCase !== null && data[expandedTestCase]?.steps && (
            <div className="steps-table-wrapper">
              <h3>Steps for {data[expandedTestCase]?.name ?? "—"}</h3>
              <div className="steps-table-container">
                {(() => {
                  const displayed = getDisplayedSteps();
                  const visibleKeys = getStepKeys();
                  return (
                    <table className="json-table steps-table">
                      <thead>
                        <tr>
                          <th>#</th>
                          {visibleKeys.map((key) => (
                            <th key={key} style={{ position: "" }}>
                              {formatHeader(key)}
                              <div className="resize-handle" onMouseDown={(e) => handleMouseDown(e, e.target.parentElement)} />
                            </th>
                          ))}
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {displayed.map((step, stepIdx) => {
                          if (deletedIndices.has(stepIdx)) return null;
                          return (
                            <tr key={stepIdx} className={newStepIndex === stepIdx ? "new-step-row" : ""}>
                              <td>{stepIdx + 1}</td>
                              {visibleKeys.map((key, i) => {
                                const cellValue = getStepValue(stepIdx, key);
                                const isEditing = editableCell?.row === stepIdx && editableCell?.col === key;
                                return (
                                  <td key={i} data-row={stepIdx} data-col={key}>
                                    {key === "testCaseId" ? (
                                      cellValue || ""
                                    ) : isEditing ? (
                                      <input
                                        autoFocus
                                        className={`step-input ${isEditing ? "editing" : ""}`}
                                        value={cellValue}
                                        onChange={(e) => updateLocalStepValue(stepIdx, key, e.target.value)}
                                        onKeyDown={(e) => handleCellKeyDown(e, stepIdx, key, visibleKeys)}
                                        onBlur={() => setEditableCell(null)}
                                      />
                                    ) : (
                                      <span
                                        className={`editable-cell ${isEditing ? "editing" : ""}`}
                                        onClick={() => {
                                          if (!isEditableKey(key)) return;
                                          setEditableCell({ row: stepIdx, col: key });
                                        }}
                                      >
                                        {cellValue || <span className="add-placeholder">+ add</span>}
                                      </span>
                                    )}
                                  </td>
                                );
                              })}
                              <td>
                                <button className="delete-btn" onClick={() => deleteStepLocal(stepIdx)}>
                                  🗑 Delete
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  );
                })()}
              </div>

              <div className="steps-actions">
                <button onClick={addStepLocal}>➕ Add Step</button>
                <button
                  onClick={() => {
                    const hasLocalEdits = editedSteps.some(Boolean) || deletedIndices.size > 0;
                    if (!hasLocalEdits) return alert("No local changes to save.");
                    saveChangesToBackend();
                  }}
                >
                  💾 Save Changes
                </button>
                <button onClick={cancelLocalEdits}>❌ Reset</button>
              </div>
            </div>
          )}
          
        </div>
      );
    }

    // If not array, just show value/stringified
    return <span>{String(data)}</span>;
  };

  // compute rootKeys safely (exclude application)
  const rootKeys = jsonData && jsonData.data ? Object.keys(jsonData.data).filter((key) => key !== "application") : [];

  // --- File upload/download handlers ---
  const handleFileUpload = (e) => {
  const fileInput = e.target;
  const file = fileInput.files[0];
  if (!file) return;

  // 🔹 Clear old data first to force re-render
  setJsonData(null);
  setActiveRoot(null);
  setEditedApplication({});
  setEditedSteps([]);
  setDeletedIndices(new Set());
  setNewStepIndex(null);
  setEditableCell(null);

  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const parsedData = JSON.parse(event.target.result);

      // 🔹 Normalize data shape
      const normalized =
        parsedData && typeof parsedData === "object" && parsedData.data
          ? parsedData
          : { data: parsedData || {} };

      // 🔹 Update state with new data
      setJsonData(normalized);
      setSelectedFileName(file.name + " (local)");

      // 🔹 Handle 'application' section if available
      if (normalized.data.application) {
        setEditedApplication(normalized.data.application);
      } else {
        setEditedApplication({});
      }
    } catch (error) {
      alert("Invalid JSON file!");
    }
  };
  reader.readAsText(file);

  // 🔹 Reset input to allow re-uploading same file
  fileInput.value = null;
};

  const downloadJson = () => {
    if (!jsonData) return alert("No JSON data to download.");

    // Merge edited steps before download if editing current testcase
    const updatedData = JSON.parse(JSON.stringify(jsonData)); // deep copy
    if (expandedTestSet !== null && expandedTestCase !== null) {
      const baseSteps = getBaseSteps();
      const newSteps = [];
      for (let i = 0; i < baseSteps.length; i++) {
        if (!deletedIndices.has(i)) newSteps.push({ ...baseSteps[i], ...(editedSteps[i] || {}) });
      }
      for (let i = baseSteps.length; i < editedSteps.length; i++) {
        if (editedSteps[i]) newSteps.push({ ...editedSteps[i] });
      }
      if (!updatedData.data) updatedData.data = {};
      if (!updatedData.data.testsetConfig) updatedData.data.testsetConfig = {};
      if (!updatedData.data.testsetConfig.testsets) updatedData.data.testsetConfig.testsets = [];
      if (updatedData.data.testsetConfig.testsets[expandedTestSet] && updatedData.data.testsetConfig.testsets[expandedTestSet].testCases[expandedTestCase]) {
        updatedData.data.testsetConfig.testsets[expandedTestSet].testCases[expandedTestCase].steps = newSteps;
      }
    }

    let filename = prompt("Enter file name:", selectedFileName.replace(" (from backend)", "").replace(" (local)", ""));
    if (!filename) return;
    if (!filename.endsWith(".json")) filename += ".json";

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(updatedData, null, 2));
    const downloadAnchorNode = document.createElement("a");
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", filename);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  // Reset to empty store button (optional)
  const resetToEmpty = () => {
    if (!window.confirm("Reset data to empty? This will clear UI state (not backend).")) return;
    setJsonData({ data: {} });
    setActiveRoot(null);
    setEditedSteps([]);
    setDeletedIndices(new Set());
    setSelectedFileName("No file chosen");
  };

  return (
    <div className="layout">
      <div className="sidebar">
        <h3>Sections</h3>
        <ThemeToggle />
        <div className="file-upload-wrapper">
          <label htmlFor="fileInput" className="file-label">Choose JSON File</label>
          <input type="file" id="fileInput" accept=".json" onChange={handleFileUpload} />
          <span className="file-name">{selectedFileName}</span>
          <button onClick={downloadJson} className="download-btn">📥 Download JSON</button>
          <button onClick={resetToEmpty} className="reset-btn" style={{ marginLeft: "8px" }}>♻️ Clear</button>
        </div>

        {rootKeys.length > 0 ? (
          rootKeys.map((rootKey) => (
            <button
              key={rootKey}
              className={`menu-btn ${activeRoot === rootKey ? "active" : ""}`}
              onClick={() => {
                setActiveRoot(rootKey);
                setExpandedPage(null);
                setExpandedTestSet(null);
                setExpandedTestCase(null);
                setEditedSteps([]);
                setDeletedIndices(new Set());
                setNewStepIndex(null);
                setEditableCell(null);
              }}
            >
              {formatHeader(rootKey)}
            </button>
          ))
        ) : (
          <p style={{ marginTop: "10px", fontSize: "14px", color: "#777" }}>No data sections</p>
        )}

        <div style={{ marginTop: "auto", padding: "10px" }}>
          
        </div>

        <div className="settings-icon-container">
          <button className="settings-icon-btn" onClick={openSettings} title="Application Settings">⚙️ Application Settings</button>
        </div>
      </div>

      <div className="content">
        <h2>JSON Viewer (Backend Connected)</h2>
        {activeRoot ? (
          activeRoot === "testsetConfig" || activeRoot === "testsetConfigFlattend"
            ? renderTable(jsonData.data[activeRoot]?.testsets || [], "testsets")
            : activeRoot === "pageConfig"
            ? renderTable(jsonData.data[activeRoot] || [], "pageconfig")
            : renderTable(jsonData.data[activeRoot] ?? jsonData.data[activeRoot] ?? "")
        ) : (
          <p className="placeholder">Select a section from the left menu</p>
        )}
      </div>

      {/* Settings Dialog */}
      {showSettings && (
        <div className="modal-overlay">
          <div className="settings-dialog">
            <div className="dialog-header">
              <h3>Application Configuration</h3>
              <button className="close-btn" onClick={closeSettings}>×</button>
            </div>
            <div className="dialog-content">
              {jsonData?.data?.application ? renderApplicationTable(jsonData.data.application) : <p>No application data available</p>}
            </div>
            <div className="dialog-actions">
              <button onClick={saveApplicationSettings} className="save-btn">Save Changes</button>
              
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
