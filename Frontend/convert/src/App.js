import React, { useState, useEffect } from "react";
import "./App.css";

export default function App() {
  const [activeRoot, setActiveRoot] = useState(null);
  const [expandedPage, setExpandedPage] = useState(null);
  const [expandedTestSet, setExpandedTestSet] = useState(null);
  const [expandedTestCase, setExpandedTestCase] = useState(null);
  const [jsonData, setJsonData] = useState(null);
  const [selectedFileName, setSelectedFileName] = useState("No file chosen");

  const [editedSteps, setEditedSteps] = useState([]);
  const [deletedIndices, setDeletedIndices] = useState(new Set());
  const [newStepIndex, setNewStepIndex] = useState(null);
  const [editableCell, setEditableCell] = useState(null);

  // Settings dialog state
  const [showSettings, setShowSettings] = useState(false);
  const [editedApplication, setEditedApplication] = useState({});

  useEffect(() => {
    fetch("http://localhost:5000/api/data")
      .then((res) => res.json())
      .then((data) => {
        setJsonData(data);
        setSelectedFileName("data.json (from backend)");
        // Initialize editedApplication with current application data
        if (data?.data?.application) {
          setEditedApplication(data.data.application);
        }
      })
      .catch((err) => console.error("Failed to load data:", err));
  }, []);

  const downloadJson = () => {
    if (!jsonData) return alert("No JSON data to download.");

    // Merge edited steps if needed
    const updatedData = { ...jsonData };
    if (expandedTestSet !== null && expandedTestCase !== null) {
      const baseSteps = getBaseSteps();
      const newSteps = [];
      for (let i = 0; i < baseSteps.length; i++) {
        if (!deletedIndices.has(i)) newSteps.push({ ...baseSteps[i], ...(editedSteps[i] || {}) });
      }
      for (let i = baseSteps.length; i < editedSteps.length; i++) {
        if (editedSteps[i]) newSteps.push({ ...editedSteps[i] });
      }
      updatedData.data.testsetConfig.testsets[expandedTestSet].testCases[expandedTestCase].steps = newSteps;
    }

    // ✅ Ask user for new file name
    let filename = prompt("Enter file name:", selectedFileName.replace(" (from backend)", "").replace(" (local)", ""));
    if (!filename) return; // cancel download if user cancels

    if (!filename.endsWith(".json")) filename += ".json";

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(updatedData, null, 2));
    const downloadAnchorNode = document.createElement("a");
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", filename);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

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

  const handleFileUpload = (e) => {
    const fileInput = e.target;
    const file = fileInput.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsedData = JSON.parse(event.target.result);
        setJsonData(parsedData);
        setActiveRoot(null);
        setSelectedFileName(file.name + " (local)");
        setEditedSteps([]);
        setDeletedIndices(new Set());
        setNewStepIndex(null);
        setEditableCell(null);
        // Update editedApplication with new data
        if (parsedData?.data?.application) {
          setEditedApplication(parsedData.data.application);
        }
      } catch {
        alert("Invalid JSON file!");
      }
    };
    reader.readAsText(file);

    // Reset file input so same file can be selected again
    fileInput.value = null;
  };

  const formatHeader = (key) =>
    key
      ? key
          .replace(/_/g, " ")
          .replace(/([a-z])([A-Z])/g, "$1 $2")
          .split(" ")
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
          .join(" ")
      : "";

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

  const handleCellKeyDown = (e, rowIdx, key, visibleKeys) => {
    const input = e.target;
    const currentIndex = visibleKeys.indexOf(key);
    
    // --- Helper function to find the next/prev editable column index ---
    const findNextEditableIndex = (start, step) => {
        let nextIndex = start + step;
        while (nextIndex >= 0 && nextIndex < visibleKeys.length && !isEditableKey(visibleKeys[nextIndex])) {
            nextIndex += step;
        }
        return nextIndex;
    };

    if (e.key === "Tab" || (e.key === "ArrowRight" && input.selectionStart === input.value.length)) {
        // --- Smart Right Arrow and Tab Navigation ---
        e.preventDefault();
        
        let nextIndex = findNextEditableIndex(currentIndex, 1);
        
        if (nextIndex < visibleKeys.length) {
            // Move to next column in the current row
            focusCell(rowIdx, visibleKeys[nextIndex]);
        } else {
            // Move to the first editable column of the next row
            // const base = getBaseSteps();
            const displayed = getDisplayedSteps();
            const totalRows = displayed.filter((_, i) => !deletedIndices.has(i)).length;

            if (rowIdx + 1 < totalRows) {
                const firstEditable = visibleKeys.find(isEditableKey);
                if (firstEditable) {
                    focusCell(rowIdx + 1, firstEditable);
                } else {
                    setEditableCell(null);
                }
            } else {
                setEditableCell(null);
            }
        }
    } else if (e.key === "ArrowLeft" && input.selectionStart === 0) {
        // --- Left Arrow Navigation Fix (Only move if cursor is at the start) ---
        e.preventDefault();
        
        let prevIndex = findNextEditableIndex(currentIndex, -1);
        
        if (prevIndex >= 0) {
            // Move to previous column in the current row
            focusCell(rowIdx, visibleKeys[prevIndex]);
            
            // Set cursor to the end of the newly focused input
            setTimeout(() => {
                const prevInput = document.querySelector(`td[data-row="${rowIdx}"][data-col="${visibleKeys[prevIndex]}"] input`);
                if (prevInput) {
                    prevInput.selectionStart = prevInput.selectionEnd = prevInput.value.length;
                }
            }, 0);
        } else {
            // Move to the last editable column of the previous row
            if (rowIdx > 0) {
                const prevRowIdx = rowIdx - 1;
                let lastEditableIndex = findNextEditableIndex(visibleKeys.length, -1);
                
                if (lastEditableIndex >= 0) {
                    focusCell(prevRowIdx, visibleKeys[lastEditableIndex]);
                    
                    // Set cursor to the end of the newly focused input
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
        // --- Enter key behavior (same as before: just move to the next editable cell) ---
        e.preventDefault();
        
        let nextIndex = findNextEditableIndex(currentIndex, 1);

        if (nextIndex < visibleKeys.length) {
            focusCell(rowIdx, visibleKeys[nextIndex]);
        } else {
            setEditableCell(null);
        }
    }
};
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
    const parentTestCaseId = jsonData?.data?.testsetConfig?.testsets?.[expandedTestSet]?.testCases?.[expandedTestCase]?.id || "";
    const newStep = { testCaseId: parentTestCaseId, seq: "" };
    setEditedSteps((prev) => { const updated = [...prev]; updated[idx] = newStep; return updated; });
    setNewStepIndex(idx);
    setTimeout(() => focusCell(idx, "seq"), 50);
  };

  const deleteStepLocal = (stepIdx) => {
    const base = getBaseSteps();
    if (stepIdx < base.length) {
      setDeletedIndices((prev) => new Set(prev).add(stepIdx));
      setEditedSteps((prev) => { const updated = [...prev]; updated[stepIdx] = undefined; return updated; });
    } else {
      setEditedSteps((prev) => { const updated = [...prev]; updated[stepIdx] = undefined; return updated; });
      if (newStepIndex === stepIdx) setNewStepIndex(null);
    }
    if (editableCell?.row === stepIdx) setEditableCell(null);
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
    const updatedData = { ...jsonData };
    updatedData.data = updatedData.data || {};
    updatedData.data.testsetConfig = updatedData.data.testsetConfig || {};
    updatedData.data.testsetConfig.testsets = updatedData.data.testsetConfig.testsets || [];
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
    setEditedSteps([]);
    setDeletedIndices(new Set());
    setNewStepIndex(null);
    setEditableCell(null);
    alert("Local edits cancelled");
  };

  const openSettings = () => {
  if (jsonData?.data?.application) {
    const originalApp = Array.isArray(jsonData.data.application)
      ? jsonData.data.application[0]
      : jsonData.data.application;

    // Initialize editedApplication with all fields from original
    setEditedApplication({ ...originalApp });
  }
  setShowSettings(true);
};


  const closeSettings = () => {
    setShowSettings(false);
  };

  const handleApplicationChange = (key, value) => {
    setEditedApplication(prev => ({
      ...prev,
      [key]: value
    }));
  };

 const saveApplicationSettings = () => {
  if (!jsonData) return;

  const originalApp = Array.isArray(jsonData.data.application)
    ? jsonData.data.application[0]
    : jsonData.data.application;

  // Merge edited fields over original
  const mergedApp = { ...originalApp, ...editedApplication };

  const updatedData = {
    ...jsonData,
    data: {
      ...jsonData.data,
      application: [mergedApp], // keep array structure
    },
  };

  setJsonData(updatedData);
  saveToBackend(updatedData);
  setShowSettings(false);
  alert("Application settings saved!");
};


  // Function to render application data as table (same as in main content)
  const renderApplicationTable = (data) => {
  if (!data) return <p>No application data available</p>;

  // If array → take the first object
  const appData = Array.isArray(data) ? data[0] : data;
  if (!appData || typeof appData !== "object")
    return <p>No valid application data</p>;

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
              <td style={{ fontWeight: "600", background: "#f8fafc" }}>
                {formatHeader(key)}
              </td>
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

  // -------- Column Resize Handler --------
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

  const renderTable = (data, level = "root") => {
    if (!data) return <p>No data</p>;

    if (Array.isArray(data)) {
      let keysToDisplay = Object.keys(data[0] || {});
      if (level === "testsets") keysToDisplay = keysToDisplay.filter((k) => k !== "testCases" && k !== "steps");
      if (level === "testcases") keysToDisplay = keysToDisplay.filter((k) => k !== "steps");
      if (level === "pageconfig") keysToDisplay = keysToDisplay.filter((k) => k !== "pageElements");

      return (
        <div className="table-wrapper">
          <table className="json-table">
            <thead>
              <tr>
                <th style={{ width: "30px" }}></th>
                {keysToDisplay.map((key, i) => (
                  <th key={key} style={{ position: "relative" }}>
                    {formatHeader(key)}
                    <div
                      className="resize-handle"
                      onMouseDown={(e) => handleMouseDown(e, e.target.parentElement)}
                    />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, idx) => {
                const hasChildren =
                  (level === "pageconfig" && row.pageElements) ||
                  (level === "testsets" && row.testCases) ||
                  (level === "testcases" && row.steps);
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
                          if (level === "testsets") setExpandedTestSet(isExpanded ? null : idx);
                          if (level === "testcases") setExpandedTestCase(isExpanded ? null : idx);
                        }}
                      >
                        {hasChildren ? (isExpanded ? "➖" : "➕") : ""}
                      </td>
                      {keysToDisplay.map((key, i) => (
                        <td key={i}>
                          {key === "navigation" ? (
                            row[key]?.navigationValue ? (
                              <a href={row[key].navigationValue} target="_blank" rel="noopener noreferrer">
                                {row[key].navigationValue}
                              </a>
                            ) : (
                              "-"
                            )
                          ) : typeof row[key] === "object" ? (
                            JSON.stringify(row[key])
                          ) : (
                            String(row[key])
                          )}
                        </td>
                      ))}
                    </tr>

                    {/* PageConfig nested table */}
                    {level === "pageconfig" && expandedPage === idx && row.pageElements && (
                      <tr>
                        <td colSpan={keysToDisplay.length + 1} style={{ padding: 0 }}>
                          <div className="nested-table-wrapper">
                            {renderTable(row.pageElements, "pageelements")}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>

          {/* TestSets nested */}
          {level === "testsets" && expandedTestSet !== null && data[expandedTestSet].testCases && (
            <div style={{ marginTop: "10px" }}>
              <h3>Test Cases for {data[expandedTestSet].name}</h3>
              {renderTable(data[expandedTestSet].testCases, "testcases")}
            </div>
          )}

          {/* TestCases Steps */}
          {level === "testcases" && expandedTestCase !== null && data[expandedTestCase].steps && (
            <div className="steps-table-wrapper">
              <h3>Steps for {data[expandedTestCase].name}</h3>
              <div className="steps-table-container">
                {(() => {
                  const displayed = getDisplayedSteps();
                  const visibleKeys = getStepKeys();
                  return (
                    <table className="json-table steps-table">
                      <thead>
                        <tr>
                          <th>#</th>
                          {visibleKeys.map((key, i) => (
                            <th key={key} style={{ position: "" }}>
                              {formatHeader(key)}
                              <div
                                className="resize-handle"
                                onMouseDown={(e) => handleMouseDown(e, e.target.parentElement)}
                              />
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
                <button onClick={cancelLocalEdits}>❌ Cancel</button>
              </div>
            </div>
          )}
        </div>
      );
    }

    return <span>{String(data)}</span>;
  };

  const rootKeys = jsonData ? Object.keys(jsonData.data).filter(key => key !== "application") : [];

  return (
    <div className="layout">
      <div className="sidebar">
        <h3>Sections</h3>
        <div className="file-upload-wrapper">
          <label htmlFor="fileInput" className="file-label">Choose JSON File</label>
          <input type="file" id="fileInput" accept=".json" onChange={handleFileUpload} />
          <span className="file-name">{selectedFileName}</span>
          <button onClick={downloadJson} className="download-btn">
            📥 Download JSON
          </button>
        </div>

        {rootKeys.map((rootKey) => (
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
        ))}

        {/* Settings Icon at Bottom */}
        <div className="settings-icon-container">
          <button className="settings-icon-btn" onClick={openSettings} title="Application Settings">
            ⚙️ Application Settings
          </button>
        </div>
      </div>

      <div className="content">
        <h2>JSON Viewer (Backend Connected)</h2>
        {activeRoot ? (
          activeRoot === "testsetConfig" || activeRoot === "testsetConfigFlattend"
            ? renderTable(jsonData.data[activeRoot].testsets, "testsets")
            : activeRoot === "pageConfig"
            ? renderTable(jsonData.data[activeRoot], "pageconfig")
            : renderTable(jsonData.data[activeRoot])
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
              {jsonData?.data?.application ? (
                renderApplicationTable(jsonData.data.application)
              ) : (
                <p>No application data available</p>
              )}
            </div>
            <div className="dialog-actions">
              <button onClick={saveApplicationSettings} className="save-btn">Save Changes</button>
              <button onClick={closeSettings} className="cancel-btn"> Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
