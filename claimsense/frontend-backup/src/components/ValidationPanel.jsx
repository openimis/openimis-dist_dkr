import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import ScoreGauge from "./ScoreGauge.jsx";
import StatusBadge from "./StatusBadge.jsx";
import ErrorCard from "./ErrorCard.jsx";
import { CheckIcon, SpinnerIcon } from "./icons.jsx";
import { useClaimValidation } from "../hooks/useClaimValidation.js";

/**
 * Main right workspace: patient profile header, tabbed details (Demographics, Claim Info, AI Validation, FHIR Preview),
 * status timeline on the right edge, document upload/scan simulation, and action buttons.
 */
export default function ValidationPanel({ claim, onValidationComplete }) {
  const {
    state,
    validation,
    edits,
    error,
    submitResult,
    hasEdits,
    canSubmit,
    validate,
    editField,
    revalidateWithEdits,
    submit,
    reset,
  } = useClaimValidation(claim, onValidationComplete);

  const [activeTab, setActiveTab] = useState("AI Validation");
  
  // Document scan simulation state
  const [scanFile, setScanFile] = useState(null);
  const [scanState, setScanState] = useState("idle"); // "idle" | "scanning" | "done"
  const [extractedData, setExtractedData] = useState(null);

  // Automatically reset scan tab and timeline state when selected claim changes
  useEffect(() => {
    setActiveTab("AI Validation");
    setScanFile(null);
    setScanState("idle");
    setExtractedData(null);
    reset();
  }, [claim?.id, reset]);

  if (!claim) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8">
        <svg className="w-16 h-16 text-slate-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p className="text-sm font-semibold text-slate-500">No Claim Selected</p>
        <p className="text-xs text-slate-400 mt-1">Select a claim from the left sidebar queue to begin validation.</p>
      </div>
    );
  }

  // Handle simulated document drop/upload
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setScanFile(file);
    setScanState("scanning");
    
    // Simulate AI model OCR scanning
    setTimeout(() => {
      setScanState("done");
      // Simulate extraction based on the claim type or default values
      setExtractedData({
        diagnosis_code: "A09",
        diagnosis_description: "Diarrhoea and gastroenteritis of infectious origin",
        visit_date: "2026-07-02",
        claimed_amount: 8500,
      });
    }, 2000);
  };

  const applyExtractedData = () => {
    if (!extractedData) return;
    // Apply simulated changes to editing state
    Object.entries(extractedData).forEach(([field, value]) => {
      editField(field, value);
    });
    setScanState("applied");
  };

  // Determine current timeline active step
  let activeStep = 0; // 0: Claim Received, 1: AI Initial Review, 2: Pending Corrections, 3: Ready for openIMIS / Submitted
  if (state === "idle") {
    activeStep = 0;
  } else if (state === "loading") {
    activeStep = 1;
  } else if (state === "results") {
    activeStep = validation?.error_count > 0 ? 2 : 3;
  } else if (state === "submitted" || state === "submitting") {
    activeStep = 3;
  }

  if (state === "submitted" && submitResult) {
    return (
      <div className="flex-1 bg-slate-50 p-8 overflow-y-auto">
        <div className="max-w-3xl mx-auto bg-white border border-slate-200/80 rounded-2xl p-8 shadow-sm text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-5">
            <CheckIcon className="w-8 h-8 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800">Claim Successfully Submitted</h2>
          <p className="text-slate-500 text-sm mt-2 max-w-md mx-auto">
            The FHIR R4 ClaimResponse has been successfully signed off and posted to the openIMIS ledger in <strong>{submitResult.mode || "live"}</strong> mode.
          </p>
          
          <div className="my-6 p-4 bg-slate-50 border border-slate-200/60 rounded-xl max-w-sm mx-auto flex items-center justify-between">
            <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Final Adjudication Score</span>
            <span className="text-lg font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-100">
              {submitResult.score}/100
            </span>
          </div>

          <div className="w-full text-left bg-slate-900 border border-slate-800 rounded-xl p-5 overflow-hidden shadow-inner mb-6">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">FHIR R4 ClaimResponse Payload</h3>
            <pre className="text-xs text-emerald-400 font-mono overflow-x-auto max-h-60">
              {JSON.stringify(submitResult.fhir_claim_response || validation?.fhir_claim_response, null, 2)}
            </pre>
          </div>

          <button
            type="button"
            onClick={reset}
            className="bg-teal-600 hover:bg-teal-700 active:scale-95 text-white font-semibold text-sm px-6 py-2.5 rounded-xl transition-all shadow-sm"
          >
            Validate Next Claim
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Dynamic workspace pane */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Patient Profile Header */}
        <div className="bg-white border-b border-slate-200 px-6 py-5 flex-shrink-0">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {/* Photo placeholder */}
              <div className="w-14 h-14 rounded-full bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-700 text-lg font-bold shadow-inner">
                {claim.patient_name ? claim.patient_name.split(" ").map(n => n[0]).join("") : "PT"}
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="text-xl font-bold text-slate-800 leading-tight">
                    {claim.patient_name}
                  </h2>
                  {validation && (
                    <StatusBadge status={validation.status} color={validation.color} />
                  )}
                </div>
                <p className="text-xs text-slate-500 font-medium mt-1">
                  ID: <code className="font-mono bg-slate-50 border border-slate-100 rounded px-1 text-slate-600">{claim.id}</code>
                  <span className="mx-2 text-slate-300">•</span>
                  Facility: <span className="text-slate-700">{claim.facility_name}</span>
                </p>
              </div>
            </div>
            <div className="flex flex-col text-left md:text-right gap-1 md:self-end">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Policy/Visit Date</span>
              <span className="text-sm font-semibold text-slate-700">{claim.visit_date}</span>
            </div>
          </div>
        </div>

        {/* Tabbed Navigation Selector */}
        <div className="bg-white border-b border-slate-200 px-6 flex-shrink-0">
          <nav className="flex gap-6" aria-label="Tabs">
            {["AI Validation", "Demographics", "Claim Info", "FHIR Preview"].map((tab) => {
              const isActive = activeTab === tab;
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`py-3.5 px-1 font-semibold text-sm border-b-2 transition-all ${
                    isActive
                      ? "border-teal-600 text-teal-600"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {tab}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content Canvas */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
          {error && (
            <div role="alert" className="mb-4 rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-700 shadow-sm">
              {error}
            </div>
          )}

          {activeTab === "AI Validation" && (
            <div className="space-y-6">
              {/* Document Scan Simulation Tool */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm">
                <h3 className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-2">
                  <svg className="w-5 h-5 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Scan Claim Invoice/Document
                </h3>
                <p className="text-xs text-slate-500 mb-4">
                  Upload a scanned paper claim invoice or receipt. The AI agent will run OCR to automatically extract data fields and flag matches.
                </p>

                {scanState === "idle" && (
                  <label className="border-2 border-dashed border-slate-200 hover:border-teal-500 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer transition-all hover:bg-teal-50/20 group">
                    <svg className="w-8 h-8 text-slate-400 group-hover:text-teal-600 mb-2 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    <span className="text-xs font-semibold text-slate-600 group-hover:text-teal-700">Choose Invoice Document</span>
                    <span className="text-[10px] text-slate-400 mt-1">PDF, JPG, PNG (Max 5MB)</span>
                    <input type="file" className="hidden" accept=".pdf,.png,.jpg,.jpeg" onChange={handleFileUpload} />
                  </label>
                )}

                {scanState === "scanning" && (
                  <div className="border border-slate-100 rounded-xl p-5 flex flex-col items-center justify-center bg-slate-50 relative overflow-hidden">
                    <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-teal-400 to-emerald-500 animate-[pulse_1.5s_infinite] shadow-lg shadow-teal-500" />
                    <SpinnerIcon className="w-8 h-8 text-teal-600 mb-2" />
                    <p className="text-xs font-semibold text-slate-700">AI Model Extracting & Processing Invoice Data...</p>
                    <p className="text-[10px] text-slate-400 mt-1">Reading fields, verification with ICD-10 registry</p>
                  </div>
                )}

                {scanState === "done" && (
                  <div className="border border-teal-100 rounded-xl p-4 bg-teal-50/20">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold text-teal-800 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-teal-500" />
                        AI Extraction Successful
                      </span>
                      <span className="text-[10px] text-slate-400">{scanFile?.name}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 mb-4 bg-white p-3 rounded-lg border border-slate-100 text-xs">
                      <div>
                        <span className="text-slate-400 block mb-0.5">ICD-10 Diagnosis</span>
                        <strong className="text-slate-700 font-semibold">{extractedData.diagnosis_code} - {extractedData.diagnosis_description}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block mb-0.5">Visit Date</span>
                        <strong className="text-slate-700 font-semibold">{extractedData.visit_date}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block mb-0.5">Claimed Amount</span>
                        <strong className="text-slate-700 font-semibold">KES {extractedData.claimed_amount.toLocaleString()}</strong>
                      </div>
                    </div>
                    <div className="flex gap-2.5">
                      <button
                        type="button"
                        onClick={applyExtractedData}
                        className="bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs px-3.5 py-2 rounded-lg shadow-sm transition-all"
                      >
                        Apply Extracted Data
                      </button>
                      <button
                        type="button"
                        onClick={() => { setScanState("idle"); setScanFile(null); }}
                        className="border border-slate-200 text-slate-500 hover:bg-slate-50 font-semibold text-xs px-3 py-2 rounded-lg transition-all"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                )}

                {scanState === "applied" && (
                  <div className="border border-emerald-100 rounded-xl p-4 bg-emerald-50/20 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 text-xs">✓</span>
                      <div>
                        <p className="text-xs font-bold text-slate-800">Extracted Data Applied</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Click &quot;Re-validate with corrections&quot; below to recheck rules.</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setScanState("idle"); setScanFile(null); }}
                      className="text-xs text-teal-600 hover:underline font-semibold"
                    >
                      Scan Another
                    </button>
                  </div>
                )}
              </div>

              {state === "idle" && (
                <div className="bg-white border border-slate-200/80 rounded-2xl p-8 text-center shadow-sm">
                  <p className="text-slate-500 text-sm mb-4 font-medium">
                    This claim needs validation against SHA pre-submission policies.
                  </p>
                  <button
                    type="button"
                    onClick={validate}
                    className="bg-teal-600 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-teal-700 active:scale-95 transition-all shadow-sm"
                  >
                    Validate Claim
                  </button>
                </div>
              )}

              {state === "loading" && (
                <div className="bg-white border border-slate-200/80 rounded-2xl p-10 flex flex-col items-center justify-center shadow-sm">
                  <SpinnerIcon />
                  <p className="text-sm font-semibold text-slate-700 mt-3">Adjudicating Claims Policy Rules...</p>
                  <p className="text-xs text-slate-400 mt-1">Generating plain English rule interpretations</p>
                </div>
              )}

              {(state === "results" || state === "submitting") && validation && (
                <>
                  <div className="flex flex-col md:flex-row items-center gap-6 bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm">
                    <ScoreGauge score={validation.score} />
                    <div className="flex-1 text-center md:text-left">
                      <div className="flex flex-col md:flex-row md:items-center gap-2 justify-center md:justify-start">
                        <span className="text-2xl font-extrabold text-slate-800">
                          {validation.error_count === 0
                            ? "No errors found"
                            : `${validation.error_count} Rule Failure${
                                validation.error_count !== 1 ? "s" : ""
                              }`}
                        </span>
                        {validation.warning_count > 0 && (
                          <span className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-md self-center">
                            {validation.warning_count} Warning{validation.warning_count !== 1 ? "s" : ""}
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-100 text-xs text-slate-500 font-medium">
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase block">Diagnosis</span>
                          <span className="text-slate-800 font-semibold">
                            {edits.diagnosis_code ?? claim.diagnosis_code} — {claim.diagnosis_description}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase block">Claimed Amount</span>
                          <span className="text-slate-800 font-semibold">
                            KES {Number(edits.claimed_amount ?? claim.claimed_amount).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
                      Validation Checklist ({validation.results?.length || 0} Rules Checked)
                    </h3>
                    <div className="space-y-3">
                      {validation.results?.map((result) => (
                        <ErrorCard
                          key={result.rule_id}
                          result={result}
                          explanation={validation.explanations?.[result.rule_id]}
                          fieldValue={edits[result.field] ?? claim[result.field]}
                          onChange={!result.passed ? editField : undefined}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Actions footer bar */}
                  <div className="flex items-center gap-3 pt-2 bg-slate-50/50 sticky bottom-0 z-10 py-4 border-t border-slate-200/50">
                    {hasEdits && (
                      <button
                        type="button"
                        onClick={revalidateWithEdits}
                        className="flex-1 bg-slate-850 hover:bg-slate-900 active:scale-95 text-white font-semibold text-sm py-3 rounded-xl transition-all shadow-md bg-slate-800"
                      >
                        Re-validate with corrections
                      </button>
                    )}
                    
                    <button
                      type="button"
                      onClick={submit}
                      disabled={!canSubmit || state === "submitting"}
                      className={`flex-1 text-white font-semibold text-sm py-3 rounded-xl transition-all shadow-md active:scale-95 ${
                        canSubmit
                          ? "bg-teal-600 hover:bg-teal-700 cursor-pointer"
                          : "bg-slate-300 cursor-not-allowed opacity-70"
                      }`}
                    >
                      {state === "submitting" ? "Submitting..." : "Submit to openIMIS →"}
                    </button>
                    
                    <button
                      type="button"
                      onClick={reset}
                      className="px-5 py-3 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 bg-white hover:bg-slate-50 active:scale-95 transition-all"
                    >
                      Reset
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === "Demographics" && (
            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-6">
              <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-3">Patient Profile & Coverage</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-sm">
                <div>
                  <span className="text-xs text-slate-400 block">Full Name</span>
                  <span className="font-semibold text-slate-800">{claim.patient_name || "N/A"}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-400 block">Policy ID Number</span>
                  <span className="font-semibold text-slate-800 font-mono">{edits.patient_id ?? claim.patient_id ?? "N/A"}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-400 block">Policy Expiry / Coverage End Date</span>
                  <span className="font-semibold text-slate-800 font-mono">{edits.coverage_end_date ?? claim.coverage_end_date ?? "N/A"}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-400 block">Insurance Scheme</span>
                  <span className="font-semibold text-slate-800">State Health Authority (SHA)</span>
                </div>
                <div>
                  <span className="text-xs text-slate-400 block">Coverage Status</span>
                  <span className="text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-full px-2.5 py-0.5 text-xs font-semibold inline-block mt-1">
                    Active
                  </span>
                </div>
              </div>
            </div>
          )}

          {activeTab === "Claim Info" && (
            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-6">
              <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-3">Claim Details & Items</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-sm">
                <div>
                  <span className="text-xs text-slate-400 block">Claim ID</span>
                  <span className="font-semibold text-slate-800 font-mono">{claim.id}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-400 block">Visit Date</span>
                  <span className="font-semibold text-slate-800 font-mono">{edits.visit_date ?? claim.visit_date}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-400 block">Facility Name</span>
                  <span className="font-semibold text-slate-800">{claim.facility_name}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-400 block">Admitting Diagnosis Code</span>
                  <span className="font-semibold text-slate-850 font-mono bg-slate-50 border border-slate-100 rounded px-1">{edits.diagnosis_code ?? claim.diagnosis_code}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-400 block">Diagnosis Description</span>
                  <span className="font-medium text-slate-700">{claim.diagnosis_description}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-400 block">Total Claimed Amount</span>
                  <span className="font-extrabold text-slate-800">KES {Number(edits.claimed_amount ?? claim.claimed_amount).toLocaleString()}</span>
                </div>
              </div>

              <div className="mt-6 border-t border-slate-100 pt-5">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Service Items Grid</h4>
                <div className="border border-slate-200/60 rounded-xl overflow-hidden text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                      <tr>
                        <th className="p-3">Service Description</th>
                        <th className="p-3 text-right">Price (KES)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      <tr>
                        <td className="p-3">Standard Clinical Consultation Fee</td>
                        <td className="p-3 text-right font-medium">1,500</td>
                      </tr>
                      <tr>
                        <td className="p-3">Laboratory Investigation Panel (ICD Alignment Check)</td>
                        <td className="p-3 text-right font-medium">2,000</td>
                      </tr>
                      {Number(edits.claimed_amount ?? claim.claimed_amount) > 3500 && (
                        <tr>
                          <td className="p-3">Prescription Dispensation & Therapeutics</td>
                          <td className="p-3 text-right font-medium">
                            {(Number(edits.claimed_amount ?? claim.claimed_amount) - 3500).toLocaleString()}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === "FHIR Preview" && (
            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm">
              <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-3 mb-4">FHIR R4 ClaimResponse Payload</h3>
              {validation?.fhir_claim_response ? (
                <pre className="text-xs text-slate-700 bg-slate-900 border border-slate-800 rounded-xl p-4 overflow-auto font-mono text-emerald-400 max-h-[450px]">
                  {JSON.stringify(validation.fhir_claim_response, null, 2)}
                </pre>
              ) : (
                <div className="text-center py-10 text-slate-400 text-sm font-medium">
                  Please validate the claim first to compile the FHIR JSON schema.
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right Edge: Persistent Timeline Tracker */}
      <div className="w-64 border-l border-slate-200 bg-white flex flex-col flex-shrink-0 p-5">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6 mt-1">Status Timeline</h3>
        <div className="relative pl-6 space-y-8 flex-1">
          {/* Vertical tracking line */}
          <div className="absolute left-[30px] top-2 bottom-6 w-0.5 bg-slate-200" />

          {/* Step 1 */}
          <div className="relative flex gap-3.5 items-start">
            <span className={`absolute left-0 w-3 h-3 rounded-full border-2 transform -translate-x-1.5 mt-1.5 transition-all duration-300 ${
              activeStep >= 0 ? "bg-teal-500 border-teal-500 scale-110 shadow-sm shadow-teal-500/50" : "bg-white border-slate-300"
            }`} />
            <div className="pl-3.5">
              <p className={`text-xs font-bold ${activeStep >= 0 ? "text-slate-800" : "text-slate-400"}`}>Claim Received</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Registered in system</p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="relative flex gap-3.5 items-start">
            <span className={`absolute left-0 w-3 h-3 rounded-full border-2 transform -translate-x-1.5 mt-1.5 transition-all duration-300 ${
              activeStep >= 1 ? "bg-teal-500 border-teal-500 scale-110 shadow-sm shadow-teal-500/50" : "bg-white border-slate-300"
            }`} />
            <div className="pl-3.5">
              <p className={`text-xs font-bold ${activeStep >= 1 ? "text-slate-800" : "text-slate-400"}`}>AI Initial Review</p>
              <p className="text-[10px] text-slate-400 mt-0.5">FastAPI & Claude NLP</p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="relative flex gap-3.5 items-start">
            <span className={`absolute left-0 w-3 h-3 rounded-full border-2 transform -translate-x-1.5 mt-1.5 transition-all duration-300 ${
              activeStep >= 2 ? "bg-teal-500 border-teal-500 scale-110 shadow-sm shadow-teal-500/50" : "bg-white border-slate-300"
            }`} />
            <div className="pl-3.5">
              <p className={`text-xs font-bold ${activeStep >= 2 ? "text-slate-800" : "text-slate-400"}`}>Pending Corrections</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Live officer triage</p>
            </div>
          </div>

          {/* Step 4 */}
          <div className="relative flex gap-3.5 items-start">
            <span className={`absolute left-0 w-3 h-3 rounded-full border-2 transform -translate-x-1.5 mt-1.5 transition-all duration-300 ${
              activeStep >= 3 ? "bg-emerald-500 border-emerald-500 scale-110 shadow-sm shadow-emerald-500/50" : "bg-white border-slate-300"
            }`} />
            <div className="pl-3.5">
              <p className={`text-xs font-bold ${activeStep >= 3 ? "text-slate-800" : "text-slate-400"}`}>Ready for openIMIS</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Clear ledger upload</p>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-100 pt-4 text-[10px] text-slate-400">
          <span className="font-semibold block text-slate-500">Validation Mode:</span>
          <span>FastAPI Rule Processor R4</span>
        </div>
      </div>
    </div>
  );
}

ValidationPanel.propTypes = {
  claim: PropTypes.shape({
    id: PropTypes.string.isRequired,
    patient_name: PropTypes.string,
    facility_name: PropTypes.string,
    visit_date: PropTypes.string,
    diagnosis_code: PropTypes.string,
    diagnosis_description: PropTypes.string,
    patient_id: PropTypes.string,
    coverage_end_date: PropTypes.string,
    claimed_amount: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  }),
  onValidationComplete: PropTypes.func,
};
