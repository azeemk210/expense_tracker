// src/App.jsx
import { useEffect, useState } from "react";
import {
  QueryClient,
  QueryClientProvider,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { Routes, Route, Link, useNavigate, useParams } from "react-router-dom";
import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000",
});

// ---------- Helpers ----------
function INR(n) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(n || 0);
}
function formatDisplayDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const day = d.getDate().toString().padStart(2, "0");
  const month = d.toLocaleString("en-GB", { month: "short" });
  const year = d.getFullYear();
  return `${day} ${month}, ${year}`;
}
function formatRange(rangeStr) {
  if (!rangeStr || rangeStr === "-") return "-";
  const parts = rangeStr.split("—").map((s) => s.trim());
  if (parts.length !== 2) return rangeStr;
  const withComma = (s) => formatDisplayDate(s);
  return `${withComma(parts[0])} — ${withComma(parts[1])}`;
}

// ---------- Categories (India) ----------
const CATEGORY_OPTIONS = [
  { name: "Bricks", aliases: ["Brick", "It", "Eent", "Eint", "Ith", "Clay Blocks"] },
  { name: "Cement", aliases: ["Cem", "Cement Bag", "ACC", "Ambuja", "Ultratech"] },
  { name: "Sand", aliases: ["Reti", "Balu", "M Sand", "River Sand", "Rait"] },
  { name: "Aggregate", aliases: ["Gitti", "Metal", "Stone Chips", "Bajri", "Khadi", "Crusher"] },
  { name: "Steel (Rebar)", aliases: ["Sariya", "TMT", "Rod", "Bars", "TMT Bar"] },
  { name: "Concrete/Ready-mix", aliases: ["RMC", "Ready Mix", "Concrete", "Mixture"] },
  { name: "Blocks (AAC/CLC)", aliases: ["AAC Blocks", "CLC Blocks", "Siporex", "Autoclaved Blocks"] },
  { name: "Mortar/Plaster", aliases: ["Plaster", "Plaster of Paris", "POP", "Mortar"] },
  { name: "Tiles", aliases: ["Ceramic Tiles", "Vitrified Tiles", "Floor Tiles", "Wall Tiles"] },
  { name: "Granite/Marble", aliases: ["Marble", "Granite", "Stone Slab"] },
  { name: "Wood/Timber", aliases: ["Timber", "Plywood", "Board", "MDF"] },
  { name: "Doors/Windows", aliases: ["Frames", "Shutters", "UPVC", "Aluminium Windows"] },
  { name: "Paint/Putty", aliases: ["Paint", "Putty", "Primer", "Enamel", "Distemper"] },
  { name: "Electrical", aliases: ["Wires", "Switches", "Lights", "MCB", "Conduit", "DB"] },
  { name: "Plumbing", aliases: ["Pipes", "Fittings", "CPVC", "UPVC", "GI", "Sanitary"] },
  { name: "Sanitaryware", aliases: ["WC", "Wash Basin", "Closet", "Cistern", "Tap", "Faucet"] },
  { name: "Waterproofing", aliases: ["Dr. Fixit", "Compound", "Membrane", "Bitumen"] },
  { name: "Fabrication", aliases: ["Welding", "MS Work", "Grill", "Gate", "Railing"] },
  { name: "Shuttering/Scaffolding", aliases: ["Formwork", "Scaffolding", "Centering", "Props"] },
  { name: "Labour (Mason/Helper)", aliases: ["Mason", "Rajmistri", "Mazdoor", "Helper", "Coolie", "Labour"] },
  { name: "Site Expenses", aliases: ["Tea", "Snacks", "Water", "Housekeeping", "Security"] },
  { name: "Transport/Loading", aliases: ["Freight", "Tempo", "Tractor", "Loader", "Unloading"] },
  { name: "Tools/Equipment", aliases: ["Mixer", "Vibrator", "Drill", "Bit", "Trowel", "Wheelbarrow"] },
  { name: "Curing/Water", aliases: ["Water Tanker", "Curing", "Sprinkler"] },
  { name: "Gypsum/POP", aliases: ["POP", "Gypsum", "False Ceiling"] },
  { name: "False Ceiling", aliases: ["Ceiling", "Gypsum Board", "Grid", "Channel"] },
  { name: "Hardware/Fasteners", aliases: ["Screws", "Nails", "Anchors", "Hinges", "Locks"] },
  { name: "Glass/Glazing", aliases: ["Glass", "Glazing", "Toughened", "Laminated"] },
  { name: "Pavers/Compound", aliases: ["Paver Blocks", "Interlocking", "Kerb", "Compound Wall"] },
  { name: "Landscaping", aliases: ["Soil", "Plants", "Grass", "Pavers", "Stone"] },
  { name: "Miscellaneous", aliases: ["Misc", "Other", "General"] },
];
const CATEGORY_INDEX = CATEGORY_OPTIONS.map((c) => ({
  name: c.name,
  terms: [c.name, ...(c.aliases || [])].map((t) => t.toLowerCase()),
}));
function suggestCategories(input) {
  const q = (input || "").toLowerCase().trim();
  if (!q) return CATEGORY_OPTIONS.slice(0, 10).map((c) => c.name);
  const scored = CATEGORY_INDEX.map((c) => {
    const starts = c.terms.some((t) => t.startsWith(q));
    const includes = starts ? false : c.terms.some((t) => t.includes(q));
    return { name: c.name, score: starts ? 2 : includes ? 1 : 0 };
  })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  return scored.slice(0, 10).map((x) => x.name);
}

