/* ==========================================================================
   SWANS LEGALTECH - PERSONAL INJURY TREATMENT TIMELINE & TRIAL INTELLIGENCE
   Production Application Engine (Vanilla JS)
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    // --- Application State ---
    const state = {
        activeCaseId: 'caldwell',
        cases: typeof sampleCases !== 'undefined' ? sampleCases : {},
        activeTab: 'tab-timeline',
        viewLayout: 'stream', // 'stream' or 'grid'
        starredExhibits: new Set(),
        filters: {
            searchQuery: '',
            sequence: 'all', // 'all', 'pre', 'post'
            milestone: 'all', // 'all', 'critical', 'er', 'mri', 'surgery', 'pt', 'exhibits'
            gapHighlight: true,
            selectedBodyPart: null,
            groupBy: 'none', // 'none', 'provider', 'medicineType', 'bodyPart'
            providerFilter: new Set(),
            medTypeFilter: new Set(),
            dateFrom: null,
            dateTo: null
        },
        geminiKey: null,
        verdictParams: {
            medicalBills: null,
            multiplier: 3.0,
            futureCare: 35000,
            lostWages: 14500,
            fault: 0
        },
        billingChart: null
    };

    // Region Aliases for robust anatomical matching
    const regionAliases = {
        'Head': ['head', 'brain', 'concussion', 'face', 'skull', 'sinuses'],
        'Neck': ['neck', 'cervical', 'c-spine'],
        'Thoracic Spine': ['thoracic', 't-spine', 'upper back', 'mid-back', 'mid back'],
        'Lumbar Spine': ['lumbar', 'l-spine', 'lower back', 'low back', 'back', 'spine', 'sacrum', 'si joint', 'sacroiliac'],
        'Shoulder': ['shoulder', 'arm', 'elbow', 'forearm', 'bicep', 'tricep', 'trapezius', 'upper extremity'],
        'Hand': ['hand', 'wrist', 'finger', 'thumb', 'metacarpal', 'digit'],
        'Hip': ['hip', 'pelvis', 'pelvic', 'buttocks', 'groin'],
        'Knee': ['knee', 'leg', 'thigh', 'shin', 'ankle', 'foot', 'heel', 'toe', 'lower extremity']
    };

    // Initialize starred exhibits from initial case
    initStarredExhibits();

    // --- DOM Elements ---
    const elements = {
        sampleSelect: document.getElementById('sampleSelect'),
        uploadExcelTriggerBtn: document.getElementById('uploadExcelTriggerBtn'),
        fileUploadInput: document.getElementById('fileUpload'),
        openQuestionnaireBtn: document.getElementById('openQuestionnaireBtn'),
        quickExportBtn: document.getElementById('quickExportBtn'),
        navTabs: document.querySelectorAll('.nav-tab'),
        tabPanels: document.querySelectorAll('.tab-panel'),

        // Tab 1 Elements
        vCaseMetaBadge: document.getElementById('vCaseMetaBadge'),
        vMedicalBills: document.getElementById('vMedicalBills'),
        vTotalEncounters: document.getElementById('vTotalEncounters'),
        vCriticalEncounters: document.getElementById('vCriticalEncounters'),
        vMedicalBillsInput: document.getElementById('vMedicalBillsInput'),
        vFutureCareInput: document.getElementById('vFutureCareInput'),
        vLostWagesInput: document.getElementById('vLostWagesInput'),
        vMultiplierSlider: document.getElementById('vMultiplierSlider'),
        vMultiplierVal: document.getElementById('vMultiplierVal'),
        vFaultSlider: document.getElementById('vFaultSlider'),
        vFaultVal: document.getElementById('vFaultVal'),
        vSettlementLow: document.getElementById('vSettlementLow'),
        vSettlementMid: document.getElementById('vSettlementMid'),
        vSettlementHigh: document.getElementById('vSettlementHigh'),
        vStrengthScore: document.getElementById('vStrengthScore'),
        vStrengthFactors: document.getElementById('vStrengthFactors'),
        demandLetterBox: document.getElementById('demandLetterBox'),
        copyDemandBtn: document.getElementById('copyDemandBtn'),

        // Tab 2 Elements
        searchBox: document.getElementById('searchBox'),
        crashDateInput: document.getElementById('crashDateInput'),
        milestoneFilter: document.getElementById('milestoneFilter'),
        gapToggle: document.getElementById('gapToggle'),
        layoutStreamBtn: document.getElementById('layoutStreamBtn'),
        layoutSteppedBtn: document.getElementById('layoutSteppedBtn'),
        layoutGridBtn: document.getElementById('layoutGridBtn'),
        sequencePills: document.querySelectorAll('.filter-pills button[data-view]'),
        metricTotal: document.getElementById('metricTotal'),
        metricShown: document.getElementById('metricShown'),
        metricStarred: document.getElementById('metricStarred'),
        tCaseTitle: document.getElementById('tCaseTitle'),
        tCaseSub: document.getElementById('tCaseSub'),
        tGapSummaryBadge: document.getElementById('tGapSummaryBadge'),
        gapAlertBanner: document.getElementById('gapAlertBanner'),
        gapBannerTitle: document.getElementById('gapBannerTitle'),
        gapBannerText: document.getElementById('gapBannerText'),
        timelineContainer: document.getElementById('timelineContainer'),

        // Tab 3 Elements
        cPreCount: document.getElementById('cPreCount'),
        cPostCount: document.getElementById('cPostCount'),
        cPainShift: document.getElementById('cPainShift'),
        cCostShift: document.getElementById('cCostShift'),
        cPreTag: document.getElementById('cPreTag'),
        cPostTag: document.getElementById('cPostTag'),
        causationPreList: document.getElementById('causationPreList'),
        causationPostList: document.getElementById('causationPostList'),
        causationMatrixBody: document.getElementById('causationMatrixBody'),

        // Tab 4 Elements
        humanBodySvg: document.getElementById('humanBodySvg'),
        heatmapTableBody: document.getElementById('heatmapTableBody'),

        // Tab 5 Elements
        aiBriefBox: document.getElementById('aiBriefBox'),
        regenAiBriefBtn: document.getElementById('regenAiBriefBtn'),
        aiQuestionInput: document.getElementById('aiQuestionInput'),
        aiAskBtn: document.getElementById('aiAskBtn'),
        aiAnswerWindow: document.getElementById('aiAnswerWindow'),
        aiAnswerText: document.getElementById('aiAnswerText'),
        copyAiAnswerBtn: document.getElementById('copyAiAnswerBtn'),
        btnGenImeQuestions: document.getElementById('btnGenImeQuestions'),
        btnGenJuryAnchors: document.getElementById('btnGenJuryAnchors'),
        btnGenMediationSummary: document.getElementById('btnGenMediationSummary'),

        // Tab 6 Elements
        printPdfDeckBtn: document.getElementById('printPdfDeckBtn'),
        downloadJsonBtn: document.getElementById('downloadJsonBtn'),
        downloadCsvBtn: document.getElementById('downloadCsvBtn'),
        dSlide1Title: document.getElementById('dSlide1Title'),
        dSlide1Meta: document.getElementById('dSlide1Meta'),
        dSlide1Medical: document.getElementById('dSlide1Medical'),
        dSlide1Wages: document.getElementById('dSlide1Wages'),
        dSlide1Future: document.getElementById('dSlide1Future'),
        dSlide1Target: document.getElementById('dSlide1Target'),
        dSlide2Grid: document.getElementById('dSlide2Grid'),
        dSlide3TableBody: document.getElementById('dSlide3TableBody'),
        dSlide4Summary: document.getElementById('dSlide4Summary'),
        dSlide4GapList: document.getElementById('dSlide4GapList'),
        dSlide5PreBox: document.getElementById('dSlide5PreBox'),
        dSlide5PostBox: document.getElementById('dSlide5PostBox'),

        // Modals
        eventModal: document.getElementById('eventModal'),
        modalTitle: document.getElementById('modalTitle'),
        modalSeverityBadge: document.getElementById('modalSeverityBadge'),
        modalBody: document.getElementById('modalBody'),
        modalStarBtn: document.getElementById('modalStarBtn'),
        modalCloseBtn: document.getElementById('modalCloseBtn'),
        modalCloseActionBtn: document.getElementById('modalCloseActionBtn'),

        questionnaireModal: document.getElementById('questionnaireModal'),
        questionnaireForm: document.getElementById('questionnaireForm'),
        qModalCloseBtn: document.getElementById('qModalCloseBtn'),

        uploadModal: document.getElementById('uploadModal'),
        uModalCloseBtn: document.getElementById('uModalCloseBtn'),
        dropZone: document.getElementById('dropZone'),
        browseFilesBtn: document.getElementById('browseFilesBtn'),
        uploadStatusBox: document.getElementById('uploadStatusBox')
    };

    let activeModalEncounterId = null;

    // --- Helper Functions ---
    function formatCurrency(val) {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val || 0);
    }

    // Escape untrusted cell text before interpolating into innerHTML (uploaded Excel is arbitrary content)
    function escapeHtml(val) {
        if (val === null || val === undefined) return '';
        return String(val)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    // Normalize any date value into a MM/DD/YYYY display string (matches the sample data style)
    function formatDisplayDate(dateVal) {
        const d = getParsedDate(dateVal);
        if (isNaN(d.getTime())) return String(dateVal || '');
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${m}/${day}/${d.getFullYear()}`;
    }

    // Convert any parsed date into a yyyy-mm-dd string for <input type="date">
    function toInputDate(dateStr) {
        const d = getParsedDate(dateStr);
        if (isNaN(d.getTime())) return '';
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    }

    // Single source of truth for applying the (attorney-supplied) crash date and deriving pre/post for every encounter
    function applyAccidentDate(cCase, dateStr) {
        if (!cCase || !dateStr) return;
        cCase.meta.accidentDate = dateStr;
        const accDate = getParsedDate(dateStr);
        cCase.encounters.forEach(e => {
            e.isPreCrash = getParsedDate(e.date) < accDate;
        });
    }

    function getCurrentCase() {
        return state.cases[state.activeCaseId] || null;
    }

    function initStarredExhibits() {
        state.starredExhibits.clear();
        const currentCase = getCurrentCase();
        if (currentCase && currentCase.encounters) {
            currentCase.encounters.forEach(enc => {
                if (enc.isStarred) {
                    state.starredExhibits.add(enc.id);
                }
            });
        }
    }

    function getParsedDate(dateStr) {
        if (!dateStr) return new Date(1970, 0, 1);
        if (dateStr instanceof Date) return dateStr;
        if (typeof dateStr === 'number') {
            // Excel date serial (days since 1899-12-30)
            return new Date(Date.UTC(1899, 11, 30) + dateStr * 86400000);
        }
        if (typeof dateStr !== 'string') return new Date(dateStr);

        // Bare Excel serial that arrived as a string (e.g. "45658")
        if (/^\d{4,6}$/.test(dateStr.trim())) {
            return new Date(Date.UTC(1899, 11, 30) + parseInt(dateStr.trim(), 10) * 86400000);
        }

        let parts;
        if (dateStr.includes('/')) {
            parts = dateStr.split('/');
            if (parts.length === 3) {
                if (parts[0].length === 4) {
                    return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
                } else {
                    return new Date(parseInt(parts[2]), parseInt(parts[0]) - 1, parseInt(parts[1]));
                }
            }
        } else if (dateStr.includes('-')) {
            parts = dateStr.split('-');
            if (parts.length === 3) {
                if (parts[0].length === 4) {
                    return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
                } else {
                    return new Date(parseInt(parts[2]), parseInt(parts[0]) - 1, parseInt(parts[1]));
                }
            }
        }
        const d = new Date(dateStr);
        return isNaN(d.getTime()) ? new Date(1970, 0, 1) : d;
    }

    function daysBetween(d1, d2) {
        const msPerDay = 1000 * 60 * 60 * 24;
        return Math.round(Math.abs((d2 - d1) / msPerDay));
    }

    function calculateGaps(encounters) {
        const currentCase = getCurrentCase();
        if (!currentCase) return [];
        const accidentDate = getParsedDate(currentCase.meta.accidentDate);
        
        // Filter post-accident encounters and sort by date ascending
        const postEncounters = encounters
            .filter(e => getParsedDate(e.date) >= accidentDate)
            .sort((a, b) => getParsedDate(a.date) - getParsedDate(b.date));

        const gaps = [];
        for (let i = 0; i < postEncounters.length - 1; i++) {
            const currDate = getParsedDate(postEncounters[i].date);
            const nextDate = getParsedDate(postEncounters[i + 1].date);
            const diffDays = daysBetween(currDate, nextDate);

            if (diffDays > 21) {
                gaps.push({
                    startDate: postEncounters[i].date,
                    endDate: postEncounters[i + 1].date,
                    days: diffDays,
                    prevProvider: postEncounters[i].provider,
                    nextProvider: postEncounters[i + 1].provider,
                    prevId: postEncounters[i].id,
                    rebuttal: `Patient maintained home therapy protocol & awaited specialist scheduling for ${postEncounters[i + 1].medicineType || 'specialty care'}.`
                });
            }
        }
        return gaps;
    }

    // ==========================================================================
    //  v2 FEATURES: toasts, glance strip, milestones, facets, grouping,
    //  saved timelines, and live Gemini AI (with offline fallback).
    // ==========================================================================

    function showToast(message, type = 'info') {
        const stack = document.getElementById('toastStack');
        if (!stack) { console.log(message); return; }
        const el = document.createElement('div');
        el.className = `toast ${type}`;
        el.textContent = message;
        stack.appendChild(el);
        setTimeout(() => {
            el.style.transition = 'opacity .3s ease';
            el.style.opacity = '0';
            setTimeout(() => el.remove(), 300);
        }, 3800);
    }

    // Distinct providers / medicine types / body-region zones present in a case
    function distinctProviders(encounters) {
        return [...new Set(encounters.map(e => (e.provider || '').trim()).filter(Boolean))].sort();
    }
    function distinctMedTypes(encounters) {
        return [...new Set(encounters.map(e => (e.medicineType || '').trim()).filter(Boolean))].sort();
    }
    function distinctRegions(encounters) {
        const zones = new Set();
        encounters.forEach(e => {
            const bp = (e.bodyPart || '').toLowerCase();
            if (!bp) return;
            Object.keys(regionAliases).forEach(zone => {
                if (regionAliases[zone].some(a => bp.includes(a))) zones.add(zone);
            });
        });
        return [...zones];
    }

    // Case At-a-Glance strip: the 30-second story
    function renderGlanceStrip(cCase) {
        const strip = document.getElementById('glanceStrip');
        if (!strip) return;
        const enc = cCase.encounters || [];
        const sorted = [...enc].sort((a, b) => getParsedDate(a.date) - getParsedDate(b.date));
        const span = sorted.length ? daysBetween(getParsedDate(sorted[0].date), getParsedDate(sorted[sorted.length - 1].date)) : 0;
        const surgeries = enc.filter(e => /surgery|surgical|operative|injection|arthroscopy|discectomy|fusion/i.test((e.recordType || '') + ' ' + (e.summary || ''))).length;
        const crash = cCase.meta.accidentDate ? formatDisplayDate(cCase.meta.accidentDate) : 'Not set';
        const items = [
            { lbl: 'Patient', val: cCase.meta.patientName || 'Case', cls: '' },
            { lbl: 'Crash Date', val: crash, cls: cCase.meta.accidentDate ? 'accent' : 'warn' },
            { lbl: 'Encounters', val: enc.length, cls: 'accent' },
            { lbl: 'Treatment Span', val: span + ' days', cls: '' },
            { lbl: 'Providers', val: distinctProviders(enc).length, cls: '' },
            { lbl: 'Body Regions', val: distinctRegions(enc).length, cls: '' },
            { lbl: 'Procedures', val: surgeries, cls: surgeries ? 'warn' : '' }
        ];
        strip.innerHTML = items.map(i => `
            <div class="glance-item ${i.cls}">
                <span class="glance-val">${escapeHtml(String(i.val))}</span>
                <span class="glance-lbl">${i.lbl}</span>
            </div>`).join('');
    }

    // Deterministic "dates that matter" for the milestones rail
    function computeKeyMilestones(cCase) {
        const enc = [...(cCase.encounters || [])].sort((a, b) => getParsedDate(a.date) - getParsedDate(b.date));
        if (!enc.length) return [];
        const out = [];
        const seen = new Set();
        const push = (e, label, cls) => { if (e && !seen.has(e.id)) { seen.add(e.id); out.push({ id: e.id, date: e.date, label, cls }); } };
        push(enc.find(e => /emergency|ems|ambulance/i.test((e.medicineType || '') + ' ' + (e.recordType || ''))), 'First ER / EMS', 'crit');
        push(enc.find(e => /mri|ct scan|\bct\b|imaging|radiology|x-ray/i.test((e.recordType || '') + ' ' + (e.medicineType || '') + ' ' + (e.summary || ''))), 'First Imaging', 'high');
        enc.filter(e => /surgery|surgical|operative|injection|arthroscopy|discectomy|fusion/i.test((e.recordType || '') + ' ' + (e.summary || ''))).slice(0, 4).forEach(e => push(e, 'Procedure', 'crit'));
        const withPain = enc.filter(e => e.painScore != null);
        if (withPain.length) { const mx = Math.max(...withPain.map(e => e.painScore)); push(withPain.find(e => e.painScore === mx), `Peak Pain ${mx}/10`, 'high'); }
        push(enc[enc.length - 1], 'Last Treatment', '');
        out.sort((a, b) => getParsedDate(a.date) - getParsedDate(b.date));
        return out;
    }

    function renderMilestonesRail(cCase) {
        const rail = document.getElementById('milestonesRail');
        if (!rail) return;
        const milestones = computeKeyMilestones(cCase);
        let html = '';
        if (cCase.meta.accidentDate) {
            html += `<div class="milestone-chip crit" data-crash="1" title="Crash date">
                <i class="fa-solid fa-car-burst"></i><span>Collision</span>
                <span class="mc-date">${escapeHtml(formatDisplayDate(cCase.meta.accidentDate))}</span></div>`;
        }
        html += milestones.map(m => `
            <div class="milestone-chip ${m.cls}" data-jump="${m.id}" title="Jump to encounter">
                <span>${escapeHtml(m.label)}</span>
                <span class="mc-date">${escapeHtml(m.date)}</span>
            </div>`).join('');
        rail.innerHTML = html || '<span class="text-dim" style="font-size:var(--fs-xs);">No key milestones detected.</span>';
    }

    function renderFacets(cCase) {
        const provBox = document.getElementById('providerFacets');
        const medBox = document.getElementById('medTypeFacets');
        if (provBox) {
            provBox.innerHTML = distinctProviders(cCase.encounters).slice(0, 40).map(p =>
                `<span class="facet-chip ${state.filters.providerFilter.has(p) ? 'active' : ''}" data-facet="provider" data-val="${escapeHtml(p)}">${escapeHtml(p)}</span>`).join('')
                || '<span class="text-dim" style="font-size:var(--fs-xs);">None</span>';
        }
        if (medBox) {
            medBox.innerHTML = distinctMedTypes(cCase.encounters).slice(0, 30).map(m =>
                `<span class="facet-chip ${state.filters.medTypeFilter.has(m) ? 'active' : ''}" data-facet="medtype" data-val="${escapeHtml(m)}">${escapeHtml(m)}</span>`).join('')
                || '<span class="text-dim" style="font-size:var(--fs-xs);">None</span>';
        }
    }

    // Single reusable encounter card (used by stream and grouped views)
    function encounterCardHtml(enc) {
        const isStarred = state.starredExhibits.has(enc.id);
        const sevClass = `sev-${enc.severity || 'routine'}`;
        const pdf = enc.pdfLink && /^https?:\/\//i.test(enc.pdfLink)
            ? `<a class="card-link" href="${escapeHtml(enc.pdfLink)}" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()"><i class="fa-solid fa-file-pdf"></i> Source PDF</a>`
            : (enc.pdfLink ? `<span class="card-link"><i class="fa-solid fa-file-pdf"></i> Source on file</span>` : '');
        return `
            <div class="timeline-card ${enc.severity || 'routine'}" data-id="${enc.id}" tabindex="0" role="button" style="cursor:pointer;">
                <div class="card-top-row">
                    <span class="card-date-badge">${escapeHtml(enc.date)}</span>
                    <div class="badge-group">
                        ${enc.isPreCrash ? '<span class="sev-badge" style="background:rgba(148,163,184,0.2);color:#94a3b8;">Pre-Crash</span>' : ''}
                        <span class="sev-badge ${sevClass}">${escapeHtml(enc.severity || 'routine')}</span>
                        <button class="star-btn ${isStarred ? 'starred' : ''}" data-star-id="${enc.id}" title="Toggle Exhibit Star" aria-label="Toggle exhibit star">
                            <i class="fa-solid fa-star"></i>
                        </button>
                    </div>
                </div>
                <div class="card-title-row">
                    <h4>${escapeHtml(enc.provider || 'Unknown Provider')}</h4>
                    <span class="card-facility">${escapeHtml(enc.facility || 'Unknown Facility')}</span>
                </div>
                <div class="card-meta-tags">
                    <span class="tag-pill"><i class="fa-solid fa-file-medical"></i> ${escapeHtml(enc.recordType || 'Record')}</span>
                    ${enc.bodyPart ? `<span class="tag-pill"><i class="fa-solid fa-child"></i> ${escapeHtml(enc.bodyPart)}</span>` : ''}
                    ${enc.painScore != null ? `<span class="tag-pill text-amber"><i class="fa-solid fa-wave-square"></i> Pain: ${enc.painScore}/10</span>` : ''}
                    ${enc.billingAmount != null ? `<span class="tag-pill text-emerald"><i class="fa-solid fa-dollar-sign"></i> ${formatCurrency(enc.billingAmount)}</span>` : ''}
                </div>
                <p class="card-summary-snippet">${enc.summary ? escapeHtml(enc.summary.substring(0, 180)) + (enc.summary.length > 180 ? '...' : '') : 'No details available.'}</p>
                <div class="card-actions-row">
                    <span class="read-more-link" onclick="event.stopPropagation();openEncounterModal('${enc.id}')">Read Full Encounter &rarr;</span>
                    ${pdf}
                </div>
            </div>`;
    }

    function groupLabel(key) {
        return ({ provider: 'Provider', medicineType: 'Medicine Type', bodyPart: 'Body Part' })[key] || key;
    }

    // ---- Saved timelines (localStorage) ----
    const SAVED_KEY = 'swans_saved_timelines';
    function readSaved() {
        try { return JSON.parse(localStorage.getItem(SAVED_KEY) || '[]'); } catch (e) { return []; }
    }
    function saveCurrentTimeline() {
        const cCase = getCurrentCase();
        if (!cCase) return;
        const saved = readSaved();
        const entry = {
            id: `saved_${Date.now()}`,
            name: cCase.meta.patientName || 'Untitled Case',
            savedAt: new Date().toISOString(),
            encounters: cCase.encounters.length,
            data: cCase
        };
        saved.unshift(entry);
        try {
            localStorage.setItem(SAVED_KEY, JSON.stringify(saved.slice(0, 25)));
            showToast(`Saved "${entry.name}" to this browser.`, 'success');
        } catch (e) {
            showToast('Could not save (storage full or blocked).', 'error');
        }
    }
    function renderSavedList() {
        const box = document.getElementById('savedList');
        if (!box) return;
        const saved = readSaved();
        if (!saved.length) { box.innerHTML = '<p class="text-dim" style="font-size:var(--fs-sm);">No saved timelines yet. Use Save to keep one here.</p>'; return; }
        box.innerHTML = saved.map(s => `
            <div class="saved-row">
                <div><div class="sr-name">${escapeHtml(s.name)}</div>
                <div class="sr-meta">${s.encounters} encounters · ${new Date(s.savedAt).toLocaleString()}</div></div>
                <button class="glass-btn btn-secondary text-xs" data-load="${s.id}">Open</button>
                <button class="glass-btn btn-secondary text-xs" data-del="${s.id}">Delete</button>
            </div>`).join('');
    }
    function loadSavedTimeline(id) {
        const entry = readSaved().find(s => s.id === id);
        if (!entry) return;
        const caseId = `saved_case_${Date.now()}`;
        state.cases[caseId] = entry.data;
        let opt = Array.from(elements.sampleSelect.options).find(o => o.value === caseId);
        if (!opt) {
            opt = document.createElement('option');
            opt.value = caseId;
            opt.textContent = `${entry.name} (saved)`;
            elements.sampleSelect.appendChild(opt);
        }
        elements.sampleSelect.value = caseId;
        state.activeCaseId = caseId;
        state.filters.selectedBodyPart = null;
        state.filters.providerFilter.clear();
        state.filters.medTypeFilter.clear();
        state.verdictParams.medicalBills = null;
        initStarredExhibits();
        document.getElementById('savedModal').classList.add('hidden');
        switchTab('tab-timeline');
        renderApp();
        showToast(`Opened "${entry.name}".`, 'success');
    }
    function deleteSaved(id) {
        localStorage.setItem(SAVED_KEY, JSON.stringify(readSaved().filter(s => s.id !== id)));
        renderSavedList();
    }

    // ---- Live Gemini AI (optional; graceful offline fallback) ----
    // Uses the Generative Language REST endpoint (generateContent). Key stays client-side.
    async function callGemini(prompt) {
        if (!state.geminiKey) throw new Error('No API key set');
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(state.geminiKey)}`;
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });
        if (!res.ok) throw new Error(`Gemini HTTP ${res.status}`);
        const data = await res.json();
        const text = data && data.candidates && data.candidates[0] && data.candidates[0].content
            && data.candidates[0].content.parts && data.candidates[0].content.parts[0]
            ? data.candidates[0].content.parts[0].text : '';
        if (!text) throw new Error('Empty AI response');
        return text;
    }

    // Compact, grounded context so the model answers from THIS case only
    function buildAiContext(cCase) {
        const meta = cCase.meta;
        const rows = [...cCase.encounters]
            .sort((a, b) => getParsedDate(a.date) - getParsedDate(b.date))
            .slice(0, 120)
            .map(e => `- ${e.date} | ${e.provider} @ ${e.facility} | ${e.recordType}/${e.medicineType} | ${e.bodyPart || 'n/a'}${e.isPreCrash ? ' | PRE-CRASH' : ''} | ${(e.summary || '').replace(/\s+/g, ' ').slice(0, 260)}`)
            .join('\n');
        return `PATIENT: ${meta.patientName}\nCRASH DATE: ${meta.accidentDate || 'not provided'}\nENCOUNTERS (${cCase.encounters.length} total, chronological):\n${rows}`;
    }

    function setAiModeBadge() {
        const badge = document.getElementById('aiModeBadge');
        if (!badge) return;
        badge.textContent = state.geminiKey ? 'Live AI (Gemini)' : 'Offline mode';
        badge.style.borderColor = state.geminiKey ? 'var(--brand)' : '';
        badge.style.color = state.geminiKey ? '#c7d2fe' : '';
    }

    function renderAiAnswer(html) {
        elements.aiAnswerText.innerHTML = html;
        elements.aiAnswerWindow.classList.remove('hidden');
    }

    // Turn light markdown from the model into safe HTML (escape, then re-apply a few marks)
    function aiTextToHtml(text) {
        let s = escapeHtml(text);
        s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        s = s.replace(/^\s*[-*]\s+(.*)$/gm, '• $1');
        s = s.replace(/\n/g, '<br>');
        return s;
    }

    // ---- PowerPoint export (PptxGenJS) ----
    function exportPptx() {
        const cCase = getCurrentCase();
        if (!cCase) return;
        if (typeof PptxGenJS === 'undefined') { showToast('PowerPoint library not loaded (offline?).', 'error'); return; }
        const NAVY = '0A0E18', INK = '1D2740', BRAND = '6366F1', MUT = '8695AB';
        const pptx = new PptxGenJS();
        pptx.defineLayout({ name: 'W', width: 13.33, height: 7.5 });
        pptx.layout = 'W';
        const enc = [...cCase.encounters].sort((a, b) => getParsedDate(a.date) - getParsedDate(b.date));

        // Slide 1: title / overview
        let s = pptx.addSlide();
        s.background = { color: NAVY };
        s.addText('Medical Treatment Timeline', { x: 0.6, y: 0.6, w: 12, h: 0.8, fontSize: 32, bold: true, color: 'FFFFFF' });
        s.addText(cCase.meta.patientName || 'Case', { x: 0.6, y: 1.5, w: 12, h: 0.5, fontSize: 20, color: 'C7D2FE' });
        const span = enc.length ? daysBetween(getParsedDate(enc[0].date), getParsedDate(enc[enc.length - 1].date)) : 0;
        const overview = [
            ['Crash date', cCase.meta.accidentDate ? formatDisplayDate(cCase.meta.accidentDate) : 'Not set'],
            ['Encounters', String(cCase.encounters.length)],
            ['Treatment span', span + ' days'],
            ['Providers', String(distinctProviders(cCase.encounters).length)],
            ['Body regions', String(distinctRegions(cCase.encounters).length)]
        ];
        s.addText(overview.map(r => ({ text: `${r[0]}:  `, options: { bold: true, color: 'FFFFFF' } })).flatMap((t, i) => [t, { text: overview[i][1] + '\n', options: { color: 'C7D2FE' } }]),
            { x: 0.6, y: 2.4, w: 8, h: 3, fontSize: 16, lineSpacingMultiple: 1.3 });

        // Slide 2: key milestones
        const ms = computeKeyMilestones(cCase);
        s = pptx.addSlide(); s.background = { color: 'FFFFFF' };
        s.addText('Key Milestones', { x: 0.6, y: 0.4, w: 12, h: 0.6, fontSize: 26, bold: true, color: INK });
        if (ms.length) {
            s.addText(ms.map(m => ({ text: `${m.date}  -  ${m.label}\n`, options: { fontSize: 16, color: INK, bullet: true } })),
                { x: 0.7, y: 1.3, w: 12, h: 5, lineSpacingMultiple: 1.3 });
        }

        // Slide 3: chronology table (first 24 rows)
        s = pptx.addSlide(); s.background = { color: 'FFFFFF' };
        s.addText('Treatment Chronology', { x: 0.6, y: 0.4, w: 12, h: 0.6, fontSize: 26, bold: true, color: INK });
        const head = ['Date', 'Provider', 'Type', 'Body Part'].map(t => ({ text: t, options: { bold: true, color: 'FFFFFF', fill: BRAND } }));
        const rows = enc.slice(0, 24).map(e => [e.date, (e.provider || '').slice(0, 30), (e.recordType || '').slice(0, 24), (e.bodyPart || '').slice(0, 20)]);
        s.addTable([head, ...rows], { x: 0.5, y: 1.2, w: 12.3, fontSize: 11, color: INK, border: { pt: 0.5, color: 'D0D7E2' }, autoPage: false });

        pptx.writeFile({ fileName: `${(cCase.meta.patientName || 'case').replace(/\s+/g, '_')}_timeline.pptx` })
            .then(() => showToast('PowerPoint exported.', 'success'))
            .catch(err => showToast('Export failed: ' + err.message, 'error'));
    }

    // --- Main Render Controller ---
    function renderApp() {
        const currentCase = getCurrentCase();
        if (!currentCase) return;

        // Sync Crash Date input with active case (input needs yyyy-mm-dd; blank when unset - never presumed)
        if (elements.crashDateInput) {
            elements.crashDateInput.value = currentCase.meta.accidentDate ? toInputDate(currentCase.meta.accidentDate) : '';
        }

        // Case at-a-glance strip is visible across all tabs
        renderGlanceStrip(currentCase);

        // Render current active tab
        switch (state.activeTab) {
            case 'tab-verdict':
                renderVerdictTab();
                break;
            case 'tab-timeline':
                renderTimelineTab();
                break;
            case 'tab-causation':
                renderCausationTab();
                break;
            case 'tab-heatmap':
                renderHeatmapTab();
                break;
            case 'tab-ai':
                renderAiTab();
                break;
            case 'tab-export':
                renderExportDeckTab();
                break;
        }
    }

    // --- TAB 1: EXECUTIVE VERDICT & SETTLEMENT CALCULATOR ---
    function renderVerdictTab() {
        const cCase = getCurrentCase();
        if (!cCase) return;

        elements.vCaseMetaBadge.textContent = `${cCase.meta.patientName} | Crash: ${cCase.meta.accidentDate} | Limits: ${cCase.meta.policyLimits}`;

        const encountersMedicalSum = cCase.encounters.reduce((sum, e) => sum + (e.billingAmount || 0), 0);
        const totalEncounters = cCase.encounters.length;
        const criticalEncounters = cCase.encounters.filter(e => e.severity === 'critical').length;

        // If medical bills state is null, initialize with calculated sum from encounters
        if (state.verdictParams.medicalBills === null) {
            state.verdictParams.medicalBills = encountersMedicalSum;
        }

        // Sync input control value if present and not currently active
        if (elements.vMedicalBillsInput && document.activeElement !== elements.vMedicalBillsInput) {
            elements.vMedicalBillsInput.value = state.verdictParams.medicalBills;
        }

        const totalMedicalBills = parseFloat(state.verdictParams.medicalBills) || 0;

        elements.vMedicalBills.textContent = formatCurrency(totalMedicalBills);
        elements.vTotalEncounters.textContent = totalEncounters;
        elements.vCriticalEncounters.textContent = criticalEncounters;

        // Calculator updates
        const multiplier = parseFloat(state.verdictParams.multiplier) || 3.0;
        const futureCare = parseFloat(state.verdictParams.futureCare) || 0;
        const lostWages = parseFloat(state.verdictParams.lostWages) || 0;
        const fault = parseFloat(state.verdictParams.fault) || 0;

        elements.vMultiplierVal.textContent = `${multiplier.toFixed(1)}x`;
        if (elements.vFaultVal) {
            elements.vFaultVal.textContent = `${fault.toFixed(0)}%`;
        }

        const faultFactor = 1 - (fault / 100);
        const lowVal = Math.max(0, ((totalMedicalBills * 1.8) + (futureCare * 0.8) + lostWages) * faultFactor);
        const targetVal = Math.max(0, ((totalMedicalBills * multiplier) + futureCare + lostWages) * faultFactor);
        const highVal = Math.max(0, ((totalMedicalBills * 5.0) + (futureCare * 1.2) + (lostWages * 1.5)) * faultFactor);

        elements.vSettlementLow.textContent = formatCurrency(lowVal);
        elements.vSettlementMid.textContent = formatCurrency(targetVal);
        elements.vSettlementHigh.textContent = formatCurrency(highVal);

        // Calculate Case Strength Score
        let strengthScore = 50; // Base score
        const hasSurgeries = cCase.encounters.some(e => (e.recordType || '').toLowerCase().includes('surgery'));
        const hasMRIs = cCase.encounters.some(e => (e.recordType || '').toLowerCase().includes('mri'));
        const gaps = calculateGaps(cCase.encounters);

        if (hasSurgeries) strengthScore += 20;
        if (hasMRIs) strengthScore += 15;
        if (gaps.length <= 1) strengthScore += 15;
        else strengthScore -= (gaps.length * 5);

        if (fault > 0) {
            strengthScore -= Math.round(fault * 0.5);
        }

        strengthScore = Math.max(10, Math.min(98, strengthScore));

        elements.vStrengthScore.textContent = `${strengthScore}%`;
        elements.vStrengthFactors.innerHTML = `
            <div class="factor-item ${hasMRIs ? 'text-emerald' : 'text-muted'}"><i class="fa-solid ${hasMRIs ? 'fa-circle-check' : 'fa-circle-xmark'}"></i> Objective MRI Diagnostic Proof (+15%)</div>
            <div class="factor-item ${hasSurgeries ? 'text-emerald' : 'text-muted'}"><i class="fa-solid ${hasSurgeries ? 'fa-circle-check' : 'fa-circle-xmark'}"></i> Invasive Surgical / Injection Intervention (+20%)</div>
            <div class="factor-item ${gaps.length <= 1 ? 'text-emerald' : 'text-amber'}"><i class="fa-solid ${gaps.length <= 1 ? 'fa-circle-check' : 'fa-triangle-exclamation'}"></i> Treatment Continuity & Compliance (${gaps.length} gaps)</div>
            <div class="factor-item ${fault === 0 ? 'text-emerald' : 'text-amber'}"><i class="fa-solid ${fault === 0 ? 'fa-circle-check' : 'fa-scale-unbalanced'}"></i> Comparative Liability Apportionment (${fault}% fault)</div>
        `;

        // Render Doughnut Chart
        renderBillingChart(cCase.encounters, totalMedicalBills);

        // Render Settlement Demand Brief
        elements.demandLetterBox.innerHTML = `
            <p><strong>RE: SETTLEMENT DEMAND PACKAGE - ${cCase.meta.patientName.toUpperCase()}</strong></p>
            <p><strong>Claimant:</strong> ${cCase.meta.patientName} | <strong>Incident Date:</strong> ${cCase.meta.accidentDate} | <strong>Incident Type:</strong> ${cCase.meta.accidentType}</p>
            <p><strong>Total Past Medical Expenses:</strong> ${formatCurrency(totalMedicalBills)} | <strong>Future Estimated Care:</strong> ${formatCurrency(futureCare)} | <strong>Comparative Fault:</strong> ${fault}%</p>
            <br>
            <p><strong>I. EXECUTIVE SUMMARY & LIABILITY:</strong></p>
            <p>On ${cCase.meta.accidentDate}, claimant ${cCase.meta.patientName} sustained severe traumatic injuries as a direct result of ${cCase.meta.accidentType}. Emergency medical response was required at the scene. Objective medical diagnostics confirmed acute trauma including ${cCase.meta.primaryInjuries}.${fault > 0 ? ` (Demand reflects a ${fault}% comparative fault adjustment).` : ''}</p>
            <br>
            <p><strong>II. SPECIAL DAMAGES & INJURY BREAKDOWN:</strong></p>
            <p>To date, ${cCase.meta.patientName} has undergone ${totalEncounters} medical encounters across emergency care, specialty orthopedics, diagnostic imaging, and physical rehabilitation. Total past medical expenses incurred equal ${formatCurrency(totalMedicalBills)} with additional proven lost earnings of ${formatCurrency(lostWages)}.</p>
            <br>
            <p><strong>III. DEMAND VALUATION:</strong></p>
            <p>Based on the objective medical findings, treatment duration, pain levels, multiplier analysis (${multiplier.toFixed(1)}x), and permanent structural impairment, we hereby present a full and final settlement demand of <strong>${formatCurrency(targetVal)}</strong>.</p>
        `;
    }

    function renderBillingChart(encounters, customTotalMedical) {
        const categories = {};
        let encountersTotal = 0;
        encounters.forEach(e => {
            const cat = e.recordType || 'General Care';
            const amt = (e.billingAmount || 0);
            categories[cat] = (categories[cat] || 0) + amt;
            encountersTotal += amt;
        });

        if (customTotalMedical !== undefined && encountersTotal > 0 && customTotalMedical !== encountersTotal) {
            const scale = customTotalMedical / encountersTotal;
            Object.keys(categories).forEach(cat => {
                categories[cat] = categories[cat] * scale;
            });
        }

        const labels = Object.keys(categories);
        const dataValues = Object.values(categories);

        const ctx = document.getElementById('chartBillingCategories').getContext('2d');

        if (state.billingChart) {
            state.billingChart.destroy();
        }

        state.billingChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: dataValues,
                    backgroundColor: [
                        '#6366f1', '#10b981', '#f59e0b', '#f43f5e', '#06b6d4', '#a855f7', '#3b82f6'
                    ],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: { color: '#cbd5e1', font: { size: 11 } }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.parsed || 0;
                                return `${label}: ${formatCurrency(value)}`;
                            }
                        }
                    }
                }
            }
        });
    }

    // --- TAB 2: INTERACTIVE TIMELINE ---
    function renderTimelineTab() {
        const cCase = getCurrentCase();
        if (!cCase) return;

        elements.tCaseTitle.textContent = `${cCase.meta.patientName} - Medical Timeline`;
        
        let encounters = [...cCase.encounters];
        const totalCount = encounters.length;

        if (elements.tCaseSub) {
            if (encounters.length > 0) {
                const sortedDates = [...encounters].sort((a, b) => getParsedDate(a.date) - getParsedDate(b.date));
                const minDate = sortedDates[0].date;
                const maxDate = sortedDates[sortedDates.length - 1].date;
                elements.tCaseSub.textContent = `Date Span: ${minDate} to ${maxDate} (${totalCount} Total Encounters)`;
            } else {
                elements.tCaseSub.textContent = `Date Span: N/A (0 Encounters)`;
            }
        }

        // Apply search filter
        const q = state.filters.searchQuery.toLowerCase();
        if (q) {
            encounters = encounters.filter(e => 
                (e.provider && e.provider.toLowerCase().includes(q)) ||
                (e.facility && e.facility.toLowerCase().includes(q)) ||
                (e.bodyPart && e.bodyPart.toLowerCase().includes(q)) ||
                (e.recordType && e.recordType.toLowerCase().includes(q)) ||
                (e.medicineType && e.medicineType.toLowerCase().includes(q)) ||
                (e.summary && e.summary.toLowerCase().includes(q))
            );
        }

        // Sequence filter (pre/post crash)
        if (state.filters.sequence === 'pre') {
            encounters = encounters.filter(e => e.isPreCrash);
        } else if (state.filters.sequence === 'post') {
            encounters = encounters.filter(e => !e.isPreCrash);
        }

        // Milestone category filter
        if (state.filters.milestone === 'critical') {
            encounters = encounters.filter(e => e.severity === 'critical');
        } else if (state.filters.milestone === 'er') {
            encounters = encounters.filter(e => {
                const rec = (e.recordType || '').toLowerCase();
                const med = (e.medicineType || '').toLowerCase();
                const fac = (e.facility || '').toLowerCase();
                return med.includes('emergency') || rec.includes('emergency') || rec.includes('ems') || rec.includes('triage') || fac.includes('emergency') || /\b(er|ems)\b/i.test(rec);
            });
        } else if (state.filters.milestone === 'mri') {
            encounters = encounters.filter(e => {
                const rec = (e.recordType || '').toLowerCase();
                const med = (e.medicineType || '').toLowerCase();
                const sum = (e.summary || '').toLowerCase();
                return rec.includes('mri') || rec.includes('imaging') || med.includes('radiology') || /\b(mri|ct scan|x-ray|radiology|ultrasound)\b/i.test(sum);
            });
        } else if (state.filters.milestone === 'surgery') {
            encounters = encounters.filter(e => {
                const rec = (e.recordType || '').toLowerCase();
                const med = (e.medicineType || '').toLowerCase();
                const sum = (e.summary || '').toLowerCase();
                return rec.includes('surgery') || rec.includes('operative') || med.includes('surgery') || /\b(surgery|surgical|operative|injection|arthroscopy|discectomy|fusion)\b/i.test(sum);
            });
        } else if (state.filters.milestone === 'pt') {
            encounters = encounters.filter(e => {
                const rec = (e.recordType || '').toLowerCase();
                const med = (e.medicineType || '').toLowerCase();
                return rec.includes('therapy') || med.includes('rehab') || med.includes('physical therapy') || rec.includes('pt');
            });
        } else if (state.filters.milestone === 'exhibits') {
            encounters = encounters.filter(e => state.starredExhibits.has(e.id));
        }

        // Body part filter if selected
        if (state.filters.selectedBodyPart) {
            const targetPart = state.filters.selectedBodyPart;
            const aliases = regionAliases[targetPart] || [targetPart.toLowerCase()];
            encounters = encounters.filter(e => {
                if (!e.bodyPart) return false;
                const bpStr = e.bodyPart.toLowerCase();
                return aliases.some(alias => bpStr.includes(alias));
            });
        }

        // Provider / medicine-type facets
        if (state.filters.providerFilter.size) {
            encounters = encounters.filter(e => state.filters.providerFilter.has((e.provider || '').trim()));
        }
        if (state.filters.medTypeFilter.size) {
            encounters = encounters.filter(e => state.filters.medTypeFilter.has((e.medicineType || '').trim()));
        }
        // Date range
        if (state.filters.dateFrom) {
            const from = getParsedDate(state.filters.dateFrom);
            encounters = encounters.filter(e => getParsedDate(e.date) >= from);
        }
        if (state.filters.dateTo) {
            const to = getParsedDate(state.filters.dateTo);
            encounters = encounters.filter(e => getParsedDate(e.date) <= to);
        }

        // Milestones rail + facet chips reflect the current case
        renderMilestonesRail(cCase);
        renderFacets(cCase);

        // Calculate Care Gaps
        const gaps = calculateGaps(cCase.encounters);
        elements.tGapSummaryBadge.textContent = `${gaps.length} Treatment Gap(s) Flagged`;

        if (gaps.length > 0 && state.filters.gapHighlight) {
            elements.gapAlertBanner.classList.remove('hidden');
            const maxGap = Math.max(...gaps.map(g => g.days));
            const longestGap = gaps.reduce((max, g) => g.days > max.days ? g : max, gaps[0]);
            elements.gapBannerTitle.textContent = `⚠️ ${gaps.length} Real-World Care Gap(s) Detected (Max Gap: ${maxGap} Days)`;
            elements.gapBannerText.textContent = `Longest gap: ${longestGap.startDate} to ${longestGap.endDate} (${longestGap.days} days). Tactical rebuttal: ${longestGap.rebuttal}`;
        } else {
            elements.gapAlertBanner.classList.add('hidden');
        }

        // Update metric labels
        elements.metricTotal.textContent = totalCount;
        elements.metricShown.textContent = encounters.length;
        elements.metricStarred.textContent = state.starredExhibits.size;

        // Sort encounters chronologically
        encounters.sort((a, b) => getParsedDate(a.date) - getParsedDate(b.date));

        if (state.viewLayout === 'stepped') {
            elements.timelineContainer.className = 'timeline-stepped-view';
            elements.timelineContainer.innerHTML = renderSteppedTimelineView(encounters, cCase, gaps);
            attachTimelineListeners();
            return;
        }

        let html = '';

        if (encounters.length === 0) {
            elements.timelineContainer.className = 'timeline-stream-view';
            elements.timelineContainer.innerHTML = '<div class="glass-card text-muted" style="text-align:center;padding:3rem;">No medical encounters match the selected filters.</div>';
            return;
        }

        // GROUPED VIEW (by provider / medicine type / body part)
        if (state.filters.groupBy && state.filters.groupBy !== 'none') {
            elements.timelineContainer.className = 'timeline-grouped-view';
            const key = state.filters.groupBy;
            const groups = {};
            encounters.forEach(e => {
                const g = (e[key] || 'Unspecified').trim() || 'Unspecified';
                (groups[g] = groups[g] || []).push(e);
            });
            const sortedGroupNames = Object.keys(groups).sort((a, b) => groups[b].length - groups[a].length);
            html = sortedGroupNames.map(name => {
                const items = groups[name];
                const span = daysBetween(getParsedDate(items[0].date), getParsedDate(items[items.length - 1].date));
                return `
                    <div class="group-lane">
                        <div class="group-lane-head">
                            <i class="fa-solid fa-layer-group text-indigo"></i>
                            <h4>${escapeHtml(name)}</h4>
                            <span class="lane-count">${items.length} encounter(s) · ${span} day span</span>
                        </div>
                        <div class="group-lane-body">${items.map(encounterCardHtml).join('')}</div>
                    </div>`;
            }).join('');
            elements.timelineContainer.innerHTML = html;
            attachTimelineListeners();
            return;
        }

        // STREAM / GRID VIEW with crash marker + gap nodes
        elements.timelineContainer.className = state.viewLayout === 'stream' ? 'timeline-stream-view' : 'timeline-grid-view';
        const gapMap = new Map();
        if (state.filters.gapHighlight && state.viewLayout === 'stream') {
            gaps.forEach(g => gapMap.set(g.prevId, g));
        }
        const crashSet = !!cCase.meta.accidentDate;
        let crashInserted = false;

        encounters.forEach((enc) => {
            // Insert the crash marker right before the first post-crash encounter
            if (crashSet && !crashInserted && !enc.isPreCrash && state.viewLayout === 'stream') {
                html += `
                    <div class="timeline-crash-marker">
                        <i class="fa-solid fa-car-burst"></i>
                        <span>Motor Vehicle Collision</span>
                        <span class="cm-date">${escapeHtml(formatDisplayDate(cCase.meta.accidentDate))}</span>
                        <span style="margin-left:auto;font-weight:500;color:#fecaca;">Everything below is post-crash treatment</span>
                    </div>`;
                crashInserted = true;
            }

            html += encounterCardHtml(enc);

            if (gapMap.has(enc.id)) {
                const g = gapMap.get(enc.id);
                html += `
                    <div class="timeline-gap-node">
                        <i class="fa-solid fa-triangle-exclamation"></i>
                        <div class="gap-node-info">
                            <strong>CARE GAP: ${g.days} DAYS (${g.startDate} to ${g.endDate})</strong>
                            <p>Defense assertion: intervening event or recovery. Plaintiff rebuttal: ${escapeHtml(g.rebuttal)}</p>
                        </div>
                    </div>`;
            }
        });

        elements.timelineContainer.innerHTML = html;
        attachTimelineListeners();
    }

    // Event delegation for timeline cards (open modal, keyboard, star toggle)
    function attachTimelineListeners() {
        const container = elements.timelineContainer;
        if (!container || container.dataset.delegated === '1') return;
        container.dataset.delegated = '1';
        container.addEventListener('click', (evt) => {
            const star = evt.target.closest('.star-btn');
            if (star) {
                evt.stopPropagation();
                toggleStarExhibit(star.getAttribute('data-star-id'));
                renderApp();
                return;
            }
            if (evt.target.closest('.read-more-link') || evt.target.closest('.card-link')) return;
            const card = evt.target.closest('.timeline-card');
            if (card) openEncounterModal(card.getAttribute('data-id'));
        });
        container.addEventListener('keydown', (evt) => {
            if (evt.key !== 'Enter' && evt.key !== ' ') return;
            const card = evt.target.closest('.timeline-card');
            if (card) { evt.preventDefault(); openEncounterModal(card.getAttribute('data-id')); }
        });
    }

    function renderSteppedTimelineView(encounters, cCase, gaps) {
        if (!encounters || encounters.length === 0) {
            return '<div class="glass-card text-muted" style="text-align:center;padding:3rem;">No medical encounters match the selected filters.</div>';
        }

        const accidentDate = getParsedDate(cCase.meta.accidentDate);

        // Group encounters into 5 functional phase categories
        const phases = [
            {
                id: 'p1',
                title: 'Incident & ER Response',
                icon: 'fa-truck-medical',
                color: '#f59e0b',
                bg: 'rgba(245, 158, 11, 0.15)',
                border: '#f59e0b',
                records: encounters.filter(e => {
                    const rt = (e.recordType || '').toLowerCase();
                    const med = (e.medicineType || '').toLowerCase();
                    return rt.includes('ems') || rt.includes('er') || rt.includes('triage') || med.includes('emergency');
                })
            },
            {
                id: 'p2',
                title: 'Diagnostic Imaging & Consults',
                icon: 'fa-magnet',
                color: '#06b6d4',
                bg: 'rgba(6, 182, 212, 0.15)',
                border: '#06b6d4',
                records: encounters.filter(e => {
                    const rt = (e.recordType || '').toLowerCase();
                    return rt.includes('mri') || rt.includes('ct') || rt.includes('x-ray') || rt.includes('imaging') || rt.includes('radiology');
                })
            },
            {
                id: 'p3',
                title: 'Interventions & Surgeries',
                icon: 'fa-user-nurse',
                color: '#f43f5e',
                bg: 'rgba(244, 63, 94, 0.15)',
                border: '#f43f5e',
                records: encounters.filter(e => {
                    const rt = (e.recordType || '').toLowerCase();
                    const sev = e.severity || '';
                    return rt.includes('surgery') || rt.includes('operative') || rt.includes('injection') || sev === 'critical';
                })
            },
            {
                id: 'p4',
                title: 'Physical Therapy & Rehab',
                icon: 'fa-person-running',
                color: '#10b981',
                bg: 'rgba(16, 185, 129, 0.15)',
                border: '#10b981',
                records: encounters.filter(e => {
                    const rt = (e.recordType || '').toLowerCase();
                    const med = (e.medicineType || '').toLowerCase();
                    return rt.includes('therapy') || med.includes('rehab') || med.includes('physical therapy') || rt.includes('pt');
                })
            },
            {
                id: 'p5',
                title: 'Recovery & MMI Assessment',
                icon: 'fa-flag-checkered',
                color: '#a855f7',
                bg: 'rgba(168, 85, 247, 0.15)',
                border: '#a855f7',
                records: encounters.filter(e => {
                    const rt = (e.recordType || '').toLowerCase();
                    return rt.includes('discharge') || rt.includes('progress') || rt.includes('follow-up') || rt.includes('consult');
                })
            }
        ];

        // Pick top key milestone events for stepped drop pins
        const milestoneEvents = encounters.slice(0, 10);

        let html = `
            <div class="stepped-timeline-wrapper">
                <div class="stepped-header-card glass-card">
                    <div class="stepped-meta">
                        <h3><i class="fa-solid fa-timeline text-indigo"></i> ${cCase.meta.patientName} — Stepped Incident Response Timeline</h3>
                        <p class="text-secondary"><i class="fa-solid fa-car-burst text-amber"></i> ${cCase.meta.accidentType} | Crash Date: <strong>${cCase.meta.accidentDate}</strong></p>
                    </div>
                    <div class="stepped-badges">
                        <span class="tag-pill text-emerald"><i class="fa-solid fa-stethoscope"></i> ${encounters.length} Encounters</span>
                        <span class="tag-pill text-amber"><i class="fa-solid fa-triangle-exclamation"></i> ${gaps.length} Gaps Flagged</span>
                        <span class="tag-pill text-indigo"><i class="fa-solid fa-coins"></i> ${formatCurrency(encounters.reduce((s,e) => s + (e.billingAmount || 0), 0))} Billed</span>
                    </div>
                </div>

                <!-- STEPPED EVENT BLOCKS (TOP AXIS) -->
                <div class="stepped-blocks-row">
        `;

        phases.forEach((p, idx) => {
            const recCount = p.records.length;
            const cost = p.records.reduce((s, r) => s + (r.billingAmount || 0), 0);
            const firstDate = p.records.length > 0 ? p.records[0].date : 'N/A';
            
            html += `
                <div class="stepped-phase-block" style="border-top: 4px solid ${p.border}; background: ${p.bg};">
                    <div class="phase-step-num" style="background:${p.color};">Step 0${idx + 1}</div>
                    <div class="phase-block-title">
                        <i class="fa-solid ${p.icon}" style="color:${p.color};"></i>
                        <h4>${p.title}</h4>
                    </div>
                    <div class="phase-block-meta">
                        <span class="phase-date"><i class="fa-solid fa-calendar"></i> ${firstDate}</span>
                        <span class="phase-count">${recCount} Visit(s)</span>
                    </div>
                    <div class="phase-block-cost">${formatCurrency(cost)}</div>
                    <div class="phase-pin-line" style="background:${p.color};"></div>
                </div>
            `;
        });

        html += `
                </div>

                <!-- MAIN HORIZONTAL TIMELINE AXIS -->
                <div class="stepped-main-axis-card glass-card">
                    <div class="axis-ribbon-title"><i class="fa-solid fa-clock text-cyan"></i> Chronological Care Axis</div>
                    <div class="axis-ribbon-line"></div>
                    <div class="axis-pins-container">
        `;

        milestoneEvents.forEach((enc) => {
            const isStarred = state.starredExhibits.has(enc.id);
            const encDate = getParsedDate(enc.date);
            const daysSinceAccident = Math.max(0, daysBetween(accidentDate, encDate));
            const iconMap = {
                'critical': 'fa-circle-exclamation text-rose',
                'high': 'fa-triangle-exclamation text-amber',
                'medium': 'fa-notes-medical text-indigo',
                'routine': 'fa-stethoscope text-emerald'
            };
            const iconClass = iconMap[enc.severity || 'routine'] || 'fa-notes-medical text-indigo';

            html += `
                <div class="axis-pin-node" onclick="openEncounterModal('${enc.id}')" title="Click to view encounter details">
                    <div class="pin-drop-connector"></div>
                    <div class="pin-badge ${enc.severity || 'routine'}">
                        <i class="fa-solid ${iconClass}"></i>
                    </div>
                    <div class="pin-card-popup">
                        <div class="pin-date-tag">Day ${daysSinceAccident} • ${enc.date}</div>
                        <h5 class="pin-provider-name">${escapeHtml(enc.provider)}</h5>
                        <div class="pin-sub-tag">${escapeHtml(enc.recordType)}${enc.billingAmount != null ? ' • ' + formatCurrency(enc.billingAmount) : ''}</div>
                        ${isStarred ? '<span class="pin-star"><i class="fa-solid fa-star text-amber"></i> Exhibit</span>' : ''}
                    </div>
                </div>
            `;
        });

        html += `
                    </div>
                </div>

                <!-- BOTTOM DURATION BREAKDOWN CHEVRONS -->
                <div class="stepped-duration-bar glass-card">
                    <div class="duration-bar-header">
                        <h4><i class="fa-solid fa-chart-gantt text-indigo"></i> Care Phase Duration & Timeline Breakdown</h4>
                        <span class="duration-total-tag">Total Span: ${daysBetween(getParsedDate(encounters[0].date), getParsedDate(encounters[encounters.length - 1].date))} Days</span>
                    </div>
                    <div class="duration-chevrons-row">
                        <div class="chevron-segment ch-amber">
                            <span class="ch-label">Incident & Emergency Care</span>
                            <span class="ch-val">1 - 3 Days</span>
                        </div>
                        <div class="chevron-segment ch-cyan">
                            <span class="ch-label">Diagnostic Imaging & Testing</span>
                            <span class="ch-val">14 - 30 Days</span>
                        </div>
                        <div class="chevron-segment ch-emerald">
                            <span class="ch-label">Active Rehabilitation & Therapy</span>
                            <span class="ch-val">60 - 180 Days</span>
                        </div>
                        ${gaps.length > 0 ? `
                        <div class="chevron-segment ch-rose">
                            <span class="ch-label">Care Delay / Gap Warning</span>
                            <span class="ch-val">${Math.max(...gaps.map(g => g.days))} Days Gap</span>
                        </div>` : ''}
                    </div>
                </div>
            </div>
        `;

        return html;
    }

    function toggleStarExhibit(id) {
        if (state.starredExhibits.has(id)) {
            state.starredExhibits.delete(id);
        } else {
            state.starredExhibits.add(id);
        }
        const cCase = getCurrentCase();
        if (cCase && cCase.encounters) {
            const enc = cCase.encounters.find(e => e.id === id);
            if (enc) {
                enc.isStarred = state.starredExhibits.has(id);
            }
        }
    }

    // Modal Opener
    window.openEncounterModal = function(id) {
        const cCase = getCurrentCase();
        if (!cCase) return;
        const enc = cCase.encounters.find(e => e.id === id);
        if (!enc) return;

        activeModalEncounterId = id;

        elements.modalTitle.textContent = `${enc.provider} (${enc.date})`;
        elements.modalSeverityBadge.textContent = (enc.severity || 'Routine').toUpperCase();
        elements.modalSeverityBadge.className = `modal-badge sev-${enc.severity || 'routine'}`;

        const pdfIsUrl = enc.pdfLink && /^https?:\/\//i.test(enc.pdfLink);
        elements.modalBody.innerHTML = `
            <div class="modal-meta-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1rem;background:rgba(15,23,42,0.5);padding:1rem;border-radius:8px;">
                <div><strong>Facility:</strong> ${escapeHtml(enc.facility)}</div>
                <div><strong>Record Type:</strong> ${escapeHtml(enc.recordType)}</div>
                <div><strong>Specialty:</strong> ${escapeHtml(enc.medicineType)}</div>
                <div><strong>Body Part:</strong> ${escapeHtml(enc.bodyPart) || '<span style="color:#94a3b8;">Not specified</span>'}</div>
                ${enc.painScore != null ? `<div><strong>Pain Score:</strong> ${enc.painScore}/10</div>` : ''}
                ${enc.billingAmount != null ? `<div><strong>Billing Expense:</strong> ${formatCurrency(enc.billingAmount)}</div>` : ''}
                ${enc.pdfLink ? `<div><strong>Source Record:</strong> ${pdfIsUrl ? `<a href="${escapeHtml(enc.pdfLink)}" target="_blank" rel="noopener noreferrer">Open PDF</a>` : escapeHtml(enc.pdfLink)}</div>` : ''}
            </div>
            <div style="display:flex;align-items:center;gap:0.75rem;margin-top:0.5rem;">
                <h4 style="margin:0;">Detailed Clinical Encounter Summary</h4>
                <button id="modalEditSummaryBtn" class="glass-btn btn-secondary text-xs"><i class="fa-solid fa-pen"></i> Edit</button>
                <button id="modalRephraseBtn" class="glass-btn btn-secondary text-xs"><i class="fa-solid fa-wand-magic-sparkles"></i> Rephrase with AI</button>
            </div>
            <div id="modalSummaryWrap" style="margin-top:0.5rem;">
                <p id="modalSummaryView" style="white-space:pre-line;color:#cbd5e1;">${escapeHtml(enc.summary)}</p>
            </div>
        `;

        attachSummaryEditing(enc);

        const isStarred = state.starredExhibits.has(id);
        elements.modalStarBtn.innerHTML = `<i class="fa-solid fa-star"></i> ${isStarred ? 'Remove Star Exhibit' : 'Star as Trial Exhibit'}`;

        elements.eventModal.classList.remove('hidden');
    };

    // Inline summary editing + AI rephrase inside the encounter modal
    function attachSummaryEditing(enc) {
        const editBtn = document.getElementById('modalEditSummaryBtn');
        const rephraseBtn = document.getElementById('modalRephraseBtn');
        const wrap = document.getElementById('modalSummaryWrap');
        if (!editBtn || !wrap) return;

        function enterEdit(initialText) {
            wrap.innerHTML = `
                <textarea id="modalSummaryEdit" class="summary-edit-area">${escapeHtml(initialText != null ? initialText : enc.summary)}</textarea>
                <div style="display:flex;gap:0.5rem;margin-top:0.5rem;">
                    <button id="modalSummarySave" class="glass-btn btn-primary text-xs"><i class="fa-solid fa-check"></i> Save</button>
                    <button id="modalSummaryCancel" class="glass-btn btn-secondary text-xs">Cancel</button>
                </div>`;
            document.getElementById('modalSummarySave').addEventListener('click', () => {
                enc.summary = document.getElementById('modalSummaryEdit').value;
                wrap.innerHTML = `<p id="modalSummaryView" style="white-space:pre-line;color:#cbd5e1;">${escapeHtml(enc.summary)}</p>`;
                showToast('Summary updated.', 'success');
                renderApp();
            });
            document.getElementById('modalSummaryCancel').addEventListener('click', () => {
                wrap.innerHTML = `<p id="modalSummaryView" style="white-space:pre-line;color:#cbd5e1;">${escapeHtml(enc.summary)}</p>`;
            });
        }

        editBtn.addEventListener('click', () => enterEdit());

        rephraseBtn.addEventListener('click', async () => {
            if (!state.geminiKey) {
                showToast('Add a Gemini API key in the AI Assistant tab to rephrase with AI.', 'info');
                enterEdit();
                return;
            }
            rephraseBtn.disabled = true;
            rephraseBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Rephrasing...';
            try {
                const text = await callGemini(`Rewrite this medical encounter summary in clear, plain language a jury would understand, staying strictly faithful to the facts. Return only the rewritten summary.\n\n${enc.summary}`);
                enterEdit(text.trim());
                showToast('AI draft ready - review and Save.', 'success');
            } catch (err) {
                showToast(`Rephrase failed: ${err.message}`, 'error');
            } finally {
                rephraseBtn.disabled = false;
                rephraseBtn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> Rephrase with AI';
            }
        });
    }

    // --- TAB 3: PRE VS POST CRASH CAUSATION INSPECTOR ---
    function renderCausationTab() {
        const cCase = getCurrentCase();
        if (!cCase) return;

        // Pre/post analysis is impossible without the crash date, which is not in the file.
        // Do not presume it - prompt the attorney instead of showing a misleading all-post split.
        if (!cCase.meta.accidentDate) {
            ['cPreCount', 'cPostCount'].forEach(id => { if (elements[id]) elements[id].textContent = '-'; });
            if (elements.cPreTag) elements.cPreTag.textContent = 'Crash date not set';
            if (elements.cPostTag) elements.cPostTag.textContent = 'Crash date not set';
            if (elements.cPainShift) elements.cPainShift.textContent = 'Set crash date';
            if (elements.cCostShift) elements.cCostShift.textContent = 'Set crash date';
            elements.causationPreList.innerHTML = `
                <div class="glass-card" style="padding:1.5rem;border-left:4px solid var(--sev-high);">
                    <p style="margin-bottom:0.6rem;"><i class="fa-solid fa-car-burst text-amber"></i> <strong>No crash date set.</strong></p>
                    <p class="text-muted" style="font-size:var(--fs-sm);">The pre vs post-crash comparison needs the collision date, which is not in the medical records. Add it in Case Setup (or the Crash Date field on the Timeline tab) to build this analysis.</p>
                    <button class="glass-btn btn-primary" id="causationSetDateBtn" style="margin-top:1rem;"><i class="fa-solid fa-sliders"></i> Open Case Setup</button>
                </div>`;
            elements.causationPostList.innerHTML = '<p class="text-dim" style="font-size:var(--fs-sm);padding:1rem;">Awaiting crash date.</p>';
            elements.causationMatrixBody.innerHTML = '';
            const b = document.getElementById('causationSetDateBtn');
            if (b) b.addEventListener('click', () => elements.questionnaireModal.classList.remove('hidden'));
            return;
        }

        const accidentDateParsed = getParsedDate(cCase.meta.accidentDate);
        const preEncounters = cCase.encounters.filter(e => e.isPreCrash || (e.date && getParsedDate(e.date) < accidentDateParsed));
        const postEncounters = cCase.encounters.filter(e => !preEncounters.includes(e));

        elements.cPreCount.textContent = preEncounters.length;
        elements.cPostCount.textContent = postEncounters.length;
        elements.cPreTag.textContent = `${preEncounters.length} Prior Visits`;
        elements.cPostTag.textContent = `${postEncounters.length} Traumatic Encounters`;

        const preAvgPain = preEncounters.length ? (preEncounters.reduce((s,e)=>s+(e.painScore||0),0)/preEncounters.length).toFixed(1) : '0.0';
        const postAvgPain = postEncounters.length ? (postEncounters.reduce((s,e)=>s+(e.painScore||0),0)/postEncounters.length).toFixed(1) : '0.0';
        const painDiff = (parseFloat(postAvgPain) - parseFloat(preAvgPain)).toFixed(1);
        const painDiffStr = painDiff > 0 ? ` (+${painDiff})` : '';
        elements.cPainShift.textContent = `${preAvgPain} / 10 -> ${postAvgPain} / 10${painDiffStr}`;

        const preCost = preEncounters.reduce((s,e)=>s+(e.billingAmount||0),0);
        const postCost = postEncounters.reduce((s,e)=>s+(e.billingAmount||0),0);
        elements.cCostShift.textContent = `${formatCurrency(preCost)} -> ${formatCurrency(postCost)}`;

        // Render Pre-Crash Cards
        elements.causationPreList.innerHTML = preEncounters.length ? preEncounters.map(e => `
            <div class="glass-card" style="padding:0.85rem;font-size:0.8rem;cursor:pointer;" onclick="openEncounterModal('${e.id}')">
                <div style="display:flex;justify-content:space-between;color:var(--text-muted);">
                    <span>${e.date || 'Prior History'}</span>
                    <span>${e.recordType || 'Medical Record'}</span>
                </div>
                <strong style="color:var(--text-primary);display:block;margin:0.25rem 0;">${e.provider || 'Prior Care Provider'}</strong>
                <span class="tag-pill text-amber">Baseline Pain: ${e.painScore || 0}/10</span>
                <p style="color:var(--text-secondary);margin-top:0.4rem;">${e.summary ? (e.summary.length > 110 ? e.summary.substring(0, 110) + '...' : e.summary) : 'Baseline medical history record.'}</p>
            </div>
        `).join('') : '<div class="text-muted" style="padding:1rem;text-align:center;">No prior medical history records logged.</div>';

        // Render Post-Crash Cards
        elements.causationPostList.innerHTML = postEncounters.length ? postEncounters.map(e => `
            <div class="glass-card" style="padding:0.85rem;font-size:0.8rem;border-left:3px solid var(--accent-rose);cursor:pointer;" onclick="openEncounterModal('${e.id}')">
                <div style="display:flex;justify-content:space-between;color:var(--accent-cyan);">
                    <span>${e.date || cCase.meta.accidentDate}</span>
                    <span class="sev-badge sev-${e.severity || 'routine'}">${(e.severity || 'routine').toUpperCase()}</span>
                </div>
                <strong style="color:var(--text-primary);display:block;margin:0.25rem 0;">${e.provider || 'Post-Crash Provider'}</strong>
                <span class="tag-pill text-amber">Pain: ${e.painScore || 0}/10</span>
                <p style="color:var(--text-secondary);margin-top:0.4rem;">${e.summary ? (e.summary.length > 120 ? e.summary.substring(0, 120) + '...' : e.summary) : 'Post-crash encounter record.'}</p>
            </div>
        `).join('') : '<div class="text-muted" style="padding:1rem;text-align:center;">No acute post-crash encounters logged.</div>';

        // Render Dynamic Rebuttal Matrix Table
        const criticalCount = postEncounters.filter(e => e.severity === 'critical').length;
        const gaps = calculateGaps(cCase.encounters);
        const primaryInj = cCase.meta.primaryInjuries || 'Traumatic injuries';

        let preBodyParts = preEncounters.map(e => e.bodyPart).filter(Boolean);
        let preBodyPartStr = Array.from(new Set(preBodyParts)).join(', ') || 'spine and joint structures';

        elements.causationMatrixBody.innerHTML = `
            <tr>
                <td>
                    <strong>"Pre-Existing Degeneration"</strong><br>
                    <span class="text-muted">Defense claims symptoms stem from prior history (${preEncounters.length} prior visit${preEncounters.length === 1 ? '' : 's'}).</span>
                </td>
                <td>
                    <span class="text-emerald">Baseline Pain ${preAvgPain}/10</span> vs Acute Post-Crash Pain <span class="text-rose">${postAvgPain}/10</span>. 
                    ${preEncounters.length ? `Prior records document baseline status for ${preBodyPartStr}.` : 'No prior symptomatic medical history recorded.'}
                </td>
                <td>
                    Apply <strong>Eggshell Plaintiff Rule</strong>: Tortfeasor takes victim as found and is 100% legally liable for acute traumatic aggravation of prior asymptomatic degeneration.
                </td>
            </tr>
            <tr>
                <td>
                    <strong>"Lack of Traumatic Causation"</strong><br>
                    <span class="text-muted">Defense asserts collision mechanism (${cCase.meta.accidentType}) did not cause reported trauma.</span>
                </td>
                <td>
                    Acute care escalation resulting in <strong class="text-rose">${postEncounters.length} encounters</strong> and 
                    <strong class="text-emerald">${formatCurrency(postCost)}</strong> in medical bills. 
                    Objective diagnostics confirm: <em>${primaryInj}</em> (${criticalCount} critical severity findings).
                </td>
                <td>
                    Establish direct temporal and anatomical link between collision impact forces and objective clinical findings. Traumatic causation proven by immediate EMS/ER presentation and objective diagnostics.
                </td>
            </tr>
            <tr>
                <td>
                    <strong>"Treatment Gap / Delay in Care"</strong><br>
                    <span class="text-muted">Defense argues treatment intervals reflect resolution of injuries.</span>
                </td>
                <td>
                    ${gaps.length > 0 ? `Chronology identifies ${gaps.length} care gap(s) (longest: ${gaps[0].days} days). Clinical records show gaps caused by specialist referral lead times & conservative therapy protocols.` : 'Continuous medical care documented without significant treatment gaps.'}
                </td>
                <td>
                    Rebut IME inference: Treatment gaps caused by healthcare system administrative wait times and home exercise regimens do not indicate injury resolution or intervening cause.
                </td>
            </tr>
            <tr>
                <td>
                    <strong>"Low Impact / Minimal Structural Force"</strong><br>
                    <span class="text-muted">Defense IME asserts minimal vehicle damage precludes physical trauma.</span>
                </td>
                <td>
                    Immediate medical evaluation documented ${primaryInj}. Passenger compartment force transfer caused acute soft-tissue shearing and neurological symptom onset.
                </td>
                <td>
                    Biomechanical vulnerability varies per individual. Absence of structural vehicle crush does not negate spinal disc herniation or acute neural compression under established jury instructions.
                </td>
            </tr>
        `;
    }

    // --- TAB 4: ANATOMICAL TRAUMA HEATMAP ---
    function renderHeatmapTab() {
        const cCase = getCurrentCase();
        if (!cCase) return;

        // Group encounters by anatomical region
        const bodyMapData = {
            'Head': { count: 0, maxPain: 0, cost: 0, findingsList: [], defaultFindings: 'Concussion, Headache, Traumatic Brain Injury', severity: 'none' },
            'Neck': { count: 0, maxPain: 0, cost: 0, findingsList: [], defaultFindings: 'Cervical Strain, Disc Herniation, Cervicalgia', severity: 'none' },
            'Thoracic Spine': { count: 0, maxPain: 0, cost: 0, findingsList: [], defaultFindings: 'Thoracic Strain, Mid-Back Myofascial Pain', severity: 'none' },
            'Lumbar Spine': { count: 0, maxPain: 0, cost: 0, findingsList: [], defaultFindings: 'L4-L5 Disc Herniation, Radiculopathy, Lower Back Pain', severity: 'none' },
            'Shoulder': { count: 0, maxPain: 0, cost: 0, findingsList: [], defaultFindings: 'Rotator Cuff Tear, Impingement, Erythema', severity: 'none' },
            'Hand': { count: 0, maxPain: 0, cost: 0, findingsList: [], defaultFindings: 'Avulsion Fracture 2nd Metacarpal, Ecchymosis', severity: 'none' },
            'Hip': { count: 0, maxPain: 0, cost: 0, findingsList: [], defaultFindings: 'Pelvic Contusion, Hip Joint Strain', severity: 'none' },
            'Knee': { count: 0, maxPain: 0, cost: 0, findingsList: [], defaultFindings: 'Meniscal Tear, Joint Effusion, Ligament Strain', severity: 'none' }
        };

        cCase.encounters.forEach(e => {
            const bpStr = (e.bodyPart || 'General').toLowerCase();
            Object.keys(bodyMapData).forEach(key => {
                const aliases = regionAliases[key] || [key.toLowerCase()];
                if (aliases.some(alias => bpStr.includes(alias))) {
                    const item = bodyMapData[key];
                    item.count++;
                    const painVal = Math.min(10, Math.max(0, e.painScore || 0));
                    item.maxPain = Math.max(item.maxPain, painVal);
                    item.cost += (e.billingAmount || 0);

                    if (item.severity === 'none') item.severity = 'routine';
                    if (e.severity === 'critical') item.severity = 'critical';
                    else if (e.severity === 'moderate' && item.severity !== 'critical') item.severity = 'moderate';

                    if (e.summary && item.findingsList.length < 3) {
                        const snippet = e.summary.split('.')[0].replace(/^(Subjective|Objective|Assessment|Plan):\s*/i, '').trim();
                        if (snippet && !item.findingsList.includes(snippet)) {
                            item.findingsList.push(snippet);
                        }
                    }
                }
            });
        });

        // Update SVG Hotspots
        const zoneHead = document.getElementById('zone-head');
        const zoneNeck = document.getElementById('zone-neck');
        const zoneThoracic = document.getElementById('zone-thoracic');
        const zoneLumbar = document.getElementById('zone-lumbar');
        const zoneShoulderL = document.getElementById('zone-shoulder-l');
        const zoneShoulderR = document.getElementById('zone-shoulder-r');
        const zoneHandL = document.getElementById('zone-hand');
        const zoneHandR = document.getElementById('zone-hand-r');
        const zoneHip = document.getElementById('zone-hip');
        const zoneKneeL = document.getElementById('zone-knee-l');
        const zoneKneeR = document.getElementById('zone-knee-r');

        const tooltipElem = document.getElementById('heatmapTooltip');

        const applyZoneColorAndTooltip = (elem, key) => {
            if (!elem) return;
            const info = bodyMapData[key];
            elem.className.baseVal = `heat-zone heat-${info.severity}`;

            const tooltipText = `${key}: ${info.count} Visit(s) | Max Pain: ${info.maxPain}/10 | Total Billing: ${formatCurrency(info.cost)}`;
            elem.setAttribute('title', tooltipText);
            elem.setAttribute('data-body', key);

            let titleTag = elem.querySelector('title');
            if (!titleTag) {
                titleTag = document.createElementNS('http://www.w3.org/2000/svg', 'title');
                elem.appendChild(titleTag);
            }
            titleTag.textContent = tooltipText;
        };

        applyZoneColorAndTooltip(zoneHead, 'Head');
        applyZoneColorAndTooltip(zoneNeck, 'Neck');
        applyZoneColorAndTooltip(zoneThoracic, 'Thoracic Spine');
        applyZoneColorAndTooltip(zoneLumbar, 'Lumbar Spine');
        applyZoneColorAndTooltip(zoneShoulderL, 'Shoulder');
        applyZoneColorAndTooltip(zoneShoulderR, 'Shoulder');
        applyZoneColorAndTooltip(zoneHandL, 'Hand');
        applyZoneColorAndTooltip(zoneHandR, 'Hand');
        applyZoneColorAndTooltip(zoneHip, 'Hip');
        applyZoneColorAndTooltip(zoneKneeL, 'Knee');
        applyZoneColorAndTooltip(zoneKneeR, 'Knee');

        // Floating HTML Tooltip Event Handlers
        const svgContainer = document.querySelector('.body-map-svg-container');
        if (svgContainer && tooltipElem) {
            document.querySelectorAll('.heat-zone').forEach(zone => {
                zone.onmouseenter = (evt) => {
                    const bodyPart = zone.getAttribute('data-body');
                    const info = bodyMapData[bodyPart];
                    if (!info) return;

                    const sevBadgeClass = info.severity === 'critical' ? 'text-rose' : info.severity === 'moderate' ? 'text-amber' : info.severity === 'routine' ? 'text-emerald' : 'text-muted';
                    const sevLabel = info.severity.toUpperCase();

                    tooltipElem.innerHTML = `
                        <div class="tooltip-title">
                            <span><i class="fa-solid fa-child-reaching"></i> ${bodyPart}</span>
                            <span class="${sevBadgeClass}" style="font-size:0.7rem;font-weight:800;">${sevLabel}</span>
                        </div>
                        <div class="tooltip-row"><span>Encounters:</span> <strong>${info.count} Visit(s)</strong></div>
                        <div class="tooltip-row"><span>Max Pain Score:</span> <strong class="text-amber">${info.maxPain}/10</strong></div>
                        <div class="tooltip-row"><span>Total Medical Cost:</span> <strong class="text-emerald">${formatCurrency(info.cost)}</strong></div>
                    `;

                    tooltipElem.classList.add('visible');
                };

                zone.onmousemove = (evt) => {
                    const rect = svgContainer.getBoundingClientRect();
                    const x = evt.clientX - rect.left + 15;
                    const y = evt.clientY - rect.top + 15;
                    tooltipElem.style.left = `${Math.min(x, rect.width - 240)}px`;
                    tooltipElem.style.top = `${Math.min(y, rect.height - 120)}px`;
                };

                zone.onmouseleave = () => {
                    tooltipElem.classList.remove('visible');
                };
            });
        }

        // Populate Region Breakdown Table
        elements.heatmapTableBody.innerHTML = Object.keys(bodyMapData).map(key => {
            const item = bodyMapData[key];
            const findingsStr = item.count > 0 
                ? (item.findingsList.length ? item.findingsList.join('; ') : item.defaultFindings)
                : 'No documented encounters logged for this anatomical region.';

            return `
                <tr>
                    <td><strong>${key}</strong></td>
                    <td><span class="tag-pill">${item.count} Visits</span></td>
                    <td><span class="text-amber">${item.maxPain}/10</span></td>
                    <td><span class="text-emerald">${formatCurrency(item.cost)}</span></td>
                    <td class="text-muted" style="font-size:0.78rem;">${findingsStr}</td>
                    <td>
                        <button class="glass-btn btn-secondary text-xs" onclick="filterByBodyPart('${key}')">
                            <i class="fa-solid fa-filter"></i> Filter
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

        // SVG click handlers via delegation
        const bodySvg = document.getElementById('humanBodySvg');
        if (bodySvg && !bodySvg.dataset.hasClickListener) {
            bodySvg.dataset.hasClickListener = 'true';
            bodySvg.addEventListener('click', (evt) => {
                const zone = evt.target.closest('.heat-zone');
                if (zone) {
                    const bodyPart = zone.getAttribute('data-body');
                    if (bodyPart) filterByBodyPart(bodyPart);
                }
            });
        }
    }

    window.filterByBodyPart = function(bodyPart) {
        state.filters.selectedBodyPart = bodyPart;
        switchTab('tab-timeline');
    };

    // --- TAB 5: AI CLAIMS ASSISTANT ---
    // Generate a readable, keyword-derived executive brief that works on ANY case
    // (no reliance on sample-only meta fields, no fabricated dollars or pain).
    function buildKeywordBrief(cCase) {
        const enc = [...(cCase.encounters || [])].sort((a, b) => getParsedDate(a.date) - getParsedDate(b.date));
        if (!enc.length) return '<p class="text-dim">No encounters loaded for this case.</p>';

        const first = enc[0].date, last = enc[enc.length - 1].date;
        const span = daysBetween(getParsedDate(first), getParsedDate(last));
        const providers = distinctProviders(enc);
        const regions = distinctRegions(enc);
        const pre = enc.filter(e => e.isPreCrash), post = enc.filter(e => !e.isPreCrash);
        const gaps = calculateGaps(cCase.encounters);

        const textOf = e => `${e.recordType || ''} ${e.medicineType || ''} ${e.bodyPart || ''} ${e.summary || ''}`.toLowerCase();
        const blob = enc.map(textOf).join(' \n ');

        const findingDefs = [
            [/herniat/, 'disc herniation'], [/\bbulg/, 'disc bulge'], [/radiculopath/, 'radiculopathy'],
            [/fracture/, 'fracture'], [/concussion|\btbi\b|traumatic brain/, 'head / concussion injury'],
            [/whiplash/, 'whiplash'], [/sprain|strain/, 'sprain / strain'], [/\btear\b|torn|rotator cuff/, 'soft-tissue tear'],
            [/stenosis/, 'spinal stenosis'], [/spasm/, 'muscle spasm'], [/contusion|bruis/, 'contusion'],
            [/annular/, 'annular tear'], [/facet/, 'facet joint involvement']
        ];
        const findings = findingDefs.filter(([re]) => re.test(blob)).map(([, l]) => l);

        const countBy = re => enc.filter(e => re.test(textOf(e))).length;
        const imaging = countBy(/mri|ct scan|\bct\b|x-ray|radiolog|ultrasound|imaging/);
        const pt = countBy(/physical therapy|\bpt\b|rehab|chiropract/);
        const er = countBy(/emergency|\bems\b|ambulance|\ber\b/);
        const procs = enc.filter(e => /surgery|surgical|operative|injection|arthroscopy|discectomy|fusion|epidural|steroid/.test(textOf(e)));

        const withPain = enc.filter(e => e.painScore != null);
        const maxPain = withPain.length ? Math.max(...withPain.map(e => e.painScore)) : null;
        const topRegions = regions.slice(0, 4).join(', ');

        const crashLine = cCase.meta.accidentDate
            ? ` The collision is dated ${escapeHtml(formatDisplayDate(cCase.meta.accidentDate))}, separating ${pre.length} pre-crash baseline visit(s) from ${post.length} post-crash treatment encounter(s).`
            : ' No crash date is set yet - add it in Case Setup to unlock pre/post-crash analysis.';

        let p1 = `<strong>Overview.</strong> ${escapeHtml(cCase.meta.patientName || 'The claimant')} has <strong>${enc.length}</strong> documented medical encounters from <strong>${escapeHtml(first)}</strong> to <strong>${escapeHtml(last)}</strong> (${span} days), across <strong>${providers.length}</strong> provider(s)${regions.length ? ` and <strong>${regions.length}</strong> body region(s)${topRegions ? ` (${escapeHtml(topRegions)}${regions.length > 4 ? ', and others' : ''})` : ''}` : ''}.${crashLine}`;

        let p2 = findings.length
            ? `<strong>Documented findings.</strong> Across the records, the chronology repeatedly references ${findings.map(f => escapeHtml(f)).join(', ')}.`
            : `<strong>Documented findings.</strong> The records describe a range of injuries and complaints across the treatment course; open individual encounters for specifics.`;
        if (maxPain != null) p2 += ` Recorded pain peaks at <strong>${maxPain}/10</strong>.`;

        const courseBits = [];
        if (imaging) courseBits.push(`${imaging} diagnostic imaging study(ies)`);
        if (pt) courseBits.push(`${pt} physical therapy / rehab visit(s)`);
        if (er) courseBits.push(`${er} emergency / urgent encounter(s)`);
        if (procs.length) courseBits.push(`${procs.length} procedure(s) / injection(s)`);
        let p3 = courseBits.length
            ? `<strong>Treatment course.</strong> Care includes ${courseBits.join(', ')}.`
            : `<strong>Treatment course.</strong> Care is documented across ${enc.length} encounters.`;
        if (procs.length) {
            p3 += `<br><span class="text-dim" style="font-size:var(--fs-xs);">Key procedures: ${procs.slice(0, 3).map(e => `${escapeHtml(e.date)} - ${escapeHtml((e.summary || '').slice(0, 60))}`).join('; ')}${procs.length > 3 ? '; ...' : ''}</span>`;
        }

        let p4 = gaps.length
            ? `<strong>Continuity.</strong> ${gaps.length} treatment gap(s) over 21 days were detected (longest ${Math.max(...gaps.map(g => g.days))} days). Documenting the reason (specialist wait times, home-exercise protocol) helps pre-empt a defense continuity challenge.`
            : `<strong>Continuity.</strong> No significant treatment gaps (over 21 days) were detected, supporting a consistent, well-documented course of care.`;

        return [p1, p2, p3, p4].map(p => `<p>${p}</p>`).join('<br>');
    }

    function renderAiTab() {
        const cCase = getCurrentCase();
        if (!cCase) return;
        elements.aiBriefBox.innerHTML = buildKeywordBrief(cCase);
    }

    function generateImeCrossExam(cCase) {
        const totalBills = cCase.encounters.reduce((s, e) => s + (e.billingAmount || 0), 0);
        const postCrash = cCase.encounters.filter(e => !e.isPreCrash);
        const maxPain = postCrash.length ? Math.max(...postCrash.map(e => Math.min(10, Math.max(0, e.painScore || 0)))) : 0;
        const gaps = calculateGaps(cCase.encounters);

        return `<strong><i class="fa-solid fa-gavel text-amber"></i> DEPOSITION & TRIAL CROSS-EXAMINATION PLAN FOR DEFENSE IME DOCTOR</strong><br><br>` +
        `<em>Targeting Defense IME Vulnerabilities in the Case of ${cCase.meta.patientName}:</em><br><br>` +
        `1. <strong>Duration of Examination vs. Treating Physicians:</strong><br>` +
        `   "Doctor, you only examined ${cCase.meta.patientName} on a single occasion for under 20 minutes, whereas treating physicians logged ${cCase.encounters.length} separate medical encounters over months of care, correct?"<br><br>` +
        `2. <strong>Financial Retention & Defense Bias:</strong><br>` +
        `   "You were retained directly by defense insurance counsel and compensated thousands of dollars to author this defense report, correct?"<br><br>` +
        `3. <strong>Acute Impact Kinematics:</strong><br>` +
        `   "You agree that the violent forces in a ${cCase.meta.accidentType} on ${cCase.meta.accidentDate} are fully capable of causing acute spinal tearing, disc herniations, and intense pain peaking at ${maxPain}/10?"<br><br>` +
        `4. <strong>Eggshell Plaintiff & Asymptomatic Degeneration:</strong><br>` +
        `   "Under established medical principles, an individual with minor pre-existing asymptomatic spinal degeneration is far more vulnerable to acute traumatic aggravation in a high-impact crash, correct?"<br><br>` +
        `5. <strong>Objective Medical Bills & Diagnostics:</strong><br>` +
        `   "You cannot point to any medical record prior to ${cCase.meta.accidentDate} where ${cCase.meta.patientName} required ${formatCurrency(totalBills)} in medical treatment for ${cCase.meta.primaryInjuries}, can you?"<br><br>` +
        `6. <strong>Care Gap Contextualization:</strong><br>` +
        `   "You acknowledge that patient compliance with home exercise routines and awaiting specialist scheduling appointments does not mean the injuries vanished, correct?"`;
    }

    function generateJuryOpeningAnchors(cCase) {
        const totalBills = cCase.encounters.reduce((s, e) => s + (e.billingAmount || 0), 0);
        const postCrash = cCase.encounters.filter(e => !e.isPreCrash);
        const maxPain = postCrash.length ? Math.max(...postCrash.map(e => Math.min(10, Math.max(0, e.painScore || 0)))) : 0;

        return `<strong><i class="fa-solid fa-bullhorn text-cyan"></i> JURY OPENING STATEMENT THEME ANCHORS & STORY NARRATIVE</strong><br><br>` +
        `<em>Trial Themes for ${cCase.meta.patientName} v. Defendant:</em><br><br>` +
        `• <strong>THE BEFORE-AND-AFTER NARRATIVE (Life Interrupted):</strong><br>` +
        `   "Before ${cCase.meta.accidentDate}, ${cCase.meta.patientName} was an active individual living free of disabling pain. In a split second, a ${cCase.meta.accidentType} shattered that normal life, causing severe injuries: ${cCase.meta.primaryInjuries}."<br><br>` +
        `• <strong>THE OBJECTIVE ROADMAP (Medical Truth):</strong><br>` +
        `   "This is not a case of subjective complaints on paper. Across ${cCase.encounters.length} separate medical visits, emergency room teams, orthopedic specialists, and physical therapists documented severe trauma, peaking at a pain level of ${maxPain}/10 and incurring ${formatCurrency(totalBills)} in medical expenses."<br><br>` +
        `• <strong>THE CAUSE-AND-EFFECT CHAIN (Immediate Response):</strong><br>` +
        `   "From the EMS emergency transport at the scene to hospital emergency stabilization, objective diagnostic imaging confirmed acute traumatic injury directly caused by the collision."<br><br>` +
        `• <strong>ACCOUNTABILITY & FULL COMPENSATION:</strong><br>` +
        `   "The defense will ask you to blame pre-existing conditions or care gaps. But the law is clear: a negligent driver takes the victim as they find them, and must pay for every dollar of harm caused."`;
    }

    function generateMediationSummary(cCase) {
        const totalMedical = cCase.encounters.reduce((s, e) => s + (e.billingAmount || 0), 0);
        const targetSettlement = (totalMedical * state.verdictParams.multiplier) + state.verdictParams.futureCare + state.verdictParams.lostWages;
        const gaps = calculateGaps(cCase.encounters);

        return `<strong><i class="fa-solid fa-handshake text-emerald"></i> MEDIATION SETTLEMENT BRIEF & ADJUSTER SUMMARY</strong><br><br>` +
        `<strong>1. CLAIM OVERVIEW:</strong><br>` +
        `• Claimant: <strong>${cCase.meta.patientName}</strong> (${cCase.meta.claimantAge} YO)<br>` +
        `• Date of Loss: <strong>${cCase.meta.accidentDate}</strong><br>` +
        `• Incident Type: <strong>${cCase.meta.accidentType}</strong><br>` +
        `• Jurisdiction: <strong>${cCase.meta.jurisdiction || 'Common Pleas Court'}</strong><br><br>` +
        `<strong>2. SPECIAL DAMAGES & FINANCIAL DEMAND:</strong><br>` +
        `• Past Medical Bills (Incurred): <strong>${formatCurrency(totalMedical)}</strong> across ${cCase.encounters.length} visits<br>` +
        `• Wage Loss: <strong>${formatCurrency(state.verdictParams.lostWages)}</strong><br>` +
        `• Future Care Estimate: <strong>${formatCurrency(state.verdictParams.futureCare)}</strong><br>` +
        `• Target Settlement Value: <strong>${formatCurrency(targetSettlement)}</strong> (Multiplier: ${state.verdictParams.multiplier}x)<br><br>` +
        `<strong>3. MEDICAL CHRONOLOGY & DIAGNOSTICS:</strong><br>` +
        `• Primary Injuries: ${cCase.meta.primaryInjuries}<br>` +
        `• Diagnostic Proof: Objective radiology imaging (MRI/CT/X-ray) confirms acute structural trauma.<br>` +
        `• Treatment Continuity: Patient completed physical therapy and specialist treatment recommendations.<br><br>` +
        `<strong>4. DEFENSE RISK ANALYSIS & REBUTTALS:</strong><br>` +
        `• Care Gaps: ${gaps.length > 0 ? `${gaps.length} care gap(s) identified and fully rebutted by specialist wait times and home therapy regimens.` : 'Zero significant care gaps. Excellent treatment continuity.'}<br>` +
        `• Pre-Existing Conditions: Rebutted under Eggshell Plaintiff rule; defendant is 100% responsible for acute symptomatic aggravation of prior asymptomatic degeneration.<br>` +
        `• Trial Readiness: Case fully audited and prepared for trial presentation. High risk of adverse jury verdict if not settled at mediation.`;
    }

    // Async entry point: use live Gemini when a key is set, otherwise the offline analyzer.
    async function handleAiQuestion(userQuery) {
        const cCase = getCurrentCase();
        if (!cCase) return;

        if (state.geminiKey) {
            renderAiAnswer('<span class="text-dim"><i class="fa-solid fa-spinner fa-spin"></i> Asking Gemini about this case...</span>');
            try {
                const prompt = `You are a medical-chronology assistant for a personal-injury attorney. Answer ONLY from the case data below, cite specific dates, and be concise and factual. If the data does not contain the answer, say so.\n\n${buildAiContext(cCase)}\n\nQUESTION: ${userQuery}`;
                const text = await callGemini(prompt);
                renderAiAnswer(`<strong><i class="fa-solid fa-wand-magic-sparkles text-purple"></i> Gemini response:</strong><br><br>${aiTextToHtml(text)}`);
                return;
            } catch (err) {
                showToast(`Live AI unavailable (${err.message}). Using offline mode.`, 'error');
            }
        }
        renderAiAnswer(cannedAiAnswer(userQuery.toLowerCase().trim(), cCase));
    }

    // Offline keyword analyzer (also the fallback when no API key is present)
    function cannedAiAnswer(q, cCase) {
        let answer = '';

        if (q.includes('mri') || q.includes('imaging') || q.includes('ct') || q.includes('x-ray') || q.includes('radiology') || q.includes('scan')) {
            const mris = cCase.encounters.filter(e => 
                (e.recordType && (e.recordType.toLowerCase().includes('mri') || e.recordType.toLowerCase().includes('ct') || e.recordType.toLowerCase().includes('imaging') || e.recordType.toLowerCase().includes('x-ray'))) ||
                (e.medicineType && e.medicineType.toLowerCase().includes('radiology')) ||
                (e.summary && (e.summary.toLowerCase().includes('mri') || e.summary.toLowerCase().includes('ct scan') || e.summary.toLowerCase().includes('x-ray') || e.summary.toLowerCase().includes('impression:')))
            );
            if (mris.length > 0) {
                const totalImgCost = mris.reduce((s,e)=>s+(e.billingAmount||0),0);
                answer = `<strong><i class="fa-solid fa-x-ray text-purple"></i> OBJECTIVE DIAGNOSTIC IMAGING SUMMARY (${mris.length} Encounters Found):</strong><br><br>` +
                `Total Diagnostic Radiology Billing: <strong>${formatCurrency(totalImgCost)}</strong><br><br>` +
                mris.map(m => `• <strong>${m.date} | ${m.facility} (${m.provider}):</strong><br><em>Type:</em> ${m.recordType} - ${m.bodyPart || 'Spine/Trauma'}<br><em>Findings:</em> ${m.summary}`).join('<br><br>');
            } else {
                answer = `No explicit MRI/radiology imaging reports found in this chronology dataset.`;
            }
        } else if (/\bpt\b/i.test(q) || q.includes('physical therapy') || q.includes('rehab') || q.includes('physiotherapy') || q.includes('session')) {
            const ptVisits = cCase.encounters.filter(e => 
                (e.recordType && (e.recordType.toLowerCase().includes('pt') || e.recordType.toLowerCase().includes('physical therapy'))) || 
                (e.medicineType && (e.medicineType.toLowerCase().includes('rehab') || e.medicineType.toLowerCase().includes('physical therapy'))) ||
                (e.provider && e.provider.toLowerCase().includes('physical therapy')) ||
                (e.summary && (e.summary.toLowerCase().includes('physical therapy') || e.summary.toLowerCase().includes('rehab')))
            );
            const totalPtCost = ptVisits.reduce((s,e)=>s+(e.billingAmount||0),0);
            const avgPain = ptVisits.length ? (ptVisits.reduce((s,e)=>s+(e.painScore||0),0)/ptVisits.length).toFixed(1) : 0;
            const dates = ptVisits.map(e=>e.date);
            const dateRange = dates.length ? `${dates[0]} to ${dates[dates.length-1]}` : 'N/A';

            answer = `<strong><i class="fa-solid fa-heart-pulse text-rose"></i> PHYSICAL THERAPY & REHABILITATION CALCULATIONS:</strong><br><br>` +
            `• Total Prescribed PT Sessions: <strong>${ptVisits.length} visits</strong><br>` +
            `• Cumulative Physical Therapy Billing: <strong>${formatCurrency(totalPtCost)}</strong><br>` +
            `• Treatment Window: <strong>${dateRange}</strong><br>` +
            `• Average Pain Score During PT: <strong>${avgPain}/10</strong><br>` +
            `• Compliance Summary: Patient maintained steady attendance across prescribed rehabilitation protocol.`;
        } else if (q.includes('pain') || q.includes('highest pain') || q.includes('max pain')) {
            const postCrash = cCase.encounters.filter(e => !e.isPreCrash);
            const encountersToSearch = postCrash.length ? postCrash : cCase.encounters;
            const maxPain = Math.min(10, Math.max(...encountersToSearch.map(e => Math.min(10, e.painScore || 0))));
            const highestPainEncounters = encountersToSearch.filter(e => Math.min(10, e.painScore || 0) === maxPain);

            answer = `<strong><i class="fa-solid fa-fire text-amber"></i> PAIN SCORE ANALYSIS (PEAK PAIN: ${maxPain}/10):</strong><br><br>` +
            `Highest Pain Level Recorded: <strong class="text-rose">${maxPain}/10</strong><br><br>` +
            `<strong>Encounter(s) at Peak Pain (${highestPainEncounters.length}):</strong><br>` +
            highestPainEncounters.map(e => `• <strong>${e.date} | ${e.provider} (${e.facility}):</strong> Pain Level: ${e.painScore != null ? e.painScore + '/10' : 'N/A'} | Body Part: ${e.bodyPart || 'Unspecified'}<br><em>Details:</em> ${(e.summary || '').substring(0, 180)}...`).join('<br><br>');
        } else if (q.includes('gap') || q.includes('treatment gap') || q.includes('care gap')) {
            const gaps = calculateGaps(cCase.encounters);
            if (gaps.length > 0) {
                answer = `<strong><i class="fa-solid fa-triangle-exclamation text-amber"></i> REAL-WORLD CARE GAP ANALYSIS (${gaps.length} Gaps Flagged):</strong><br><br>` +
                gaps.map((g, i) => `<strong>Gap #${i+1}:</strong> ${g.days} days between ${g.startDate} and ${g.endDate}.<br><em>Defense Vulnerability:</em> Defense will argue gap indicates injury resolution.<br><em>Plaintiff Rebuttal:</em> ${g.rebuttal}`).join('<br><br>');
            } else {
                answer = `No significant care gaps (>21 days) detected in this chronology. Excellent treatment continuity!`;
            }
        } else if (q.includes('surgery') || q.includes('surgeries') || q.includes('procedure') || q.includes('invasive') || q.includes('injection') || q.includes('operative')) {
            const surgeries = cCase.encounters.filter(e => 
                (e.recordType && (e.recordType.toLowerCase().includes('surgery') || e.recordType.toLowerCase().includes('procedure') || e.recordType.toLowerCase().includes('injection') || e.recordType.toLowerCase().includes('operative'))) ||
                (e.summary && (e.summary.toLowerCase().includes('surgery') || e.summary.toLowerCase().includes('injection') || e.summary.toLowerCase().includes('procedure') || e.summary.toLowerCase().includes('splint') || e.summary.toLowerCase().includes('anesthesia')))
            );
            if (surgeries.length > 0) {
                answer = `<strong><i class="fa-solid fa-scalpel text-indigo"></i> SURGICAL & INVASIVE PROCEDURES (${surgeries.length} Records):</strong><br><br>` +
                surgeries.map(s => `• <strong>${s.date} - ${s.provider} (${s.facility}):</strong> ${s.summary}`).join('<br><br>');
            } else {
                answer = `Conservative care documented; no major invasive open-surgical reports logged in chronology.`;
            }
        } else if (q.includes('ime') || q.includes('cross-exam') || q.includes('cross examination') || q.includes('defense doctor')) {
            answer = generateImeCrossExam(cCase);
        } else if (q.includes('opening') || q.includes('jury') || q.includes('theme') || q.includes('anchor')) {
            answer = generateJuryOpeningAnchors(cCase);
        } else if (q.includes('mediation') || q.includes('settlement') || q.includes('adjuster') || q.includes('brief')) {
            answer = generateMediationSummary(cCase);
        } else if (q.includes('er') || q.includes('emergency') || q.includes('ambulance') || q.includes('ems') || q.includes('hospital')) {
            const erVisits = cCase.encounters.filter(e => 
                (e.medicineType && e.medicineType.toLowerCase().includes('emergency')) ||
                (e.recordType && (e.recordType.toLowerCase().includes('ems') || e.recordType.toLowerCase().includes('emergency') || e.recordType.toLowerCase().includes('ambulance')))
            );
            answer = `<strong><i class="fa-solid fa-truck-medical text-rose"></i> EMERGENCY RESPONSE & ER ADMISSION SUMMARY (${erVisits.length} Records):</strong><br><br>` +
            erVisits.map(e => `• <strong>${e.date} | ${e.facility} (${e.provider}):</strong><br><em>Type:</em> ${e.recordType}${e.painScore != null ? ' | Pain Score: ' + e.painScore + '/10' : ''}<br><em>Clinical Note:</em> ${(e.summary || '').substring(0, 220)}...`).join('<br><br>');
        } else if (q.includes('pre-existing') || q.includes('pre existing') || q.includes('prior') || q.includes('baseline') || q.includes('pre-crash')) {
            const preCrash = cCase.encounters.filter(e => e.isPreCrash);
            answer = `<strong><i class="fa-solid fa-clock-rotate-left text-cyan"></i> PRE-CRASH MEDICAL HISTORY ANALYSIS (${preCrash.length} Baseline Visits):</strong><br><br>` +
            (preCrash.length ? preCrash.map(e => `• <strong>${e.date} - ${e.provider}:</strong> ${e.summary}`).join('<br><br>') : 'No prior pre-crash medical history or pre-existing conditions recorded in this dataset.') +
            `<br><br><strong>LEGAL ANALYSIS (Eggshell Plaintiff Doctrine):</strong> Under settled law, the defendant takes the victim as found and is 100% liable for acute aggravation of prior asymptomatic conditions.`;
        } else {
            // General query fallback
            const totalBills = cCase.encounters.reduce((s,e)=>s+(e.billingAmount||0),0);
            answer = `<strong><i class="fa-solid fa-robot text-purple"></i> AI CHRONOLOGY INTELLIGENCE RESPONSE:</strong><br><br>` +
            `Analyzing chronology query for <strong>${cCase.meta.patientName}</strong>...<br>` +
            `• Incident Date: <strong>${cCase.meta.accidentDate}</strong> (${cCase.meta.accidentType})<br>` +
            `• Total Documented Encounters: <strong>${cCase.encounters.length} visits</strong><br>` +
            `• Incurred Past Medical Bills: <strong>${formatCurrency(totalBills)}</strong><br>` +
            `• Primary Injury Diagnostics: <strong>${cCase.meta.primaryInjuries}</strong><br><br>` +
            `<em>Tip: Click any preset prompt pill above or ask specific questions like "Show all MRIs", "Calculate PT sessions", or "Highest pain score".</em>`;
        }

        return answer;
    }

    // --- TAB 6: COURTROOM EXPORT DECK ---
    function renderExportDeckTab() {
        const cCase = getCurrentCase();
        if (!cCase) return;

        const totalMedical = cCase.encounters.reduce((s,e)=>s+(e.billingAmount||0),0);
        const targetSettlement = (totalMedical * state.verdictParams.multiplier) + state.verdictParams.futureCare + state.verdictParams.lostWages;

        // Slide 1
        elements.dSlide1Title.textContent = `${cCase.meta.patientName.toUpperCase()} - TRIAL PRESENTATION DECK`;
        elements.dSlide1Meta.innerHTML = `
            <li><strong>Plaintiff / Claimant:</strong> ${cCase.meta.patientName}</li>
            <li><strong>Incident Date:</strong> ${cCase.meta.accidentDate}</li>
            <li><strong>Incident Mechanism:</strong> ${cCase.meta.accidentType}</li>
            <li><strong>Jurisdiction:</strong> ${cCase.meta.jurisdiction}</li>
            <li><strong>Primary Diagnostics:</strong> ${cCase.meta.primaryInjuries}</li>
        `;
        elements.dSlide1Medical.textContent = formatCurrency(totalMedical);
        elements.dSlide1Wages.textContent = formatCurrency(state.verdictParams.lostWages);
        elements.dSlide1Future.textContent = formatCurrency(state.verdictParams.futureCare);
        elements.dSlide1Target.textContent = formatCurrency(targetSettlement);

        // Slide 2: Critical Milestones
        const criticals = cCase.encounters.filter(e => e.severity === 'critical').slice(0, 6);
        elements.dSlide2Grid.innerHTML = criticals.length ? criticals.map(c => `
            <div class="slide-card">
                <span class="slide-badge">${c.date}</span>
                <strong style="display:block;margin:0.25rem 0;">${c.provider}</strong>
                <p style="font-size:0.75rem;color:var(--text-secondary);">${c.summary ? (c.summary.length > 110 ? c.summary.substring(0, 110) + '...' : c.summary) : ''}</p>
            </div>
        `).join('') : '<p class="text-muted" style="grid-column: 1 / -1; text-align: center; padding: 2rem;">No critical severity medical encounters flagged.</p>';

        // Slide 3: Starred Exhibits
        const starred = cCase.encounters.filter(e => state.starredExhibits.has(e.id));
        elements.dSlide3TableBody.innerHTML = starred.length ? starred.map((s, idx) => `
            <tr>
                <td><strong>Exhibit ${String.fromCharCode(65 + idx)}</strong></td>
                <td>${s.date}</td>
                <td>${s.provider} (${s.facility})</td>
                <td>${s.recordType}</td>
                <td>${s.summary ? (s.summary.length > 90 ? s.summary.substring(0, 90) + '...' : s.summary) : ''}</td>
            </tr>
        `).join('') : '<tr><td colspan="5" style="text-align:center;color:var(--text-muted);">No exhibits starred. Star encounters on Tab 2 to populate Exhibit Deck.</td></tr>';

        // Slide 4: Gap Rebuttal
        const gaps = calculateGaps(cCase.encounters);
        elements.dSlide4Summary.textContent = `Patient completed ${cCase.encounters.length} medical encounters across emergency care, specialty orthopedics, diagnostic imaging, and physical rehabilitation. Total treatment duration spans ${cCase.encounters.length} visits with ${gaps.length} care gap(s) flagged.`;
        elements.dSlide4GapList.innerHTML = gaps.length ? gaps.map(g => `
            <div style="margin-bottom:0.75rem;font-size:0.8rem;">
                <strong class="text-amber">Gap: ${g.days} Days (${g.startDate} to ${g.endDate})</strong>
                <p class="text-muted">${g.rebuttal}</p>
            </div>
        `).join('') : '<p class="text-emerald">No significant care gaps flagged.</p>';

        // Slide 5: Pre vs Post Causation
        const pre = cCase.encounters.filter(e => e.isPreCrash);
        const post = cCase.encounters.filter(e => !e.isPreCrash);
        elements.dSlide5PreBox.innerHTML = `<p>Total Pre-Crash Baseline Visits: <strong>${pre.length}</strong></p><p class="text-muted">Prior medical history shows minor age-related baseline care.</p>`;
        elements.dSlide5PostBox.innerHTML = `<p>Acute Post-Crash Encounters: <strong>${post.length}</strong></p><p class="text-rose">Acute traumatic crash exacerbation resulting in ${formatCurrency(totalMedical)} in medical care.</p>`;
    }


    // --- TAB SWITCHER ENGINE ---
    function switchTab(tabId) {
        state.activeTab = tabId;
        elements.navTabs.forEach(btn => {
            if (btn.getAttribute('data-tab') === tabId) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        elements.tabPanels.forEach(panel => {
            if (panel.id === tabId) {
                panel.classList.add('active');
            } else {
                panel.classList.remove('active');
            }
        });

        renderApp();
    }

    // --- EVENT LISTENERS ---
    elements.navTabs.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.getAttribute('data-tab');
            switchTab(tabId);
        });
    });

    elements.sampleSelect.addEventListener('change', (evt) => {
        state.activeCaseId = evt.target.value;
        state.filters.selectedBodyPart = null;
        state.verdictParams.medicalBills = null; // Reset medical bills override for new case
        initStarredExhibits();
        renderApp();
    });

    // Slider & Input Listeners for Calculator
    if (elements.vMedicalBillsInput) {
        elements.vMedicalBillsInput.addEventListener('input', (evt) => {
            const val = parseFloat(evt.target.value);
            state.verdictParams.medicalBills = isNaN(val) ? 0 : val;
            renderVerdictTab();
        });
    }

    elements.vMultiplierSlider.addEventListener('input', (evt) => {
        state.verdictParams.multiplier = parseFloat(evt.target.value) || 3.0;
        renderVerdictTab();
    });

    elements.vFutureCareInput.addEventListener('input', (evt) => {
        state.verdictParams.futureCare = parseFloat(evt.target.value) || 0;
        renderVerdictTab();
    });

    elements.vLostWagesInput.addEventListener('input', (evt) => {
        state.verdictParams.lostWages = parseFloat(evt.target.value) || 0;
        renderVerdictTab();
    });

    if (elements.vFaultSlider) {
        elements.vFaultSlider.addEventListener('input', (evt) => {
            state.verdictParams.fault = parseFloat(evt.target.value) || 0;
            renderVerdictTab();
        });
    }

    // Search Box Listener
    elements.searchBox.addEventListener('input', (evt) => {
        state.filters.searchQuery = evt.target.value;
        renderTimelineTab();
    });

    // Crash Date Lock Listener
    if (elements.crashDateInput) {
        elements.crashDateInput.addEventListener('change', (evt) => {
            const newDate = evt.target.value;
            const cCase = getCurrentCase();
            if (cCase && newDate) {
                applyAccidentDate(cCase, newDate);
                renderApp();
            }
        });
    }

    // Sequence Pills (Pre/Post)
    elements.sequencePills.forEach(pill => {
        pill.addEventListener('click', () => {
            elements.sequencePills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            state.filters.sequence = pill.getAttribute('data-view');
            renderTimelineTab();
        });
    });

    elements.milestoneFilter.addEventListener('change', (evt) => {
        state.filters.milestone = evt.target.value;
        renderTimelineTab();
    });

    elements.gapToggle.addEventListener('change', (evt) => {
        state.filters.gapHighlight = evt.target.checked;
        renderTimelineTab();
    });

    elements.layoutStreamBtn.addEventListener('click', () => {
        elements.layoutStreamBtn.classList.add('active');
        if (elements.layoutSteppedBtn) elements.layoutSteppedBtn.classList.remove('active');
        elements.layoutGridBtn.classList.remove('active');
        state.viewLayout = 'stream';
        renderTimelineTab();
    });

    if (elements.layoutSteppedBtn) {
        elements.layoutSteppedBtn.addEventListener('click', () => {
            elements.layoutSteppedBtn.classList.add('active');
            elements.layoutStreamBtn.classList.remove('active');
            elements.layoutGridBtn.classList.remove('active');
            state.viewLayout = 'stepped';
            renderTimelineTab();
        });
    }

    elements.layoutGridBtn.addEventListener('click', () => {
        elements.layoutGridBtn.classList.add('active');
        elements.layoutStreamBtn.classList.remove('active');
        if (elements.layoutSteppedBtn) elements.layoutSteppedBtn.classList.remove('active');
        state.viewLayout = 'grid';
        renderTimelineTab();
    });

    // AI Q&A Engine Listener
    elements.aiAskBtn.addEventListener('click', () => {
        const query = elements.aiQuestionInput.value.trim();
        if (query) handleAiQuestion(query);
    });

    elements.aiQuestionInput.addEventListener('keypress', (evt) => {
        if (evt.key === 'Enter') {
            const query = elements.aiQuestionInput.value.trim();
            if (query) handleAiQuestion(query);
        }
    });

    document.querySelectorAll('.preset-pill').forEach(pill => {
        pill.addEventListener('click', () => {
            const query = pill.getAttribute('data-query');
            elements.aiQuestionInput.value = query;
            handleAiQuestion(query);
        });
    });

    // AI Brief & Trial Generators Listeners
    if (elements.regenAiBriefBtn) {
        elements.regenAiBriefBtn.addEventListener('click', async () => {
            const cCase = getCurrentCase();
            if (state.geminiKey && cCase) {
                elements.aiBriefBox.innerHTML = '<span class="text-dim"><i class="fa-solid fa-spinner fa-spin"></i> Drafting an AI treatment summary from this case...</span>';
                try {
                    const text = await callGemini(`Draft a concise medical treatment summary (4-6 short paragraphs) of this personal-injury case for the plaintiff's attorney. Use only the facts in the data, reference dates, and describe the arc of treatment from injury through recovery. Do not invent dollar amounts or pain scores that are not present.\n\n${buildAiContext(cCase)}`);
                    elements.aiBriefBox.innerHTML = aiTextToHtml(text);
                    showToast('AI treatment summary drafted.', 'success');
                    return;
                } catch (err) {
                    showToast(`Live AI unavailable (${err.message}). Showing standard brief.`, 'error');
                }
            }
            renderAiTab();
            if (elements.aiBriefBox) {
                elements.aiBriefBox.style.opacity = '0.4';
                setTimeout(() => { elements.aiBriefBox.style.opacity = '1'; }, 180);
            }
        });
    }

    if (elements.btnGenImeQuestions) {
        elements.btnGenImeQuestions.addEventListener('click', () => {
            const cCase = getCurrentCase();
            if (cCase) {
                elements.aiAnswerText.innerHTML = generateImeCrossExam(cCase);
                elements.aiAnswerWindow.classList.remove('hidden');
                elements.aiAnswerWindow.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        });
    }

    if (elements.btnGenJuryAnchors) {
        elements.btnGenJuryAnchors.addEventListener('click', () => {
            const cCase = getCurrentCase();
            if (cCase) {
                elements.aiAnswerText.innerHTML = generateJuryOpeningAnchors(cCase);
                elements.aiAnswerWindow.classList.remove('hidden');
                elements.aiAnswerWindow.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        });
    }

    if (elements.btnGenMediationSummary) {
        elements.btnGenMediationSummary.addEventListener('click', () => {
            const cCase = getCurrentCase();
            if (cCase) {
                elements.aiAnswerText.innerHTML = generateMediationSummary(cCase);
                elements.aiAnswerWindow.classList.remove('hidden');
                elements.aiAnswerWindow.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        });
    }

    // Copy Demand Text
    elements.copyDemandBtn.addEventListener('click', () => {
        const text = elements.demandLetterBox.innerText;
        navigator.clipboard.writeText(text).then(() => {
            showToast('Demand letter copied to clipboard.', 'success');
        });
    });

    // Copy AI Answer
    elements.copyAiAnswerBtn.addEventListener('click', () => {
        const text = elements.aiAnswerText.innerText;
        navigator.clipboard.writeText(text).then(() => {
            showToast('AI response copied to clipboard.', 'success');
        });
    });

    // Quick Export Button (Header)
    elements.quickExportBtn.addEventListener('click', () => {
        switchTab('tab-export');
    });

    // Export Deck Action Buttons
    elements.printPdfDeckBtn.addEventListener('click', () => {
        renderExportDeckTab();
        window.print();
    });

    elements.downloadJsonBtn.addEventListener('click', () => {
        const cCase = getCurrentCase();
        if (!cCase) return;
        const jsonStr = JSON.stringify(cCase, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute("href", url);
        downloadAnchor.setAttribute("download", `${state.activeCaseId}_medical_chronology.json`);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        document.body.removeChild(downloadAnchor);
        URL.revokeObjectURL(url);
    });

    elements.downloadCsvBtn.addEventListener('click', () => {
        const cCase = getCurrentCase();
        if (!cCase) return;
        const starred = cCase.encounters.filter(e => state.starredExhibits.has(e.id));
        let csv = 'Exhibit,Date,Provider,Facility,RecordType,BodyPart,PainScore,BillingAmount,Summary\n';
        starred.forEach((s, idx) => {
            const exNo = `Exhibit ${String.fromCharCode(65 + idx)}`;
            const date = (s.date || '').replace(/"/g, '""');
            const provider = (s.provider || '').replace(/"/g, '""');
            const facility = (s.facility || '').replace(/"/g, '""');
            const recordType = (s.recordType || '').replace(/"/g, '""');
            const bodyPart = (s.bodyPart || '').replace(/"/g, '""');
            const summ = (s.summary || '').replace(/"/g, '""');
            csv += `"${exNo}","${date}","${provider}","${facility}","${recordType}","${bodyPart}",${s.painScore || 0},${s.billingAmount || 0},"${summ}"\n`;
        });
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `${state.activeCaseId}_starred_exhibits.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    });

    // Modal Close Listeners
    elements.modalCloseBtn.addEventListener('click', () => elements.eventModal.classList.add('hidden'));
    elements.modalCloseActionBtn.addEventListener('click', () => elements.eventModal.classList.add('hidden'));
    elements.qModalCloseBtn.addEventListener('click', () => elements.questionnaireModal.classList.add('hidden'));
    elements.uModalCloseBtn.addEventListener('click', () => elements.uploadModal.classList.add('hidden'));

    // Modal Overlay Backdrop Click & ESC Key Close
    elements.eventModal.addEventListener('click', (evt) => {
        if (evt.target === elements.eventModal) {
            elements.eventModal.classList.add('hidden');
        }
    });

    document.addEventListener('keydown', (evt) => {
        if (evt.key === 'Escape' && !elements.eventModal.classList.contains('hidden')) {
            elements.eventModal.classList.add('hidden');
        }
    });

    elements.openQuestionnaireBtn.addEventListener('click', () => elements.questionnaireModal.classList.remove('hidden'));
    elements.uploadExcelTriggerBtn.addEventListener('click', () => elements.uploadModal.classList.remove('hidden'));
    elements.browseFilesBtn.addEventListener('click', () => elements.fileUploadInput.click());

    elements.modalStarBtn.addEventListener('click', () => {
        if (activeModalEncounterId) {
            toggleStarExhibit(activeModalEncounterId);
            openEncounterModal(activeModalEncounterId);
            renderApp();
        }
    });

    // Questionnaire Form submit
    elements.questionnaireForm.addEventListener('submit', (evt) => {
        evt.preventDefault();
        const accDate = document.getElementById('qAccidentDate').value;
        if (accDate) {
            const cCase = getCurrentCase();
            if (cCase) {
                applyAccidentDate(cCase, accDate);
            }
        }
        elements.questionnaireModal.classList.add('hidden');
        renderApp();
    });

    // File Upload Handler (SheetJS)
    elements.fileUploadInput.addEventListener('change', handleFileUpload);
    elements.dropZone.addEventListener('dragover', (e) => { e.preventDefault(); elements.dropZone.style.borderColor = '#6366f1'; });
    elements.dropZone.addEventListener('dragleave', () => { elements.dropZone.style.borderColor = 'rgba(99,102,241,0.35)'; });
    elements.dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        if (e.dataTransfer.files.length) {
            handleFileObject(e.dataTransfer.files[0]);
        }
    });

    // ---- v2 control wiring ----

    // Group-by segmented control
    const groupByControl = document.getElementById('groupByControl');
    if (groupByControl) {
        groupByControl.addEventListener('click', (evt) => {
            const btn = evt.target.closest('button[data-group]');
            if (!btn) return;
            groupByControl.querySelectorAll('button').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.filters.groupBy = btn.getAttribute('data-group');
            renderTimelineTab();
        });
    }

    // Provider / medicine-type facet chips (delegated)
    function wireFacetBox(boxId, set) {
        const box = document.getElementById(boxId);
        if (!box) return;
        box.addEventListener('click', (evt) => {
            const chip = evt.target.closest('.facet-chip');
            if (!chip) return;
            const val = chip.getAttribute('data-val');
            if (set.has(val)) set.delete(val); else set.add(val);
            renderTimelineTab();
        });
    }
    wireFacetBox('providerFacets', state.filters.providerFilter);
    wireFacetBox('medTypeFacets', state.filters.medTypeFilter);

    // Date range
    const dateFromInput = document.getElementById('dateFromInput');
    const dateToInput = document.getElementById('dateToInput');
    if (dateFromInput) dateFromInput.addEventListener('change', (e) => { state.filters.dateFrom = e.target.value || null; renderTimelineTab(); });
    if (dateToInput) dateToInput.addEventListener('change', (e) => { state.filters.dateTo = e.target.value || null; renderTimelineTab(); });
    const clearDateRangeBtn = document.getElementById('clearDateRangeBtn');
    if (clearDateRangeBtn) clearDateRangeBtn.addEventListener('click', () => {
        state.filters.dateFrom = null; state.filters.dateTo = null;
        if (dateFromInput) dateFromInput.value = ''; if (dateToInput) dateToInput.value = '';
        renderTimelineTab();
    });

    // Clear ALL timeline filters at once
    function clearAllFilters() {
        state.filters.searchQuery = '';
        state.filters.sequence = 'all';
        state.filters.milestone = 'all';
        state.filters.selectedBodyPart = null;
        state.filters.groupBy = 'none';
        state.filters.providerFilter.clear();
        state.filters.medTypeFilter.clear();
        state.filters.dateFrom = null;
        state.filters.dateTo = null;
        if (elements.searchBox) elements.searchBox.value = '';
        if (elements.milestoneFilter) elements.milestoneFilter.value = 'all';
        elements.sequencePills.forEach(p => p.classList.toggle('active', p.getAttribute('data-view') === 'all'));
        const gbc = document.getElementById('groupByControl');
        if (gbc) gbc.querySelectorAll('button').forEach(b => b.classList.toggle('active', b.getAttribute('data-group') === 'none'));
        if (dateFromInput) dateFromInput.value = '';
        if (dateToInput) dateToInput.value = '';
        renderTimelineTab();
        showToast('All filters cleared.', 'info');
    }
    const clearAllFiltersBtn = document.getElementById('clearAllFiltersBtn');
    if (clearAllFiltersBtn) clearAllFiltersBtn.addEventListener('click', clearAllFilters);

    // Milestones rail (jump to encounter / open crash setup)
    const milestonesRail = document.getElementById('milestonesRail');
    if (milestonesRail) {
        milestonesRail.addEventListener('click', (evt) => {
            const chip = evt.target.closest('.milestone-chip');
            if (!chip) return;
            if (chip.getAttribute('data-crash')) { elements.questionnaireModal.classList.remove('hidden'); return; }
            const id = chip.getAttribute('data-jump');
            if (id) openEncounterModal(id);
        });
    }

    // Save / Saved timelines
    const saveTimelineBtn = document.getElementById('saveTimelineBtn');
    if (saveTimelineBtn) saveTimelineBtn.addEventListener('click', saveCurrentTimeline);
    const openSavedBtn = document.getElementById('openSavedBtn');
    if (openSavedBtn) openSavedBtn.addEventListener('click', () => { renderSavedList(); document.getElementById('savedModal').classList.remove('hidden'); });
    const savedModalCloseBtn = document.getElementById('savedModalCloseBtn');
    if (savedModalCloseBtn) savedModalCloseBtn.addEventListener('click', () => document.getElementById('savedModal').classList.add('hidden'));
    const savedList = document.getElementById('savedList');
    if (savedList) savedList.addEventListener('click', (evt) => {
        const loadBtn = evt.target.closest('[data-load]');
        const delBtn = evt.target.closest('[data-del]');
        if (loadBtn) loadSavedTimeline(loadBtn.getAttribute('data-load'));
        else if (delBtn) deleteSaved(delBtn.getAttribute('data-del'));
    });

    // Gemini API key
    const geminiKeyInput = document.getElementById('geminiKeyInput');
    const saveGeminiKeyBtn = document.getElementById('saveGeminiKeyBtn');
    if (saveGeminiKeyBtn) saveGeminiKeyBtn.addEventListener('click', () => {
        const key = (geminiKeyInput.value || '').trim();
        state.geminiKey = key || null;
        setAiModeBadge();
        showToast(key ? 'Live AI enabled for this session.' : 'Key cleared - using offline mode.', key ? 'success' : 'info');
    });

    // PowerPoint export
    const exportPptxBtn = document.getElementById('exportPptxBtn');
    if (exportPptxBtn) exportPptxBtn.addEventListener('click', exportPptx);

    // Dismiss the extra modals with backdrop click + ESC
    ['questionnaireModal', 'uploadModal', 'savedModal'].forEach(idKey => {
        const m = document.getElementById(idKey);
        if (!m) return;
        m.addEventListener('click', (evt) => { if (evt.target === m) m.classList.add('hidden'); });
    });
    document.addEventListener('keydown', (evt) => {
        if (evt.key !== 'Escape') return;
        ['questionnaireModal', 'uploadModal', 'savedModal'].forEach(idKey => {
            const m = document.getElementById(idKey);
            if (m) m.classList.add('hidden');
        });
    });

    function handleFileUpload(evt) {
        if (evt.target.files.length) {
            handleFileObject(evt.target.files[0]);
        }
    }

    function handleFileObject(file) {
        elements.uploadStatusBox.classList.remove('hidden');
        const reader = new FileReader();

        reader.onload = function(e) {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array', cellDates: true });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                const jsonRows = XLSX.utils.sheet_to_json(worksheet);

                if (jsonRows.length === 0) {
                    showToast('Uploaded file contains no rows.', 'error');
                    elements.uploadStatusBox.classList.add('hidden');
                    return;
                }

                // Find a column value by alternative header names.
                // Two passes: exact normalized match first, then substring match, so real headers
                // like "Primary Provider" / "Body Parts" bind correctly without a generic alias
                // (e.g. bare "Type") stealing the wrong column.
                function getColVal(row, keys, fallback = '') {
                    const normKeys = keys.map(k => k.trim().toLowerCase());
                    const entries = Object.keys(row).map(rk => [rk.trim().toLowerCase(), row[rk]]);
                    for (const k of normKeys) {
                        const hit = entries.find(([rk]) => rk === k);
                        if (hit) return hit[1];
                    }
                    for (const k of normKeys) {
                        const hit = entries.find(([rk]) => rk.includes(k));
                        if (hit) return hit[1];
                    }
                    return fallback;
                }

                const newEncounters = jsonRows.map((row, idx) => {
                    const rawDate = getColVal(row, ['Encounter Date', 'Date of Service', 'Service Date', 'DOS', 'Date', 'date'], '');
                    const dateVal = formatDisplayDate(getParsedDate(rawDate));
                    const providerVal = String(getColVal(row, ['Primary Provider', 'Provider', 'Provider Name', 'Treating Provider', 'Physician', 'Doctor'], 'Unknown Provider')).trim();
                    const facilityVal = String(getColVal(row, ['Facility', 'Facility Name', 'Hospital', 'Clinic', 'Location'], 'Unknown Facility')).trim();
                    const bodyPartVal = String(getColVal(row, ['Body Parts', 'Body Part', 'BodyPart', 'Body Region', 'Injured Area', 'Anatomy'], '')).trim();
                    const recTypeVal = String(getColVal(row, ['Record Type', 'recordType', 'RecordType', 'Document Type'], 'Encounter Note')).trim();
                    const medTypeVal = String(getColVal(row, ['Medicine Type', 'Specialty', 'medicineType', 'Department', 'Discipline'], 'General Medicine')).trim();
                    const summaryVal = String(getColVal(row, ['Summary', 'Narrative', 'Notes', 'Description', 'Clinical Findings', 'Details'], 'No summary details provided.')).trim();
                    const pdfVal = String(getColVal(row, ['Link To Pdf', 'Link to PDF', 'PDF Link', 'Source PDF', 'Pdf', 'Link'], '')).trim();

                    // Billing and pain are NOT in the standard Excel format. Do not fabricate them:
                    // leave null when absent so the UI can hide (rather than invent) these figures.
                    const rawCost = getColVal(row, ['Billing Amount', 'billingAmount', 'Cost', 'Billed', 'Charges', 'Charge', 'Fee', 'Amount'], null);
                    let billingAmount = null;
                    if (rawCost !== null && String(rawCost).trim() !== '') {
                        const parsedCost = parseFloat(String(rawCost).replace(/[^0-9.]/g, ''));
                        if (!isNaN(parsedCost)) billingAmount = parsedCost;
                    }

                    const rawPain = getColVal(row, ['Pain Score', 'painScore', 'Pain Level', 'Pain'], null);
                    let painScore = null;
                    if (rawPain !== null && String(rawPain).trim() !== '') {
                        const parsedPain = parseInt(String(rawPain).replace(/[^0-9]/g, ''), 10);
                        if (!isNaN(parsedPain)) painScore = Math.min(10, Math.max(0, parsedPain));
                    }

                    // Severity: use an explicit column if present, otherwise infer from the summary text.
                    const rawSev = String(getColVal(row, ['Severity', 'severity'], '')).toLowerCase().trim();
                    let severity = 'routine';
                    if (rawSev) {
                        severity = rawSev;
                    } else {
                        const sumLower = summaryVal.toLowerCase();
                        if (sumLower.includes('surgery') || sumLower.includes('fracture') || sumLower.includes('mri') || sumLower.includes('trauma')) {
                            severity = 'critical';
                        } else if (sumLower.includes('emergency') || /\ber\b/.test(sumLower) || sumLower.includes('injection')) {
                            severity = 'high';
                        } else if (sumLower.includes('therapy') || sumLower.includes('pain') || sumLower.includes('strain')) {
                            severity = 'moderate';
                        }
                    }

                    return {
                        id: `enc_custom_${idx + 1}`,
                        date: dateVal,
                        provider: providerVal || 'Unknown Provider',
                        facility: facilityVal || 'Unknown Facility',
                        bodyPart: bodyPartVal,
                        medicineType: medTypeVal,
                        recordType: recTypeVal,
                        summary: summaryVal,
                        pdfLink: pdfVal || null,
                        painScore: painScore,
                        billingAmount: billingAmount,
                        severity: severity,
                        // Crash date is not in the file; nothing is flagged pre-crash until the attorney sets it.
                        isPreCrash: false,
                        isStarred: false
                    };
                });

                // Chronological order, then seed the first few as candidate exhibits.
                newEncounters.sort((a, b) => getParsedDate(a.date) - getParsedDate(b.date));
                newEncounters.forEach((enc, i) => { enc.isStarred = i < 3; });

                const customCaseId = `custom_${Date.now()}`;
                const fileNameClean = file.name.replace(/\.[^/.]+$/, "");
                // The crash date is NOT in the file. We do not presume one: leave it unset and
                // let the attorney add it. The earliest/latest encounter dates are only used as a hint.
                const firstEnc = newEncounters.length ? newEncounters[0].date : '';
                const lastEnc = newEncounters.length ? newEncounters[newEncounters.length - 1].date : '';

                state.cases[customCaseId] = {
                    meta: {
                        caseId: customCaseId,
                        patientName: fileNameClean,
                        accidentDate: '',
                        accidentType: 'Uploaded Medical Chronology',
                        claimantAge: null,
                        policyLimits: 'Not specified',
                        jurisdiction: 'Not specified',
                        primaryInjuries: 'See encounter records'
                    },
                    encounters: newEncounters
                };

                // Add to select dropdown if not already present
                let opt = Array.from(elements.sampleSelect.options).find(o => o.value === customCaseId);
                if (!opt) {
                    opt = document.createElement('option');
                    opt.value = customCaseId;
                    opt.textContent = `📂 ${fileNameClean} (${newEncounters.length} Encounters)`;
                    elements.sampleSelect.appendChild(opt);
                }
                elements.sampleSelect.value = customCaseId;

                state.activeCaseId = customCaseId;
                state.filters.selectedBodyPart = null;
                state.filters.sequence = 'all';
                state.verdictParams.medicalBills = null;
                initStarredExhibits();

                elements.uploadStatusBox.classList.add('hidden');
                elements.uploadModal.classList.add('hidden');

                // Land on the timeline (the story), then prompt for the crash date, which is not in the file.
                switchTab('tab-timeline');
                renderApp();

                elements.questionnaireModal.classList.remove('hidden');
                const qDateEl = document.getElementById('qAccidentDate');
                if (qDateEl) qDateEl.value = ''; // do not presume a date - attorney enters it
                const qHint = document.getElementById('qAccidentHint');
                if (qHint) qHint.innerHTML = `Not in the medical records. Treatment window in this file: <strong>${escapeHtml(firstEnc)}</strong> to <strong>${escapeHtml(lastEnc)}</strong>. Until you set the crash date, the case is shown without a pre/post-crash split.`;
                showToast(`Loaded ${newEncounters.length} encounters. Add the crash date in Case Setup - it is not in the medical records.`, 'info');

            } catch (err) {
                console.error(err);
                showToast('Could not parse file. Provide an Excel/CSV with an Encounter Date and Summary column.', 'error');
                elements.uploadStatusBox.classList.add('hidden');
            }
        };

        reader.readAsArrayBuffer(file);
    }

    // --- Initial Launch ---
    renderApp();
});
