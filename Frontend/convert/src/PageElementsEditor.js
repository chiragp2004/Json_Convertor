import React, { useState, useEffect } from "react";

/**
 * PageElementsEditor Component
 * Handles CRUD operations for pageElements nested table
 * Similar to steps editor but with pageId auto-populated and non-editable
 */
export default function PageElementsEditor({
  pageData,
  pageIndex,
  jsonData,
  setJsonData,
  saveToBackend,
  formatHeader,
}) {
  const [editedElements, setEditedElements] = useState([]);
  const [deletedIndices, setDeletedIndices] = useState(new Set());
  const [newElementIndex, setNewElementIndex] = useState(null);
  const [editableCell, setEditableCell] = useState(null);

  // Reset state when page changes
  useEffect(() => {
    setEditedElements([]);
    setDeletedIndices(new Set());
    setNewElementIndex(null);
    setEditableCell(null);
  }, [pageIndex]);

  // Get base elements from the page
  const getBaseElements = () => pageData?.pageElements || [];

  // Get displayed elements (merge base with edits)
  const getDisplayedElements = () => {
    const base = getBaseElements();
    const displayed = base.map((el) => ({ ...el }));
    
    for (let i = 0; i < editedElements.length; i++) {
      if (editedElements[i]) {
        if (i < displayed.length) {
          displayed[i] = { ...displayed[i], ...editedElements[i] };
        } else {
          displayed[i] = { ...(editedElements[i] || {}) };
        }
      }
    }
    
    for (let i = base.length; i < editedElements.length; i++) {
      if (editedElements[i]) displayed[i] = { ...(editedElements[i] || {}) };
    }
    
    return displayed;
  };

  // Get element value for a specific row and key
  const getElementValue = (elementIdx, key) =>
    editedElements[elementIdx]?.[key] ?? getBaseElements()[elementIdx]?.[key] ?? "";

  // Get all keys from elements
  const getElementKeys = () => {
    const base = getBaseElements();
    if (base.length > 0) return Object.keys(base[0]);
    
    for (let i = 0; i < editedElements.length; i++) {
      if (editedElements[i] && Object.keys(editedElements[i]).length) {
        return Object.keys(editedElements[i]);
      }
    }
    
    return ["pageId", "name", "locator", "locatorValue"];
  };

  // Check if key is editable (pageId is not editable)
  const isEditableKey = (k) => k !== "pageId";

  // Focus on a specific cell
  const focusCell = (row, key) => setEditableCell({ row, col: key });

  // Handle keyboard navigation
  const handleCellKeyDown = (e, rowIdx, key, visibleKeys) => {
    const input = e.target;
    const currentIndex = visibleKeys.indexOf(key);

    const findNextEditableIndex = (start, step) => {
      let nextIndex = start + step;
      while (
        nextIndex >= 0 &&
        nextIndex < visibleKeys.length &&
        !isEditableKey(visibleKeys[nextIndex])
      ) {
        nextIndex += step;
      }
      return nextIndex;
    };

    if (
      e.key === "Tab" ||
      (e.key === "ArrowRight" && input.selectionStart === input.value.length)
    ) {
      e.preventDefault();
      let nextIndex = findNextEditableIndex(currentIndex, 1);

      if (nextIndex < visibleKeys.length) {
        focusCell(rowIdx, visibleKeys[nextIndex]);
      } else {
        const displayed = getDisplayedElements();
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
          const prevInput = document.querySelector(
            `td[data-row="${rowIdx}"][data-col="${visibleKeys[prevIndex]}"] input`
          );
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
              const prevInput = document.querySelector(
                `td[data-row="${prevRowIdx}"][data-col="${visibleKeys[lastEditableIndex]}"] input`
              );
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

  // Update local element value
  const updateLocalElementValue = (rowIdx, key, value) => {
    setEditedElements((prev) => {
      const updated = [...prev];
      updated[rowIdx] = { ...(updated[rowIdx] || {}) };
      updated[rowIdx][key] = value;
      return updated;
    });
  };

  // Add new element
  const addElementLocal = () => {
    const base = getBaseElements();
    const idx = Math.max(editedElements.length, base.length);
    
    // Auto-populate pageId from parent page
   const parentPageId = pageData?.pageId || pageData?.id || "";

    
    const newElement = {
      pageId: parentPageId,
      name: "",
      locator: "",
      locatorValue: "",
    };
    
    setEditedElements((prev) => {
      const updated = [...prev];
      updated[idx] = newElement;
      return updated;
    });
    
    setNewElementIndex(idx);
    setTimeout(() => focusCell(idx, "name"), 50);
  };

  // Delete element
  const deleteElementLocal = (elementIdx) => {
    const base = getBaseElements();
    
    if (elementIdx < base.length) {
      setDeletedIndices((prev) => new Set(prev).add(elementIdx));
      setEditedElements((prev) => {
        const updated = [...prev];
        updated[elementIdx] = undefined;
        return updated;
      });
    } else {
      setEditedElements((prev) => {
        const updated = [...prev];
        updated[elementIdx] = undefined;
        return updated;
      });
      if (newElementIndex === elementIdx) setNewElementIndex(null);
    }
    
    if (editableCell?.row === elementIdx) setEditableCell(null);
  };

  // Save changes to backend
  const saveChangesToBackend = () => {
    const base = getBaseElements();
    const newElements = [];
    
    // Merge existing elements with edits
    for (let i = 0; i < base.length; i++) {
      if (deletedIndices.has(i)) continue;
      newElements.push({ ...base[i], ...(editedElements[i] || {}) });
    }
    
    // Add new elements
    for (let i = base.length; i < editedElements.length; i++) {
      if (editedElements[i]) newElements.push({ ...editedElements[i] });
    }

    // Update jsonData
    const updatedData = { ...jsonData };
    updatedData.data = updatedData.data || {};
    updatedData.data.pageConfig = updatedData.data.pageConfig || [];

    if (!updatedData.data.pageConfig[pageIndex]) {
      alert("Cannot save: selected page not available.");
      return;
    }

    updatedData.data.pageConfig[pageIndex].pageElements = newElements;
    
    setJsonData(updatedData);
    saveToBackend(updatedData);
    
    // Reset state
    setEditedElements([]);
    setDeletedIndices(new Set());
    setNewElementIndex(null);
    setEditableCell(null);
    
    alert("Page elements saved successfully!");
  };

  // Cancel/Reset local edits
  const cancelLocalEdits = () => {
    if (newElementIndex !== null) {
      setEditedElements((prev) => {
        const updated = [...prev];
        const currentElement = updated[newElementIndex] || {};
        const pageId = currentElement.pageId;

        const resetElement = { pageId };
        const allKeys = getElementKeys();
        
        allKeys.forEach((key) => {
          if (key !== "pageId") {
            resetElement[key] = "";
          }
        });

        updated[newElementIndex] = resetElement;
        return updated;
      });
    }

    setEditableCell(null);
  };

  // Column resizing handler
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

  const displayed = getDisplayedElements();
  const visibleKeys = getElementKeys();

  return (
    <div className="steps-table-wrapper">
      <h3>Page Elements  {pageData?.name ?? ""}</h3>
      <div className="steps-table-container">
        <table className="json-table steps-table">
          <thead>
            <tr>
              <th>#</th>
              {visibleKeys.map((key) => (
                <th key={key} style={{ position: "sticky" }}>
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
            {displayed.map((element, elementIdx) => {
              if (deletedIndices.has(elementIdx)) return null;
              
              return (
                <tr
                  key={elementIdx}
                  className={newElementIndex === elementIdx ? "new-step-row" : ""}
                >
                  <td>{elementIdx + 1}</td>
                  {visibleKeys.map((key, i) => {
                    const cellValue = getElementValue(elementIdx, key);
                    const isEditing =
                      editableCell?.row === elementIdx &&
                      editableCell?.col === key;
                    
                    return (
                      <td key={i} data-row={elementIdx} data-col={key}>
                        {key === "pageId" ? (
                          // pageId is not editable, just display
                          <span style={{ color: "#050506ff", fontStyle: "italic" }}>
                            {cellValue || ""}
                          </span>
                        ) : isEditing ? (
                          <input
                            autoFocus
                            className={`step-input ${isEditing ? "editing" : ""}`}
                            value={cellValue}
                            onChange={(e) =>
                              updateLocalElementValue(elementIdx, key, e.target.value)
                            }
                            onKeyDown={(e) =>
                              handleCellKeyDown(e, elementIdx, key, visibleKeys)
                            }
                            onBlur={() => setEditableCell(null)}
                          />
                        ) : (
                          <span
                            className={`editable-cell ${isEditing ? "editing" : ""}`}
                            onClick={() => {
                              if (!isEditableKey(key)) return;
                              setEditableCell({ row: elementIdx, col: key });
                            }}
                          >
                            {cellValue || (
                              <span className="add-placeholder">+ add</span>
                            )}
                          </span>
                        )}
                      </td>
                    );
                  })}
                  <td>
                    <button
                      className="delete-btn"
                      onClick={() => deleteElementLocal(elementIdx)}
                    >
                      🗑 Delete
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="steps-actions">
        <button onClick={addElementLocal}>➕ Add Element</button>
        <button
          onClick={() => {
            const hasLocalEdits =
              editedElements.some(Boolean) || deletedIndices.size > 0;
            if (!hasLocalEdits) return alert("No local changes to save.");
            saveChangesToBackend();
          }}
        >
          💾 Save Changes
        </button>
        <button onClick={cancelLocalEdits}>❌ Reset</button>
      </div>
    </div>
  );
}