// ---------- Data hooks ----------
function useExpenses(search) {
  return useQuery({
    queryKey: ["expenses", search],
    queryFn: async () => {
      const { data } = await api.get("/api/expenses", {
        params: { q: search || "" },
      });
      return data;
    },
  });
}
function useStats() {
  return useQuery({
    queryKey: ["stats"],
    queryFn: async () => {
      const { data } = await api.get("/api/expenses/stats");
      return data;
    },
  });
}
function useExpense(id) {
  return useQuery({
    queryKey: ["expense", id],
    queryFn: async () => {
      const { data } = await api.get(`/api/expenses/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

// ---------- CSV ----------
function exportCSV(expenses) {
  const header = [
    "Date",
    "Expense Name",
    "Category",
    "Amount",
    "Payment Method",
    "Notes",
  ];
  const rows = (expenses || []).map((e) => [
    formatDisplayDate(e.date),
    e.name,
    e.category,
    e.amount,
    e.payment_method,
    e.notes || "",
  ]);
  const csv = [header, ...rows]
    .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement("a"), {
    href: url,
    download: "expenses.csv",
  });
  a.click();
  URL.revokeObjectURL(url);
}


function Card({ title, value }) {
  return (
    <div className="card">
      <div className="label">{title}</div>
      <div className="value">{value}</div>
    </div>
  );
}


// ---------- Pages ----------
function Dashboard() {
  const [filterType, setFilterType] = useState("name");
  const [filterValue, setFilterValue] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const { data: stats } = useStats();
  const { data: expenses } = useExpenses("");

  const range = formatRange(stats?.date_range);
  const count = stats?.total_entries || 0;

  // Filtering logic
  const filteredExpenses = (expenses || []).filter((e) => {
    let ok = true;
    if (filterType === "name" && filterValue && e.name) {
      ok = ok && e.name.toLowerCase().includes(filterValue.toLowerCase());
    }
    if (filterType === "category" && filterValue && e.category) {
      ok = ok && e.category.toLowerCase().includes(filterValue.toLowerCase());
    }
    if (filterType === "floor" && filterValue && e.notes) {
      ok = ok && e.notes.toLowerCase().includes(filterValue.toLowerCase());
    }
    if (filterType === "date" && filterValue && e.date) {
      ok = ok && e.date === filterValue;
    }
    // Date range filter (inclusive)
    if (filterDateFrom && e.date) {
      ok = ok && e.date >= filterDateFrom;
    }
    if (filterDateTo && e.date) {
      ok = ok && e.date <= filterDateTo;
    }
    return ok;
  });

  // Calculate total for filtered
  const filteredTotal = INR(
    filteredExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0)
  );

  return (
    <div>
      <header className="title">
        <span className="emoji">🏗️</span>
        <h1>B43 Construction Expense Tracker</h1>
      </header>

      <section className="kpis">
        <Card title="Total Expenses (All)" value={INR(stats?.total_expenses || 0)} />
        <Card title="Total Expenses (Filtered)" value={filteredTotal} />
        <Card title="Entries (Filtered)" value={String(filteredExpenses.length)} />
        <Card title="Date Range" value={range} />
      </section>

      <div className="container">
        <div className="card" style={{ marginBottom: 16, padding: 16, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <label style={{ fontWeight: 500 }}>Filter by:</label>
          <select value={filterType} onChange={e => { setFilterType(e.target.value); setFilterValue(""); }}>
            <option value="name">Name</option>
            <option value="category">Category</option>
            <option value="floor">Floor</option>
            <option value="date">Date</option>
          </select>
          {filterType === "name" && (
            <input
              className="search"
              placeholder="Enter name..."
              value={filterValue}
              onChange={e => setFilterValue(e.target.value)}
              style={{ minWidth: 160 }}
            />
          )}
          {filterType === "category" && (
            <input
              className="search"
              placeholder="Enter category..."
              value={filterValue}
              onChange={e => setFilterValue(e.target.value)}
              style={{ minWidth: 160 }}
            />
          )}
          {filterType === "floor" && (
            <input
              className="search"
              placeholder="Enter floor..."
              value={filterValue}
              onChange={e => setFilterValue(e.target.value)}
              style={{ minWidth: 140 }}
            />
          )}
          {filterType === "date" && (
            <input
              className="search"
              type="date"
              placeholder="Enter date..."
              value={filterValue}
              onChange={e => setFilterValue(e.target.value)}
              style={{ minWidth: 140 }}
            />
          )}
          <span style={{ marginLeft: 16, fontWeight: 500 }}>Date Range:</span>
          <input
            className="search"
            type="date"
            value={filterDateFrom}
            onChange={e => setFilterDateFrom(e.target.value)}
            style={{ minWidth: 120 }}
            placeholder="From"
          />
          <span>to</span>
          <input
            className="search"
            type="date"
            value={filterDateTo}
            onChange={e => setFilterDateTo(e.target.value)}
            style={{ minWidth: 120 }}
            placeholder="To"
          />
        </div>

        <div className="toolbar">
          <button
            className="btn"
            type="button"
            onClick={() => exportCSV(filteredExpenses)}
          >
            📄 Export to CSV
          </button>
          <Link
            to="/add"
            className="btn"
            style={{ color: "#fff", textDecoration: "none" }}
          >
            ➕ Add
          </Link>
          <div className="spacer"></div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Expense Name</th>
                <th>Category</th>
                <th>Amount (₹)</th>
                <th>Payment Method</th>
                <th>Floor</th>
                <th>Notes</th>
                <th>Proof</th>
                <th>Edit</th>
              </tr>
            </thead>
            <tbody>
              {filteredExpenses.map((e) => (
                <tr key={e.id}>
                  <td>{formatDisplayDate(e.date)}</td>
                  <td>{e.name}</td>
                  <td>{e.category}</td>
                  <td>{Number(e.amount).toFixed(2)}</td>
                  <td>{e.payment_method}</td>
                  <td>{e.floor || ""}</td>
                  <td>{e.notes || ""}</td>
                  <td>
                    {e.proof_url ? (
                      <>
                        {/\.pdf$/i.test(e.proof_url) ? (
                          <a
                            href={
                              e.proof_url.startsWith("http")
                                ? e.proof_url
                                : `${api.defaults.baseURL}${e.proof_url}`
                            }
                            download={
                              e.proof_url.split('/').pop() || 'proof.pdf'
                            }
                            rel="noreferrer"
                          >
                            Download PDF
                          </a>
                        ) : (
                          <a
                            href={
                              e.proof_url.startsWith("http")
                                ? e.proof_url
                                : `${api.defaults.baseURL}${e.proof_url}`
                            }
                            target="_blank"
                            rel="noreferrer"
                          >
                            View
                          </a>
                        )}
                      </>
                    ) : (
                      ""
                    )}
                  </td>
                  <td>
                    <Link
                      to={`/edit/${e.id}`}
                      className="btn"
                      style={{ color: "#fff", textDecoration: "none" }}
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
              {filteredExpenses.length === 0 && (
                <tr>
                  <td colSpan="9" style={{ padding: "16px", color: "#64748b" }}>
                    No expenses found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function AddExpensePage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [catInput, setCatInput] = useState("");
  const catSuggestions = suggestCategories(catInput);

  const create = useMutation({
    mutationFn: async (formEl) => {
      const fd = new FormData(formEl);
      if (catInput) fd.set("category", catInput);
      // Add floor field if present
      const floor = formEl.floor?.value;
      if (floor !== undefined) fd.set("floor", floor);
      const { data } = await api.post("/api/expenses/upload", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expenses"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
      navigate("/");
    },
    onError: (err) => {
      const msg =
        err?.response?.data?.detail ||
        err?.message ||
        "Failed to save expense";
      alert(typeof msg === "string" ? msg : JSON.stringify(msg));
    },
  });

  const onSubmit = (e) => {
    e.preventDefault();
    create.mutate(e.target);
  };

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div>
      <header className="title">
        <span className="emoji">🧾</span>
        <h1>Add New Expense</h1>
      </header>

      <div className="container">
        <form
          className="form"
          onSubmit={onSubmit}
          encType="multipart/form-data"
          autoComplete="off"
        >
          <div className="field">
            <label>Date</label>
            <input type="date" name="date" defaultValue={today} required />
          </div>

          <div className="field">
            <label>Name</label>
            <input name="name" placeholder="Cement" required />
          </div>

          <div className="field" style={{ position: "relative", minWidth: 240 }}>
            <label>Category</label>
            <input
              name="category"
              value={catInput}
              onChange={(e) => setCatInput(e.target.value)}
              placeholder="Start typing, e.g., Bricks, Sariya, RMC…"
              required
              autoComplete="off"
            />
            {catInput && catSuggestions.length > 0 && (
              <div
                style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  right: 0,
                  background: "#fff",
                  border: "1px solid #e5e7eb",
                  borderTop: "none",
                  zIndex: 20,
                  maxHeight: 220,
                  overflowY: "auto",
                  borderBottomLeftRadius: 8,
                  borderBottomRightRadius: 8,
                }}
              >
                {catSuggestions.map((opt) => (
                  <div
                    key={opt}
                    onMouseDown={() => {
                      setCatInput(opt);
                    }}
                    style={{ padding: "8px 10px", cursor: "pointer" }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = "#f8fafc")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "#fff")
                    }
                  >
                    {opt}
                  </div>
                ))}
              </div>
            )}
          </div>


          <div className="field">
            <label>Floor</label>
            <select name="floor" defaultValue="">
              <option value="">Select floor</option>
              <option value="Basement">Basement</option>
              <option value="Ground Floor">Ground Floor</option>
              <option value="1st Floor">1st Floor</option>
              <option value="2nd Floor">2nd Floor</option>
            </select>
          </div>

          <div className="field">
            <label>Amount (₹)</label>
            <input type="number" step="0.01" name="amount" required />
          </div>

          <div className="field">
            <label>Payment</label>
            <select name="payment_method" defaultValue="Cash">
              <option>Cash</option>
              <option>Card</option>
              <option>UPI</option>
              <option>Bank Transfer</option>
            </select>
          </div>

          <div className="field">
            <label>Notes</label>
            <input name="notes" placeholder="Optional" />
          </div>

          <div className="field" style={{ minWidth: 260 }}>
            <label>Proof (Image or PDF)</label>
            <input type="file" name="file" accept="image/*,application/pdf" />
          </div>

          <button className="btn" type="submit" disabled={create.isLoading}>
            {create.isLoading ? "Saving..." : "Save Expense"}
          </button>
          <Link to="/" style={{ marginLeft: 10 }}>
            Cancel
          </Link>
        </form>
      </div>
    </div>
  );
}

function EditExpensePage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const qc = useQueryClient();

  const { data: existing } = useExpense(id);

  // Local state for category typeahead prefilled
  const [catInput, setCatInput] = useState("");
  const [showCatSuggestions, setShowCatSuggestions] = useState(false);
  useEffect(() => {
    if (existing?.category) setCatInput(existing.category);
  }, [existing]);

  const update = useMutation({
    mutationFn: async (formEl) => {
      const fd = new FormData(formEl);
      if (catInput) fd.set("category", catInput);
      // Add floor field if present
      const floor = formEl.floor?.value;
      if (floor !== undefined) fd.set("floor", floor);
      const { data } = await api.put(`/api/expenses/${id}`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expenses"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
      qc.invalidateQueries({ queryKey: ["expense", id] });
      navigate("/");
    },
    onError: (err) => {
      const msg =
        err?.response?.data?.detail ||
        err?.message ||
        "Failed to update expense";
      alert(typeof msg === "string" ? msg : JSON.stringify(msg));
    },
  });

  const onSubmit = (e) => {
    e.preventDefault();
    update.mutate(e.target);
  };

  const isoDate = existing?.date || new Date().toISOString().slice(0, 10);

  return (
    <div>
      <header className="title">
        <span className="emoji">✏️</span>
        <h1>Edit Expense</h1>
      </header>

      <div className="container">
        {!existing ? (
          <div style={{ padding: 16, color: "#64748b" }}>Loading…</div>
        ) : (
          <form
            className="form"
            onSubmit={onSubmit}
            encType="multipart/form-data"
            autoComplete="off"
          >
            <div className="field">
              <label>Date</label>
              <input type="date" name="date" defaultValue={isoDate} required />
            </div>

            <div className="field">
              <label>Name</label>
              <input name="name" defaultValue={existing.name} required />
            </div>

            <div
              className="field"
              style={{ position: "relative", minWidth: 240 }}
            >
              <label>Category</label>
              <input
                name="category"
                value={catInput}
                onChange={(e) => {
                  setCatInput(e.target.value);
                  setShowCatSuggestions(true);
                }}
                onFocus={() => setShowCatSuggestions(true)}
                placeholder="Start typing, e.g., Bricks, Sariya, RMC…"
                required
                autoComplete="off"
              />
              {catInput && showCatSuggestions && suggestCategories(catInput).length > 0 && (
                <div
                  style={{
                    position: "absolute",
                    top: "100%",
                    left: 0,
                    right: 0,
                    background: "#fff",
                    border: "1px solid #e5e7eb",
                    borderTop: "none",
                    zIndex: 20,
                    maxHeight: 220,
                    overflowY: "auto",
                    borderBottomLeftRadius: 8,
                    borderBottomRightRadius: 8,
                  }}
                >
                  {suggestCategories(catInput).map((opt) => (
                    <div
                      key={opt}
                      onMouseDown={() => {
                        setCatInput(opt);
                        setShowCatSuggestions(false);
                      }}
                      style={{ padding: "8px 10px", cursor: "pointer" }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background = "#f8fafc")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background = "#fff")
                      }
                    >
                      {opt}
                    </div>
                  ))}
                </div>
              )}
            </div>


            <div className="field">
              <label>Floor</label>
              <select name="floor" defaultValue={existing.floor || ""}>
                <option value="">Select floor</option>
                <option value="Basement">Basement</option>
                <option value="Ground Floor">Ground Floor</option>
                <option value="1st Floor">1st Floor</option>
                <option value="2nd Floor">2nd Floor</option>
              </select>
            </div>

            <div className="field">
              <label>Amount (₹)</label>
              <input
                type="number"
                step="0.01"
                name="amount"
                defaultValue={Number(existing.amount).toFixed(2)}
                required
              />
            </div>

            <div className="field">
              <label>Payment</label>
              <select
                name="payment_method"
                defaultValue={existing.payment_method || "Cash"}
              >
                <option>Cash</option>
                <option>Card</option>
                <option>UPI</option>
                <option>Bank Transfer</option>
              </select>
            </div>

            <div className="field">
              <label>Notes</label>
              <input name="notes" defaultValue={existing.notes || ""} />
            </div>

            <div className="field" style={{ minWidth: 260 }}>
              <label>Replace Proof (Image or PDF)</label>
              <input type="file" name="file" accept="image/*,application/pdf" />
              {existing.proof_url ? (
                <div style={{ fontSize: 13, marginTop: 6 }}>
                  Current:{" "}
                  <a
                    href={
                      existing.proof_url.startsWith("http")
                        ? existing.proof_url
                        : `${api.defaults.baseURL}${existing.proof_url}`
                    }
                    target="_blank"
                    rel="noreferrer"
                  >
                    View
                  </a>
                </div>
              ) : null}
            </div>

            <button className="btn" type="submit" disabled={update.isLoading}>
              {update.isLoading ? "Saving..." : "Save Changes"}
            </button>
            <Link to="/" style={{ marginLeft: 10 }}>
              Cancel
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}

// ---------- Routes and root ----------
function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/add" element={<AddExpensePage />} />
      <Route path="/edit/:id" element={<EditExpensePage />} />
    </Routes>
  );
}

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppRoutes />
    </QueryClientProvider>
  );
}
