import { useState } from "react";
import ClaimList from "./components/ClaimList.jsx";
import ValidationPanel from "./components/ValidationPanel.jsx";
import LandingPage from "./components/LandingPage.jsx";
import AddClaimModal from "./components/AddClaimModal.jsx";
import { useClaims } from "./hooks/useClaims.js";

/**
 * Root layout. Strict two-pane split-screen layout:
 *  - Left sidebar (ClaimList) — persistent, light-mode scrollable queue
 *  - Right workspace (ValidationPanel) — dynamic panel with patient info and validation tools
 */
export default function App() {
  const { claims, loading, error, reload, patchPreview, addClaim } = useClaims();
  const [view, setView] = useState("landing"); // "landing" | "dashboard"
  const [selectedId, setSelectedId] = useState(null);
  const [addModalOpen, setAddModalOpen] = useState(false);

  // Auto-select the first claim once the list loads, for a quicker demo start.
  if (!selectedId && claims.length > 0) {
    setSelectedId(claims[0].id);
  }

  const selectedClaim = claims.find((c) => c.id === selectedId) ?? null;
  const readyCount = claims.filter((c) => c._preview?.color === "green").length;

  async function handleAddClaim(claimData) {
    const created = await addClaim(claimData);
    setSelectedId(created.id);
    setAddModalOpen(false);
    setView("dashboard");
  }

  if (view === "landing") {
    return (
      <LandingPage
        claims={claims}
        loading={loading}
        onEnter={() => setView("dashboard")}
      />
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans text-slate-800 antialiased">
      {/* Left sidebar: Persistent Queue */}
      <aside className="w-80 flex-shrink-0 bg-white border-r border-slate-200 flex flex-col">
        {/* Branding Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setView("landing")}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity text-left"
          >
            <span className="text-teal-600 font-bold text-xl tracking-tight">
              ClaimSense
            </span>
            <span className="text-[10px] font-semibold bg-teal-50 text-teal-700 border border-teal-100 rounded-md px-1.5 py-0.5">
              MVP
            </span>
          </button>
          <button
            type="button"
            onClick={() => setAddModalOpen(true)}
            className="text-xs bg-teal-600 hover:bg-teal-700 active:scale-95 transition-all text-white font-semibold rounded-lg px-3 py-1.5 shadow-sm"
          >
            + Add Claim
          </button>
        </div>

        {/* Search & Stats Header */}
        <div className="px-5 py-3 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Claims Queue
            </p>
            {!loading && (
              <p className="text-xs text-slate-500 font-medium">
                {claims.length} total • {readyCount} ready
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={reload}
            className="text-xs text-slate-500 hover:text-teal-600 font-medium transition-colors"
          >
            Refresh
          </button>
        </div>

        {error && (
          <div
            role="alert"
            className="mx-4 my-2 text-xs text-red-700 bg-red-50 border border-red-100 rounded-lg p-3"
          >
            Failed to load: {error}
          </div>
        )}

        {/* Scrollable list of claims */}
        <div className="flex-1 overflow-y-auto">
          <ClaimList
            claims={claims}
            selectedId={selectedId}
            onSelect={setSelectedId}
            loading={loading}
          />
        </div>

        {/* Footer info */}
        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/30">
          <p className="text-[10px] text-slate-400 font-medium">
            openIMIS Hackathon • Track 3
          </p>
        </div>
      </aside>

      {/* Right workspace: Dynamic Workspace */}
      <main className="flex-1 flex flex-col overflow-hidden bg-slate-100/60">
        <ValidationPanel 
          claim={selectedClaim} 
          onValidationComplete={patchPreview} 
        />
      </main>

      {addModalOpen && (
        <AddClaimModal onClose={() => setAddModalOpen(false)} onSubmit={handleAddClaim} />
      )}
    </div>
  );
}

