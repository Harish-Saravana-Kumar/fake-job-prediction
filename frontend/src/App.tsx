import React, { useCallback, useEffect, useMemo, useState } from 'react'
import './App.css'
import {
  ApiError,
  getApiStatus,
  getExplainability,
  getValidationRules,
  predictJobPosting,
  validateJobPosting,
} from './services/api'
import type { SyntheticEvent } from 'react'
import type {
  ApiStatusResponse,
  ExplainResponse,
  PredictRequest,
  PredictResponse,
  ValidationResponse,
  ValidationRules,
} from './types/api'

const DEFAULT_MODEL_ID = 'AventIQ-AI/BERT-Spam-Job-Posting-Detection-Model'

// ═══════════════════════════════════════════════════════════
// RISK INDICATOR REFERENCE GUIDE
// ═══════════════════════════════════════════════════════════
const RISK_INDICATORS_REFERENCE = [
  {
    category: 'Unrealistic salary claims',
    riskLevel: 'Critical',
    description: 'Promises of unusually high earnings without justification',
    examples: ['easy money', 'high salary guarantee', 'quick cash', '$5000/week', 'guaranteed income'],
  },
  {
    category: 'No experience required',
    riskLevel: 'High',
    description: 'Universal acceptance with no qualifications mentioned',
    examples: ['no experience', 'anyone welcome', 'zero requirements', 'entry level for everyone'],
  },
  {
    category: 'Urgency pressure tactics',
    riskLevel: 'High',
    description: 'Creating artificial time pressure to bypass rational decision-making',
    examples: ['act now', 'limited time', 'positions filling fast', 'only 2 spots left', 'closing soon'],
  },
  {
    category: 'Vague work arrangement',
    riskLevel: 'Medium',
    description: 'Unclear job duties or remote-only roles with minimal detail',
    examples: ['work from home', 'flexible hours', 'passive income', 'remote opportunity'],
  },
  {
    category: 'Upfront fee request',
    riskLevel: 'Critical',
    description: 'Asking for payment before employment begins',
    examples: ['registration fee', 'training fee', 'processing fee', 'security deposit', 'pay upfront'],
  },
]
// ═══════════════════════════════════════════════════════════

// Test presets for quick testing
const TEST_PRESETS = [
  {
    id: 'scam_wfh',
    label: 'Scam: Work-From-Home',
    title: 'Remote Data Entry - Easy Money!',
    company: 'QuickCash Solutions',
    description: 'Work from home and make $500/day! No experience required. Positions filling fast. Act now! Limited spots available. Must pay $99 registration fee to get started.',
  },
  {
    id: 'legit_tech',
    label: 'Real: Senior Dev Role',
    title: 'Senior Software Engineer',
    company: 'TechCorp Inc',
    description: 'We are hiring Senior Software Engineers for our growing team. Requirements: 5+ years in Java/Python, BS in CS. Responsibilities include system design and mentoring. Salary: $150-180k. Apply through our careers page.',
  },
  {
    id: 'scam_pyramid',
    label: 'Scam: MLM Scheme',
    title: 'Earn Unlimited Income!',
    company: 'EasyWealth LLC',
    description: 'Join our team and build passive income. Recruit others and earn commissions. No requirements. Start immediately after payment of $299 starter kit. Receive payments directly to your account.',
  },
]

