import { useState, useEffect, useRef } from "react"
import "./App.css"

const TAG_OPTIONS = ["work", "personal", "idea", "todo", "important"]
const TAG_COLORS = {
  work: "#6366f1",
  personal: "#10b981",
  idea: "#f59e0b",
  todo: "#3b82f6",
  important: "#ef4444",
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return "just now"
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return `${d}d ago`
}

export default function App() {
  const [notes, setNotes] = useState([])
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [tag, setTag] = useState("")
  const [pinned, setPinned] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [search, setSearch] = useState("")
  const [filterTag, setFilterTag] = useState("")
  const [sortBy, setSortBy] = useState("newest")
  const [toast, setToast] = useState(null)
  const titleRef = useRef(null)

  useEffect(() => { fetchNotes() }, [])

  function showToast(msg, type = "success") {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 2800)
  }

  async function fetchNotes() {
    try {
      const res = await fetch("/api/notes")
      if (!res.ok) throw new Error("Failed to fetch")
      const data = await res.json()
      setNotes(Array.isArray(data) ? data : data.notes || [])
    } catch {
      setError("Could not connect to backend")
    } finally {
      setLoading(false)
    }
  }

  async function saveNote() {
    if (!title.trim()) {
      titleRef.current?.focus()
      return
    }
    try {
      const url = editingId ? "/api/notes/" + editingId : "/api/notes"
      const method = editingId ? "PUT" : "POST"
      await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content, tags: tag ? [tag] : [], pinned }),
      })
      cancelEdit()
      fetchNotes()
      showToast(editingId ? "Note updated" : "Note saved")
    } catch {
      setError("Failed to save note")
    }
  }

  async function deleteNote(id) {
    await fetch("/api/notes/" + id, { method: "DELETE" })
    fetchNotes()
    showToast("Note deleted", "error")
  }

  function startEdit(note) {
    setEditingId(note.id)
    setTitle(note.title)
    setContent(note.content || "")
    setTag(note.tags?.[0] || "")
    setPinned(note.pinned || false)
    titleRef.current?.focus()
  }

  function cancelEdit() {
    setEditingId(null)
    setTitle("")
    setContent("")
    setTag("")
    setPinned(false)
  }

  function handleKey(e) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") saveNote()
    if (e.key === "Escape") cancelEdit()
  }

  const filtered = notes
    .filter(n => {
      const q = search.toLowerCase()
      const matchSearch = !q || n.title.toLowerCase().includes(q) || (n.content || "").toLowerCase().includes(q)
      const matchTag = !filterTag || n.tags?.[0] === filterTag
      return matchSearch && matchTag
    })
    .sort((a, b) => {
      if (a.pinned && !b.pinned) return -1
      if (!a.pinned && b.pinned) return 1
      if (sortBy === "newest") return new Date(b.created_at) - new Date(a.created_at)
      if (sortBy === "oldest") return new Date(a.created_at) - new Date(b.created_at)
      return a.title.localeCompare(b.title)
    })

  const activeTags = [...new Set(notes.map(n => n.tags?.[0]).filter(Boolean))]

  return (
    <div className="app" onKeyDown={handleKey}>
      {toast && (
        <div className={`toast toast-${toast.type}`}>{toast.msg}</div>
      )}

      <header className="header">
        <div className="header-brand">
          <span className="brand-icon">📝</span>
          <h1>DevNotes</h1>
        </div>
        <p className="header-sub">Full-stack · Kubernetes · Redis · PostgreSQL</p>
      </header>

      <div className="layout">
        <aside className="panel-form">
          <div className={`form-card ${editingId ? "editing" : ""}`}>
            <div className="form-header">
              <span>{editingId ? "Edit note" : "New note"}</span>
              <span className="char-count">{content.length} chars</span>
            </div>

            <input
              ref={titleRef}
              className="input-title"
              type="text"
              placeholder="Title"
              value={title}
              onChange={e => setTitle(e.target.value)}
            />
            <textarea
              className="input-content"
              placeholder="Write your note... (Ctrl+Enter to save)"
              value={content}
              onChange={e => setContent(e.target.value)}
              rows={6}
            />

            <div className="tag-row">
              {TAG_OPTIONS.map(t => (
                <button
                  key={t}
                  className={`tag-chip ${tag === t ? "active" : ""}`}
                  style={{ "--tag-color": TAG_COLORS[t] }}
                  onClick={() => setTag(tag === t ? "" : t)}
                  type="button"
                >
                  {t}
                </button>
              ))}
            </div>

            <label className="pin-row">
              <input
                type="checkbox"
                checked={pinned}
                onChange={e => setPinned(e.target.checked)}
              />
              <span>Pin this note</span>
            </label>

            <div className="form-actions">
              <button className="btn-primary" onClick={saveNote}>
                {editingId ? "Update" : "Save note"}
              </button>
              {editingId && (
                <button className="btn-ghost" onClick={cancelEdit}>Cancel</button>
              )}
            </div>
          </div>

          <div className="stats-block">
            <div className="stat">
              <span className="stat-num">{notes.length}</span>
              <span className="stat-label">total</span>
            </div>
            <div className="stat">
              <span className="stat-num">{notes.filter(n => n.pinned).length}</span>
              <span className="stat-label">pinned</span>
            </div>
            <div className="stat">
              <span className="stat-num">{activeTags.length}</span>
              <span className="stat-label">tags used</span>
            </div>
          </div>
        </aside>

        <main className="panel-notes">
          <div className="toolbar">
            <div className="search-wrap">
              <span className="search-icon">⌕</span>
              <input
                className="search-input"
                type="text"
                placeholder="Search notes..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              {search && (
                <button className="search-clear" onClick={() => setSearch("")}>×</button>
              )}
            </div>

            <select
              className="sort-select"
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="alpha">A → Z</option>
            </select>
          </div>

          {activeTags.length > 0 && (
            <div className="filter-tags">
              <button
                className={`filter-chip ${!filterTag ? "active" : ""}`}
                onClick={() => setFilterTag("")}
              >all</button>
              {activeTags.map(t => (
                <button
                  key={t}
                  className={`filter-chip ${filterTag === t ? "active" : ""}`}
                  style={{ "--tag-color": TAG_COLORS[t] || "#6366f1" }}
                  onClick={() => setFilterTag(filterTag === t ? "" : t)}
                >{t}</button>
              ))}
            </div>
          )}

          {error && <div className="error-banner">{error}</div>}

          {loading ? (
            <div className="state-empty">
              <div className="spinner" />
              <p>Connecting to cluster...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="state-empty">
              <span className="empty-icon">{search ? "🔍" : "📋"}</span>
              <p>{search ? `No notes matching "${search}"` : "No notes yet — create one to the left"}</p>
            </div>
          ) : (
            <div className="notes-grid">
              {filtered.map(note => (
                <div
                  key={note.id}
                  className={`note-card ${note.pinned ? "is-pinned" : ""}`}
                >
                  {note.pinned && <span className="pin-badge">📌</span>}
                  {note.tags?.[0] && (
                    <span
                      className="note-tag"
                      style={{ "--tag-color": TAG_COLORS[note.tags[0]] || "#6366f1" }}
                    >{note.tags[0]}</span>
                  )}
                  <h3 className="note-title">{note.title}</h3>
                  {note.content && <p className="note-content">{note.content}</p>}
                  <div className="note-footer">
                    <span className="note-time">{timeAgo(note.created_at)}</span>
                    <div className="note-actions">
                      <button className="btn-edit" onClick={() => startEdit(note)}>Edit</button>
                      <button className="btn-delete" onClick={() => deleteNote(note.id)}>Delete</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}