function App() {
  const [title, setTitle] = useState('')
  const [company, setCompany] = useState('')
  const [description, setDescription] = useState('')

  const [rules, setRules] = useState<ValidationRules>({
    maxDescriptionLength: 5000,
    maxTitleLength: 120,
    maxCompanyLength: 120,
    minAnalyzeChars: 10,
  })

  const [serviceReady, setServiceReady] = useState(false)
  const [apiStatus, setApiStatus] = useState<ApiStatusResponse | null>(null)
  const [statusMessage, setStatusMessage] = useState('Checking backend status...')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<string[]>([])
  const [warnings, setWarnings] = useState<string[]>([])
  const [result, setResult] = useState<PredictResponse | null>(null)
  const [statusUpdatedAt, setStatusUpdatedAt] = useState<string | null>(null)

  const [liveValidation, setLiveValidation] = useState<ValidationResponse | null>(null)
  const [liveResult, setLiveResult] = useState<PredictResponse | null>(null)
  const [liveError, setLiveError] = useState<string | null>(null)
  const [isLiveAnalyzing, setIsLiveAnalyzing] = useState(false)

  // Draft management
  const [savedDrafts, setSavedDrafts] = useState<Array<{ id: string; label: string; title: string; company: string; description: string }>>([])
  const [showDrafts, setShowDrafts] = useState(false)

  // Explainability
  const [showExplainability, setShowExplainability] = useState(false)
  const [explainData, setExplainData] = useState<ExplainResponse | null>(null)
  const [isLoadingExplain, setIsLoadingExplain] = useState(false)

  // Risk indicators reference
  const [showRiskReference, setShowRiskReference] = useState(true)

  // Load drafts from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('nlp_drafts')
    if (stored) {
      try {
        setSavedDrafts(JSON.parse(stored))
      } catch (e) {
        console.error('Failed to load drafts', e)
      }
    }
  }, [])

  // Save draft to localStorage
  const saveDraft = useCallback(
    (label: string) => {
      const newDraft = {
        id: `draft_${Date.now()}`,
        label,
        title,
        company,
        description,
      }
      const updated = [...savedDrafts, newDraft]
      setSavedDrafts(updated)
      localStorage.setItem('nlp_drafts', JSON.stringify(updated))
    },
    [savedDrafts, title, company, description],
  )

  // Load draft
  const loadDraft = useCallback((draftId: string) => {
    const draft = savedDrafts.find((d) => d.id === draftId)
    if (draft) {
      setTitle(draft.title)
      setCompany(draft.company)
      setDescription(draft.description)
      setShowDrafts(false)
    }
  }, [savedDrafts])

  // Delete draft
  const deleteDraft = useCallback(
    (draftId: string) => {
      const updated = savedDrafts.filter((d) => d.id !== draftId)
      setSavedDrafts(updated)
      localStorage.setItem('nlp_drafts', JSON.stringify(updated))
    },
    [savedDrafts],
  )

  // Load test preset
  const loadPreset = useCallback((presetId: string) => {
    const preset = TEST_PRESETS.find((p) => p.id === presetId)
    if (preset) {
      setTitle(preset.title)
      setCompany(preset.company)
      setDescription(preset.description)
    }
  }, [])

  // Get explainability
  const getExplain = useCallback(async () => {
    if (!result) return
    setIsLoadingExplain(true)
    try {
      const explain = await getExplainability({
        text: description,
        isFake: result.isFake,
        indicators: result.whyFlagged.indicatorDetails,
        fakeProbability: result.fakeProbability,
        realProbability: result.realProbability,
      })
      setExplainData(explain)
      setShowExplainability(true)
    } catch (error) {
      console.error('Failed to get explainability', error)
    } finally {
      setIsLoadingExplain(false)
    }
  }, [result, description])

  const normalizedUserText = useMemo(() => {
    return [description, title, company].join(' ').replace(/\s+/g, ' ').trim()
  }, [company, description, title])

  const combinedLength = normalizedUserText.length

  const formattedStatusMessage = statusUpdatedAt
    ? `${statusMessage} • Refreshed ${new Date(statusUpdatedAt).toLocaleTimeString()}`
    : statusMessage

  const refreshBackendMeta = useCallback(async () => {
    try {
      const [statusPayload, backendRules] = await Promise.all([
        getApiStatus(),
        getValidationRules(),
      ])
      setApiStatus(statusPayload)
      setServiceReady(statusPayload.modelLoaded)
      setStatusMessage(
        statusPayload.modelLoaded
          ? 'Backend is ready.'
          : 'Backend is running, but the model is still loading.',
      )
      setRules(backendRules.rules)
      setStatusUpdatedAt(new Date().toISOString())
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : 'Failed to connect to backend API.'
      setServiceReady(false)
      setStatusMessage(message)
    }
  }, [])

  useEffect(() => {
    void refreshBackendMeta()
    const intervalId = window.setInterval(() => {
      void refreshBackendMeta()
    }, 15000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [refreshBackendMeta])

  useEffect(() => {
    if (!serviceReady) {
      setIsLiveAnalyzing(false)
      setLiveValidation(null)
      setLiveResult(null)
      setLiveError(null)
      return
    }

    if (!normalizedUserText || normalizedUserText.length < rules.minAnalyzeChars) {
      setIsLiveAnalyzing(false)
      setLiveValidation(null)
      setLiveResult(null)
      setLiveError(null)
      return
    }

    let isStale = false
    const controller = new AbortController()
    const debounceId = window.setTimeout(() => {
      void (async () => {
        if (isStale) return
        setIsLiveAnalyzing(true)
        try {
          const validation = await validateJobPosting(
            {
              title,
              company,
              description,
            },
            { signal: controller.signal },
          )

          if (isStale) return

          setLiveValidation(validation)

          if (!validation.valid) {
            setLiveResult(null)
            setLiveError(null)
            return
          }

          const preview = await predictJobPosting(
            {
              title,
              company,
              text: description,
            },
            { signal: controller.signal },
          )

          if (isStale) return

          setLiveResult(preview)
          setLiveError(null)
        } catch (error) {
          if (isStale) {
            return
          }

          if (error instanceof DOMException && error.name === 'AbortError') {
            return
          }

          if (error instanceof ApiError) {
            setLiveError(error.message)
          } else {
            setLiveError('Live analysis failed. Please try again.')
          }
        } finally {
          if (!isStale) {
            setIsLiveAnalyzing(false)
          }
        }
      })()
    }, 600)

    return () => {
      isStale = true
      window.clearTimeout(debounceId)
      controller.abort()
      setIsLiveAnalyzing(false)
    }
  }, [company, description, normalizedUserText, rules.minAnalyzeChars, serviceReady, title])

  const runLocalValidation = () => {
    const localErrors: string[] = []

    if (!normalizedUserText) {
      localErrors.push('Please provide at least one field (description, title, or company).')
    } else if (normalizedUserText.length < rules.minAnalyzeChars) {
      localErrors.push(
        `Combined text must be at least ${rules.minAnalyzeChars} characters. You have ${normalizedUserText.length}.`,
      )
    }

    if (description.length > rules.maxDescriptionLength) {
      localErrors.push(
        `Description exceeds maximum length of ${rules.maxDescriptionLength} characters.`,
      )
    }

    if (title.length > rules.maxTitleLength) {
      localErrors.push(`Job title exceeds maximum length of ${rules.maxTitleLength} characters.`)
    }

    if (company.length > rules.maxCompanyLength) {
      localErrors.push(`Company name exceeds maximum length of ${rules.maxCompanyLength} characters.`)
    }

    return localErrors
  }

  const handleSubmit = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!serviceReady || isSubmitting) {
      return
    }

    setResult(null)
    setWarnings([])

    const localErrors = runLocalValidation()
    if (localErrors.length > 0) {
      setErrors(localErrors)
      return
    }

    setIsSubmitting(true)
    setErrors([])

    const payload: PredictRequest = {
      title,
      company,
      text: description,
    }

    try {
      const validation = await validateJobPosting({
        title,
        company,
        description,
      })

      if (!validation.valid) {
        setErrors(validation.errors)
        setWarnings(validation.warnings)
        return
      }

      setWarnings(validation.warnings)
      const prediction = await predictJobPosting(payload)
      setResult(prediction)
    } catch (error) {
      if (error instanceof ApiError) {
        setErrors([error.message])
      } else {
        setErrors(['Unexpected error while contacting backend API.'])
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const metricCards = useMemo(() => {
    if (!result) return []
    return [
      {
        label: 'Confidence',
        value: `${result.confidence.toFixed(1)}%`,
        hint: `${result.confidenceBand} certainty`,
      },
      {
        label: 'Fake Probability',
        value: `${result.fakeProbability.toFixed(1)}%`,
        hint: 'Flag threshold 50%+',
      },
      {
        label: 'Real Probability',
        value: `${result.realProbability.toFixed(1)}%`,
        hint: 'Model counter score',
      },
      {
        label: 'Analyzed Length',
        value: `${result.textLength} chars`,
        hint: 'Combined title · company · text',
      },
    ]
  }, [result])

  const totalEndpoints = useMemo(
    () => Object.keys(apiStatus?.endpoints ?? {}).length,
    [apiStatus],
  )

  const capabilityHighlights = useMemo(
    () => [
      {
        title: 'Transformers backbone',
        detail: apiStatus?.modelPath ?? DEFAULT_MODEL_ID,
        meta: serviceReady ? 'Model online' : 'Model warming up',
      },
      {
        title: 'Live validation gate',
        detail: `${rules.minAnalyzeChars}+ chars required · ${combinedLength} chars drafted`,
        meta:
          liveValidation?.valid === false
            ? 'Needs fixes'
            : liveValidation?.valid
              ? 'Input valid'
              : 'Waiting for text',
      },
      {
        title: 'Probability lens',
        detail: result
          ? `${result.fakeProbability.toFixed(1)}% fake vs ${result.realProbability.toFixed(1)}% real`
          : 'Run the analyzer to see probability bands.',
        meta: result ? `${result.confidenceBand} confidence` : 'Idle',
      },
    ],
    [apiStatus, combinedLength, liveValidation?.valid, result, rules.minAnalyzeChars, serviceReady],
  )

  const highlightedTests = [
    {
      id: 'Case 2.1',
      title: 'Classic Work-From-Home Scam',
      expected: 'FAKE',
      notes: 'Unrealistic pay, no experience required, remote guarantees.',
      tone: 'risk',
    },
    {
      id: 'Case 3.1',
      title: 'Professional Tech Role',
      expected: 'REAL',
      notes: 'Specific requirements, benefits, and application channel.',
      tone: 'legit',
    },
    {
      id: 'Case 6.2',
      title: 'Pharma Sales – High Commission',
      expected: 'REAL',
      notes: 'High upside but grounded in credentials, territory, and benefits.',
      tone: 'edge',
    },
  ]

  const statusTiles = [
    {
      label: 'Model status',
      value: serviceReady ? 'Online' : 'Offline',
      detail: formattedStatusMessage,
    },
    {
      label: 'Endpoints',
      value: totalEndpoints,
      detail: 'REST hooks exposed',
    },
    {
      label: 'Char gate',
      value: `${rules.minAnalyzeChars}+`,
      detail: 'Minimum characters',
    },
    {
      label: 'Live sample',
      value: `${combinedLength} chars`,
      detail: 'Current input length',
    },
  ]

  const scrollToSection = useCallback((targetId: string) => {
    const anchor = document.getElementById(targetId)
    if (anchor) {
      anchor.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [])

  const endpointEntries = Object.entries(apiStatus?.endpoints ?? {})

  return (
    <div className="site-shell">
      <header className="site-header">
        <div className="brand-mark">
          <span className="brand-icon">◇</span>
          <div>
            <strong>Atlas JobShield</strong>
            <small>Fraud Intelligence</small>
          </div>
        </div>
        <nav className="nav-links">
          <button type="button" onClick={() => scrollToSection('analyzer')}>
            Analyzer
          </button>
          <button type="button" onClick={() => scrollToSection('capabilities')}>
            Model
          </button>
          <button type="button" onClick={() => scrollToSection('test-lab')}>
            Test Lab
          </button>
          <button type="button" onClick={() => setShowRiskReference(!showRiskReference)}>
            📋 Risk Index
          </button>
        </nav>
        <button className="ghost-button" type="button" onClick={() => scrollToSection('api-map')}>
          API status
        </button>
      </header>

      <main className="content-flow">
        <section className="panel hero-panel hero">
          <div className="hero-copy">
            <p className="eyebrow">Hugging Face · Torch · Flask</p>
            <h1>Fraud detection that stays ahead of scam playbooks.</h1>
            <p className="subtitle">
              Stream live validations, probability deltas, and explanation-ready evidence every time a recruiter or candidate pastes a job post.
            </p>
            <div className="hero-ctas">
              <button className="btn primary" type="button" onClick={() => scrollToSection('analyzer')}>
                Launch analyzer
              </button>
              <button className="btn secondary" type="button" onClick={() => scrollToSection('capabilities')}>
                Explore model map
              </button>
            </div>
          </div>
          <ul className="hero-metrics">
            <li>
              <p>Model</p>
              <strong>{serviceReady ? 'Online' : 'Loading'}</strong>
              <span>{apiStatus?.modelPath ?? DEFAULT_MODEL_ID}</span>
            </li>
            <li>
              <p>Live endpoints</p>
              <strong>{totalEndpoints}</strong>
              <span>Flask REST surface</span>
            </li>
            <li>
              <p>Min characters</p>
              <strong>{rules.minAnalyzeChars}+</strong>
              <span>Combined text threshold</span>
            </li>
          </ul>
        </section>

        <section className="status-row">
          {statusTiles.map((tile) => (
            <article key={tile.label} className="status-card">
              <p>{tile.label}</p>
              <strong>{tile.value}</strong>
              <span>{tile.detail}</span>
            </article>
          ))}
        </section>

        {showRiskReference && (
          <section className="panel risk-reference-panel" aria-live="polite">
            <header className="risk-reference-header">
              <div>
                <p className="eyebrow">Fraud Detection</p>
                <h2>Risk Indicator Reference Guide</h2>
              </div>
              <button
                type="button"
                className="ghost-button"
                onClick={() => setShowRiskReference(false)}
                title="Close reference guide"
              >
                ✕
              </button>
            </header>

            <div className="risk-indicators-grid">
              {RISK_INDICATORS_REFERENCE.map((indicator) => (
                <div key={indicator.category} className="risk-indicator-card">
                  <div className="card-header">
                    <div className={`risk-level risk-${indicator.riskLevel.toLowerCase()}`}>
                      {indicator.riskLevel}
                    </div>
                  </div>

                  <div className="category-section">
                    <h3>{indicator.category}</h3>
                    <p className="first-example">
                      — {indicator.examples[0]}
                    </p>
                  </div>

                  <p className="indicator-description">{indicator.description}</p>

                  <div className="examples-section">
                    <strong>Additional keywords:</strong>
                    <ul className="examples-list">
                      {indicator.examples.slice(1).map((example) => (
                        <li key={example}>
                          <span className="dash">—</span>
                          <code>{example}</code>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>

            <div className="risk-reference-footer">
              <p>
                💡 <strong>Pro Tip:</strong> Be alert when multiple indicators appear in the same posting. A single warning sign can be coincidental; multiple red flags together suggest fraud.
              </p>
            </div>
          </section>
        )}

        <section id="analyzer" className="workspace-section">
          <header className="section-heading">
            <div>
              <p className="eyebrow">Analyzer</p>
              <h2>Evaluate a posting in context</h2>
            </div>
            <span className={`status-pill ${serviceReady ? 'ready' : 'pending'}`}>
              {formattedStatusMessage}
            </span>
          </header>

          <div className="panel workspace-panel">
            <div className="workspace-grid">
              <form className="form-panel" onSubmit={handleSubmit}>
                <header>
                  <div>
                    <h3>Job content</h3>
                    <p className="muted">Paste title, company, and the description. We will merge them server-side.</p>
                  </div>
                  <p className="combined-length">Combined length · {combinedLength}</p>
                </header>

                {/* Quick Actions: Presets and Drafts */}
                <div className="quick-actions">
                  <div className="action-group">
                    <label>Quick test presets:</label>
                    <div className="preset-buttons">
                      {TEST_PRESETS.map((preset) => (
                        <button
                          key={preset.id}
                          type="button"
                          className="small-btn"
                          onClick={() => loadPreset(preset.id)}
                          title={`Load: ${preset.label}`}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="action-group">
                    <label>Saved drafts:</label>
                    <div className="draft-buttons">
                      <button
                        type="button"
                        className="small-btn save-draft"
                        onClick={() => {
                          const label = prompt('Draft name:', 'My draft')
                          if (label) saveDraft(label)
                        }}
                      >
                        💾 Save draft
                      </button>
                      {savedDrafts.length > 0 && (
                        <button
                          type="button"
                          className="small-btn"
                          onClick={() => setShowDrafts(!showDrafts)}
                        >
                          📂 Drafts ({savedDrafts.length})
                        </button>
                      )}
                    </div>
                    {showDrafts && savedDrafts.length > 0 && (
                      <div className="drafts-list">
                        {savedDrafts.map((draft) => (
                          <div key={draft.id} className="draft-item">
                            <button 
                              type="button"
                              className="draft-load"
                              onClick={() => loadDraft(draft.id)}
                            >
                              {draft.label}
                            </button>
                            <button
                              type="button"
                              className="draft-delete"
                              onClick={() => deleteDraft(draft.id)}
                              title="Delete draft"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <label>
                  Job Title
                  <input
                    type="text"
                    value={title}
                    maxLength={rules.maxTitleLength}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder="e.g. Senior Software Engineer"
                  />
                  <span className="counter">
                    {title.length}/{rules.maxTitleLength}
                  </span>
                </label>

                <label>
                  Company
                  <input
                    type="text"
                    value={company}
                    maxLength={rules.maxCompanyLength}
                    onChange={(event) => setCompany(event.target.value)}
                    placeholder="e.g. CloudTech Inc"
                  />
                  <span className="counter">
                    {company.length}/{rules.maxCompanyLength}
                  </span>
                </label>

                <label>
                  Description
                  <textarea
                    value={description}
                    maxLength={rules.maxDescriptionLength}
                    onChange={(event) => setDescription(event.target.value)}
                    rows={10}
                    placeholder="Paste the job posting description here..."
                  />
                  <span className="counter">
                    {description.length}/{rules.maxDescriptionLength}
                  </span>
                </label>

                <button type="submit" disabled={!serviceReady || isSubmitting}>
                  {isSubmitting ? 'Analyzing...' : 'Run full prediction'}
                </button>
              </form>

              <div className="workspace-side">
                <div className="panel-sub live-panel" aria-live="polite">
                  <header>
                    <div>
                      <p className="eyebrow">Live Monitor</p>
                      <h3>Realtime inference preview</h3>
                    </div>
                    <span
                      className={`status-pill ${isLiveAnalyzing ? 'pending' : liveResult ? 'ready' : 'pending'}`}
                    >
                      {isLiveAnalyzing ? 'Auto analyzing...' : liveResult ? 'Sync complete' : 'Waiting for content'}
                    </span>
                  </header>

                  {!serviceReady && <p className="placeholder">Waiting for backend readiness...</p>}

                  {serviceReady && !normalizedUserText && (
                    <p className="placeholder">
                      Start typing to view live backend validation and probability snapshots.
                    </p>
                  )}

                  {serviceReady && normalizedUserText && normalizedUserText.length < rules.minAnalyzeChars && (
                    <p className="placeholder">
                      Need {rules.minAnalyzeChars - normalizedUserText.length} more characters before the backend will score this posting.
                    </p>
                  )}

                  {liveError && <p className="error-text">{liveError}</p>}

                  {liveValidation && (
                    <div className="live-validation">
                      <div className="live-validation-header">
                        <strong>Server validation</strong>
                        <span className={`badge ${liveValidation.valid ? 'positive' : 'negative'}`}>
                          {liveValidation.valid ? 'Valid input' : 'Needs fixes'}
                        </span>
                      </div>
                      <p className="muted">Text length analyzed: {liveValidation.textLength} chars</p>
                      {liveValidation.errors.length > 0 && (
                        <ul className="inline-list">
                          {liveValidation.errors.map((error) => (
                            <li key={error}>{error}</li>
                          ))}
                        </ul>
                      )}
                      {liveValidation.warnings.length > 0 && (
                        <ul className="inline-list warning-list">
                          {liveValidation.warnings.map((warning) => (
                            <li key={warning}>{warning}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}

                  {liveResult && (
                    <div className="live-result">
                      <div>
                        <p className="eyebrow">Streaming verdict</p>
                        <h3>{liveResult.prediction_label}</h3>
                      </div>
                      <div className="live-metric-row">
                        <article>
                          <p>Fake probability</p>
                          <strong>{liveResult.fakeProbability.toFixed(1)}%</strong>
                        </article>
                        <article>
                          <p>Real probability</p>
                          <strong>{liveResult.realProbability.toFixed(1)}%</strong>
                        </article>
                        <article>
                          <p>Confidence band</p>
                          <strong>{liveResult.confidenceBand}</strong>
                        </article>
                      </div>
                      <p className="muted">{liveResult.whyFlagged.summary}</p>
                    </div>
                  )}
                </div>

                <div className="panel-sub api-card" id="api-map">
                  <header>
                    <p className="eyebrow">Backend snapshot</p>
                    <h3>Validation guardrails</h3>
                  </header>
                  <dl>
                    <div>
                      <dt>Max description</dt>
                      <dd>{rules.maxDescriptionLength.toLocaleString()} chars</dd>
                    </div>
                    <div>
                      <dt>Max title</dt>
                      <dd>{rules.maxTitleLength} chars</dd>
                    </div>
                    <div>
                      <dt>Max company</dt>
                      <dd>{rules.maxCompanyLength} chars</dd>
                    </div>
                  </dl>
                  <h4>Available endpoints</h4>
                  {endpointEntries.length > 0 ? (
                    <ul className="endpoint-list">
                      {endpointEntries.map(([route, doc]) => (
                        <li key={route}>
                          <strong>{route}</strong>
                          {' '}
                          <span>{doc}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="placeholder">Connect to the backend to list endpoints.</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {errors.length > 0 && (
            <section className="panel alert error" aria-live="polite">
              <header>
                <h2>Blocking issues</h2>
                <p>Please address these before scoring.</p>
              </header>
              <ul>
                {errors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            </section>
          )}

          {warnings.length > 0 && (
            <section className="panel alert warning" aria-live="polite">
              <header>
                <h2>Warnings</h2>
                <p>Submission is valid, but reviews may be less reliable.</p>
              </header>
              <ul>
                {warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </section>
          )}

          {result && (
            <section className="panel result-panel" aria-live="polite">
              <header className="result-header">
                <div>
                  <p className="eyebrow">Prediction</p>
                  <h2>{result.prediction_label}</h2>
                </div>
                <div className="result-actions">
                  <span className={`status-pill ${result.reviewNeeded ? 'warning' : 'ready'}`}>
                    {result.reviewNeeded ? 'Manual review recommended' : 'No review required'}
                  </span>
                  <button
                    type="button"
                    className="small-btn explain-btn"
                    onClick={getExplain}
                    disabled={isLoadingExplain}
                    title="Get detailed explanation with BERT attention and feature importance"
                  >
                    {isLoadingExplain ? '⏳ Explaining...' : '🔍 Show explainability'}
                  </button>
                </div>
              </header>

              <div className="metric-grid">
                {metricCards.map((metric) => (
                  <article key={metric.label}>
                    <p>{metric.label}</p>
                    <strong>{metric.value}</strong>
                    <small>{metric.hint}</small>
                  </article>
                ))}
              </div>

              <div className="indicator-section">
                <h3>Risk indicators</h3>
                <div className="chips">
                  {result.indicators.length > 0 ? (
                    result.indicators.map((indicator, index) => (
                      <React.Fragment key={indicator}>
                        {index > 0 && <span className="chip-separator"> <> </> </span>}
                        <span className="chip">
                          {indicator}
                        </span>
                      </React.Fragment>
                    ))
                  ) : (
                    <span className="chip ghost">No indicators detected</span>
                  )}
                </div>

                {result.whyFlagged.indicatorDetails.length > 0 && (
                  <ul className="indicator-details">
                    {result.whyFlagged.indicatorDetails.map((detail) => (
                      <li key={detail.category}>
                        <div className="indicator-detail-label">
                          <strong>{detail.category}</strong>
                          <span className="indicator-separator"></span>
                        </div>
                        <div className="indicator-detail-phrases">
                          {detail.matched_phrases.map((phrase, idx) => (
                            <span key={idx} className="matched-phrase">
                              {phrase}
                            </span>
                          ))}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="split-panel">
                <div>
                  <h3>Why flagged</h3>
                  <p>{result.whyFlagged.summary}</p>
                  <p>{result.whyFlagged.reason}</p>
                  <ul className="chips ghost">
                    <li>Indicators: {result.whyFlagged.indicatorCount}</li>
                  </ul>
                </div>
                <div>
                  <h3>Suggestions</h3>
                  <ul>
                    {result.suggestions.map((suggestion) => (
                      <li key={suggestion}>{suggestion}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="signal-columns">
                <div>
                  <h4>Risk phrases</h4>
                  {result.whyFlagged.reviewSignals.fakeTerms.length > 0 ? (
                    <ul className="signal-list">
                      {result.whyFlagged.reviewSignals.fakeTerms.map((term) => (
                        <li key={term}>{term}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="placeholder">No explicit risk phrases matched.</p>
                  )}
                </div>
                <div>
                  <h4>Legitimacy anchors</h4>
                  {result.whyFlagged.reviewSignals.goodTerms.length > 0 ? (
                    <ul className="signal-list positive">
                      {result.whyFlagged.reviewSignals.goodTerms.map((term) => (
                        <li key={term}>{term}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="placeholder">No grounding phrases detected.</p>
                  )}
                </div>
              </div>
            </section>
          )}

          {showExplainability && explainData && (
            <section className="panel explainability-panel" aria-live="polite">
              <header>
                <div>
                  <p className="eyebrow">Explainability</p>
                  <h3>Why did the model make this prediction?</h3>
                </div>
                <button
                  type="button"
                  className="ghost-button"
                  onClick={() => setShowExplainability(false)}
                  title="Close explainability view"
                >
                  ✕
                </button>
              </header>

              <div className="explain-grid">
                {/* Feature Importance */}
                <div className="explain-section">
                  <h4>📊 Feature Importance</h4>
                  <p className="muted">{explainData.feature_importance.explanation_text}</p>
                  <div className="feature-list">
                    {explainData.feature_importance.feature_importance.slice(0, 5).map((feature) => (
                      <div key={feature.feature} className={`feature-item ${feature.impact_direction}`}>
                        <div className="feature-header">
                          <strong>{feature.feature}</strong>
                          <span className="impact-score">
                            {feature.impact_direction === 'increases_risk' ? '+' : '-'}
                            {feature.impact_score.toFixed(1)}%
                          </span>
                        </div>
                        {feature.matched_phrases.length > 0 && (
                          <p className="phrases">
                            Matched: {feature.matched_phrases.slice(0, 2).join(', ')}
                            {feature.matched_phrases.length > 2 ? '...' : ''}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Attention Weights */}
                <div className="explain-section">
                  <h4>🧠 Token Attention</h4>
                  <p className="muted">Top tokens the model focused on during inference:</p>
                  <div className="attention-list">
                    {explainData.attention_weights.top_tokens.length > 0 ? (
                      explainData.attention_weights.top_tokens.slice(0, 8).map(([token, weight]) => (
                        <div key={token} className="token-item" style={{ opacity: Math.max(0.4, Math.min(1, weight * 2.5)) }}>
                          <code>{token}</code>
                          <small>{(weight * 100).toFixed(1)}%</small>
                        </div>
                      ))
                    ) : (
                      <p className="placeholder">No attention weights available.</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="explain-footer">
                <p className="note">
                  💡 <strong>Note:</strong> Explainability is provided as a guide. Always conduct manual verification of job listings before taking action.
                </p>
              </div>
            </section>
          )}
        </section>

        <section id="capabilities" className="panel capabilities-panel">
          <header>
            <div>
              <p className="eyebrow">Model capabilities</p>
              <h2>What the detector surfaces</h2>
            </div>
            <p className="muted">Signal transparency across validation, inference, and review routing.</p>
          </header>
          <div className="capabilities-grid">
            {capabilityHighlights.map((item) => (
              <article key={item.title} className="capability-card">
                <p className="eyebrow">{item.meta}</p>
                <h3>{item.title}</h3>
                <p>{item.detail}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="test-lab" className="panel lab-panel">
          <header>
            <div>
              <p className="eyebrow">Regression playbook</p>
              <h2>Edge cases we continuously monitor</h2>
            </div>
            <div>
              <p className="muted">
                Pulled directly from TEST_CASES.md and grouped by the keyword bundles the model reacts to
                (unrealistic pay, upfront fees, powerful credential anchors, etc.). Each card shows how
                those cues tilt the fake/real likelihood when scenarios sit on the boundary.
              </p>
              <ul className="lab-basis">
                <li>Risk keywords: inflated income, payment requests, money movement verbs.</li>
                <li>Legitimacy anchors: certifications, benefits, territory specifics, application flow.</li>
                <li>Grey-zone markers: MLM language, vague promises, formatting noise.</li>
              </ul>
            </div>
          </header>
          <div className="case-grid">
            {highlightedTests.map((test) => (
              <article key={test.id} className={`case-card ${test.tone}`}>
                <div className="case-head">
                  <span>{test.id}</span>
                  <strong>{test.expected}</strong>
                </div>
                <h3>{test.title}</h3>
                <p>{test.notes}</p>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}

export default App
