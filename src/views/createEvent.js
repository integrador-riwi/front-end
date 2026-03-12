import "../assets/styles/dashboard.css";
import "../assets/styles/components.css";
import "../assets/styles/eventCreated.css";
import "../assets/styles/rubricBuilder.css";
import Navbar from "../components/navbar/navbar.js";
import Header from "../components/header/header.js";
import { getUser } from "../utils/auth.js";
import { apiFetch, getGithubOrgs, getGithubAuthUrl } from "../services/api.js";
import { toast } from "../components/Toast/index.js";
import * as XLSX from 'xlsx';

const AREAS = ["DEVELOPMENT", "SOFT_SKILLS", "ENGLISH"];
const AREA_LABELS = {
  DEVELOPMENT: "Development (TL Dev)",
  SOFT_SKILLS: "Soft Skills (TL Soft Skills)",
  ENGLISH: "English (TL English)",
};
const AREA_COLOR = {
  DEVELOPMENT: "#6b5cff",
  SOFT_SKILLS: "#5acca4",
  ENGLISH: "#eaa2fc",
};

const ALL_CLANS = [
  "Magdalena",
  "Esthercita",
  "Garabato",
  "Micaela",
  "Cayena",
  "Malecón",
  "Cortissoz",
  "Turing",
  "Tesla",
  "McCarthy",
];

export default class CreateEvent {
  constructor(router) {
    this.router = router;
    this.user = getUser();
    this.navbar = new Navbar(router);
    this.header = new Header(router);
    this.loading = false;
    this.targetClans = [];
    this.githubOrgs = [];
    this.githubConnected = false;
    this.githubUsername = null;

    // Rubric Builder state
    this.rubricMode = null; // 'platform' or 'template'
    this.templateFile = null;
    this.rubricAreas = [
      { id: 'dev', type: 'DEVELOPMENT', title: AREA_LABELS['DEVELOPMENT'], weight: 0, criteria: [], isExpanded: true },
      { id: 'soft', type: 'SOFT_SKILLS', title: AREA_LABELS['SOFT_SKILLS'], weight: 0, criteria: [], isExpanded: false },
      { id: 'eng', type: 'ENGLISH', title: AREA_LABELS['ENGLISH'], weight: 0, criteria: [], isExpanded: false }
    ];
  }

  // ── Event Data ──────────────────────────────────────────────────────────────

  _getEventData() {
    return {
      title: document.getElementById("ev-title")?.value?.trim() ?? "",
      description: document.getElementById("ev-description")?.value?.trim() ?? "",
      eventType: document.getElementById("ev-type")?.value ?? "CAPSTONE",
      route: document.getElementById("ev-route")?.value ?? "BASIC",
      cohort: document.getElementById("ev-cohort")?.value?.trim() ?? "",
      githubOrg: document.getElementById("ev-github-org")?.value?.trim() || this.selectedGithubOrg || null,
      maxTeamSize: parseInt(document.getElementById("ev-max-team")?.value ?? "5"),
      eventDate: document.getElementById("ev-start-date")?.value
        ? `${document.getElementById("ev-start-date").value}T10:00:00`
        : null,
      endDate: document.getElementById("ev-end-date")?.value
        ? `${document.getElementById("ev-end-date").value}T18:00:00`
        : null,
      status: "UPCOMING",
      targetClans: this.targetClans.length > 0 ? this.targetClans : null,
    };
  }

  _toggleClan(clan) {
    if (this.targetClans.includes(clan)) {
      this.targetClans = this.targetClans.filter((c) => c !== clan);
    } else {
      this.targetClans.push(clan);
    }
    this._rerenderClanPicker();
  }

  _selectAllClans() {
    this.targetClans = [];
    this._rerenderClanPicker();
  }

  _rerenderClanPicker() {
    const container = document.getElementById("clan-picker-body");
    if (container) container.innerHTML = this._renderClanPickerBody();
    this._attachClanHandlers();
    this._updateClanSummary();
  }

  _updateClanSummary() {
    const summary = document.getElementById("clan-summary");
    if (!summary) return;
    if (this.targetClans.length === 0) {
      summary.textContent = "Todos los clanes";
      summary.className = "ce-clan-summary ce-clan-summary--all";
    } else {
      summary.textContent = this.targetClans.join(", ");
      summary.className = "ce-clan-summary ce-clan-summary--partial";
    }
  }

  _renderClanPickerBody() {
    const allSelected = this.targetClans.length === 0;
    return `
      <button class="ce-clan-chip ${allSelected ? "ce-clan-chip--active" : ""}" data-clan="ALL" type="button">
        Todos los clanes
      </button>
      ${ALL_CLANS.map((clan) => {
      const active = this.targetClans.includes(clan);
      return `<button class="ce-clan-chip ${active ? "ce-clan-chip--active" : ""}" data-clan="${clan}" type="button">${clan}</button>`;
    }).join("")}
    `;
  }

  _renderClanSection() {
    return `
      <div class="ce-clan-section">
        <label class="form-label fw-semibold">Clanes participantes</label>
        <p class="ce-section-subtitle" style="margin-bottom: 10px;">
          Selecciona los clanes que verán este evento, o déjalo en "Todos los clanes".
        </p>
        <div class="ce-clan-picker" id="clan-picker-body">
          ${this._renderClanPickerBody()}
        </div>
        <div class="ce-clan-footer">
          <span>Scope: </span>
          <span id="clan-summary" class="ce-clan-summary ce-clan-summary--all">Todos los clanes</span>
        </div>
      </div>
    `;
  }

  _attachClanHandlers() {
    document.querySelectorAll(".ce-clan-chip").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (btn.dataset.clan === "ALL") {
          this._selectAllClans();
        } else {
          this._toggleClan(btn.dataset.clan);
        }
      });
    });
  }

  _buildRubricsPayload() {
    const payload = [];
    if (this.rubricMode !== 'platform') return payload;

    for (const area of this.rubricAreas) {
      for (const crit of area.criteria) {
        payload.push({
          area: area.type,
          name: crit.name || "Untitled Criteria",
          description: crit.description || null,
          weight: (crit.weight / 100), // convert percentage to 0-1
          grades: crit.levels.map(l => ({ score: l.score, description: l.description, name: l.name }))
        });
      }
    }
    return payload;
  }

  // ── Validation ─────────────────────────────────────────────────────────────

  _validate() {
    const ev = this._getEventData();
    if (!ev.title) return "El título del evento es obligatorio.";
    if (!ev.eventDate) return "La fecha de inicio es obligatoria.";

    if (this.rubricMode === 'platform') {
      this._recalculateWeights();
      let totalWeight = this._getTotalWeight();
      for (const a of this.rubricAreas) {
        for (const c of a.criteria) {
          if (!c.name) return `Un criterio de ${a.title} no tiene nombre.`;
          if (c.levels.length === 0) return `El criterio "${c.name}" no tiene niveles de desempeño.`;
        }
      }
      if (Math.abs(totalWeight - 100) > 0.1 && totalWeight > 0) {
        return `El peso total de las áreas es ${totalWeight}%. Debe ser exactamente 100%.`;
      }
      if (totalWeight === 0) {
        return `Debes definir al menos un criterio con peso mayor a 0%.`;
      }
    } else if (this.rubricMode === 'template' && !this.templateFile) {
      return `Por favor sube un archivo de template.`;
    }

    return null;
  }

  // ── Submit ─────────────────────────────────────────────────────────────────

  async _handleSubmit() {
    const err = this._validate();
    if (err) {
      toast.error('Error de Validación', err);
      return;
    }

    this._setLoading(true);
    try {
      const body = {
        ...this._getEventData(),
        rubrics: this.rubricMode === 'platform' ? this._buildRubricsPayload() : [],
      };
      await apiFetch("/events", { method: "POST", body });
      toast.success('¡Evento creado!', 'El evento se ha creado correctamente.');
      setTimeout(() => this.router.navigate("events"), 1600);
    } catch (e) {
      toast.error('Error', e.message ?? "Error al crear el evento.");
    } finally {
      this._setLoading(false);
    }
  }

  // ── Rubric Redesign Logic ─────────────────────────────────────────────────────────

  _generateId() {
    return Math.random().toString(36).substr(2, 9);
  }

  _rerenderRubricSection() {
    const container = document.getElementById('ce-rubrics-container');
    if (container) {
      container.innerHTML = this._renderRubricState();
      this._attachRubricHandlers();
    }
  }

  // ── Template Download ──────────────────────────────────────────────────────

  _downloadTemplate() {
    const data = [
      ["Area", "Criterio", "Descripcion", "Peso %", "Pts Nivel 1", "Nombre Nivel 1", "Desc Nivel 1", "Pts Nivel 2", "Nombre Nivel 2", "Desc Nivel 2", "Pts Nivel 3", "Nombre Nivel 3", "Desc Nivel 3"],
      ["DEVELOPMENT", "Codigo Limpio", "Uso de buenas practicas", 20, 0, "Insatisfactorio", "Codigo sucio", 50, "Bien", "Codigo legible", 100, "Excelente", "Codigo profesional"],
      ["SOFT_SKILLS", "Comunicacion", "Capacidad de expresion", 15, 0, "Bajo", "No se expresa", 60, "Medio", "Se expresa bien", 100, "Alto", "Gran comunicador"],
      ["ENGLISH", "Vocabulary", "Range of vocabulary", 10, 0, "Basic", "Basic words", 50, "Intermediate", "Good range", 100, "Advanced", "Fluent range"]
    ];

    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "RubricTemplate");

    // Auto-size columns
    const colWidths = data[0].map((_, i) => ({ wch: Math.max(...data.map(row => row[i] ? row[i].toString().length : 0)) + 5 }));
    ws['!cols'] = colWidths;

    XLSX.writeFile(wb, "teamUp-rubric-template.xlsx");
    toast.success("Descarga Iniciada", "El template se ha generado correctamente.");
  }

  _addCriteria(areaId) {
    const area = this.rubricAreas.find(a => a.id === areaId);
    if (area) {
      area.criteria.push({
        id: this._generateId(),
        name: '',
        description: '',
        weight: 0,
        isExpanded: true,
        levels: [
          { score: 0, name: 'Insatisfactorio', description: '', color: '#ff4d4f' },
          { score: 50, name: 'Bueno', description: '', color: '#faad14' },
          { score: 100, name: 'Excelente', description: '', color: '#52c41a' }
        ]
      });
      area.isExpanded = true;
      this._recalculateWeights();
      this._rerenderRubricSection();
    }
  }

  _removeCriteria(areaId, critId) {
    const area = this.rubricAreas.find(a => a.id === areaId);
    if (area) {
      area.criteria = area.criteria.filter(c => c.id !== critId);
      this._recalculateWeights();
      this._rerenderRubricSection();
    }
  }

  _addLevel(areaId, critId) {
    const area = this.rubricAreas.find(a => a.id === areaId);
    if (area) {
      const crit = area.criteria.find(c => c.id === critId);
      if (crit) {
        crit.levels.push({ score: 0, name: 'Nuevo Nivel', description: '', color: '#1890ff' });
        this._rerenderRubricSection();
      }
    }
  }

  _removeLevel(areaId, critId, levelIndex) {
    const area = this.rubricAreas.find(a => a.id === areaId);
    if (area) {
      const crit = area.criteria.find(c => c.id === critId);
      if (crit) {
        crit.levels.splice(levelIndex, 1);
        this._rerenderRubricSection();
      }
    }
  }

  _recalculateWeights() {
    this.rubricAreas.forEach(area => {
      let areaW = 0;
      area.criteria.forEach(crit => {
        const wInput = document.getElementById(`weight-${crit.id}`);
        if (wInput) crit.weight = parseFloat(wInput.value) || 0;
        areaW += crit.weight;
      });
      area.weight = areaW;
    });
  }

  _getTotalWeight() {
    return this.rubricAreas.reduce((sum, a) => sum + a.weight, 0);
  }

  _renderRubricState() {
    if (!this.rubricMode) {
      return `
         <div class="rubric-onboarding text-center py-5">
            <h4 class="fw-bold mb-2">Crear Nueva Rúbrica</h4>
            <p class="text-muted mb-4">Selecciona cómo deseas construir tu marco de evaluación.</p>
            <div class="d-flex justify-content-center gap-4">
              <div class="rubric-opt-card" id="btn-mode-platform">
                <div class="rubric-opt-icon flex-center bg-primary-soft text-primary mb-3">
                  <svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>
                </div>
                <h5 class="fw-bold mb-2">Crear en Plataforma</h5>
                <p class="text-muted small mb-0">Construye tu rúbrica paso a paso usando nuestro editor interactivo.</p>
              </div>
              <div class="rubric-opt-card" id="btn-mode-template">
                <div class="rubric-opt-icon flex-center bg-secondary-soft text-secondary mb-3">
                  <svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                </div>
                <h5 class="fw-bold mb-2">Subir Template Excel</h5>
                <p class="text-muted small mb-0">Descarga nuestro template, complétalo y súbelo para generar tu rúbrica al instante.</p>
              </div>
            </div>
         </div>
       `;
    }

    if (this.rubricMode === 'template') {
      return `
         <div class="rubric-builder fade-in">
            <div class="d-flex justify-content-between align-items-center mb-4">
              <h5 class="fw-bold m-0"><button class="btn btn-sm btn-light me-2" id="btn-mode-back">←</button> Usar Template</h5>
            </div>
            <div class="card p-4 shadow-sm text-center bg-light">
              <div class="mb-4">
                <svg width="48" height="48" fill="none" stroke="#6c757d" stroke-width="1.5" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="16" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
              </div>
              <h6 class="fw-bold">Sube tu archivo .xlsx</h6>
              <p class="text-muted small mb-4">Descarga el template, complétalo y arrástralo aquí.</p>
              <div class="d-flex justify-content-center gap-3">
                <button class="btn btn-outline-primary" type="button" id="btn-download-tpl">Descargar Template (.xlsx)</button>
                <button class="btn btn-primary" type="button">Seleccionar Archivo</button>
              </div>
            </div>
         </div>
       `;
    }

    // Platform mode
    this._recalculateWeights();
    const totalW = this._getTotalWeight();
    const isWeightOk = Math.abs(totalW - 100) < 0.1;
    const compCriteria = this.rubricAreas.reduce((s, a) => s + a.criteria.length, 0);

    return `
       <div class="rubric-builder fade-in">
          <div class="d-flex justify-content-between align-items-center mb-4">
            <h5 class="fw-bold m-0"><button class="btn btn-sm btn-light me-2 cursor-pointer" id="btn-mode-back">←</button> Modelar Rúbrica</h5>
            <div class="d-flex align-items-center gap-3">
               <div class="text-end">
                 <div class="text-muted" style="font-size:0.75rem; text-transform:uppercase; font-weight:700;">PESO TOTAL</div>
                 <div class="fw-bold ${isWeightOk ? 'text-success' : 'text-primary'}">${totalW}% / 100%</div>
               </div>
               <div class="progress" style="width: 150px; height: 8px; border-radius: 4px;">
                 <div class="progress-bar ${isWeightOk ? 'bg-success' : 'bg-primary'}" role="progressbar" style="width: ${Math.min(totalW, 100)}%;"></div>
               </div>
            </div>
          </div>

          <div class="row mb-4">
            <div class="col-12">
               <div class="bg-light p-3 rounded d-flex justify-content-between align-items-center border">
                  <div>
                    <span class="text-muted small fw-bold text-uppercase d-block mb-1">Progreso de Rúbrica</span>
                    <span class="badge bg-white text-dark border me-2">Áreas: 3</span>
                    <span class="badge bg-white text-dark border me-2">Criterios: ${compCriteria}</span>
                  </div>
                  ${!isWeightOk ? `
                    <div class="text-warning small fw-semibold d-flex align-items-center gap-1">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                      El peso total debe ser 100%
                    </div>
                  ` : `
                     <div class="text-success small fw-semibold d-flex align-items-center gap-1">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                      Peso asignado correctamente
                    </div>
                  `}
               </div>
            </div>
          </div>

          <div class="rubric-areas">
            ${this.rubricAreas.map(area => this._renderAreaItem(area)).join('')}
          </div>
       </div>
     `;
  }

  _renderAreaItem(area) {
    const hasCrit = area.criteria.length > 0;
    const badgeColor = AREA_COLOR[area.type] || '#6c63ff';
    return `
        <div class="card shadow-sm mb-3 rubric-area-card" style="border-left: 4px solid ${badgeColor}; border-radius: 8px; overflow:hidden;">
           <div class="card-header bg-white border-0 d-flex justify-content-between align-items-center py-3">
              <div class="d-flex align-items-center gap-3 cursor-pointer area-toggle-btn" data-area="${area.id}">
                 <div class="text-muted">
                    <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="${area.isExpanded ? '6 9 12 15 18 9' : '9 18 15 12 9 6'}"/></svg>
                 </div>
                 <div>
                   <h6 class="mb-0 fw-bold">${area.title}</h6>
                 </div>
              </div>
              <div class="d-flex align-items-center gap-3">
                 <span class="badge bg-light text-dark border">PESO: ${area.weight}%</span>
              </div>
           </div>
           
           ${area.isExpanded ? `
             <div class="card-body bg-light border-top">
                ${!hasCrit ? `
                   <div class="text-center py-3">
                     <p class="text-muted small mb-0">Comienza agregando tu primer criterio de evaluación.</p>
                   </div>
                ` : `
                   <div class="criteria-list">
                      ${area.criteria.map(crit => this._renderCriteriaItem(area, crit)).join('')}
                   </div>
                `}
                <div class="mt-3">
                  <button class="btn btn-outline-primary btn-sm btn-add-criteria" data-area="${area.id}">
                    <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    Nuevo Criterio
                  </button>
                </div>
             </div>
           ` : ''}
        </div>
     `;
  }

  _renderCriteriaItem(area, crit) {
    return `
         <div class="card shadow-sm border mb-3 criteria-card">
            <div class="card-body p-3">
                <div class="d-flex justify-content-between align-items-start mb-3">
                   <div class="d-flex gap-2 flex-grow-1 min-w-0">
                      <div class="text-muted mt-1 cursor-grab">
                        <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="9" cy="12" r="1"/><circle cx="9" cy="5" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="19" r="1"/></svg>
                      </div>
                      <div class="flex-grow-1 pe-3">
                        <input type="text" id="name-${crit.id}" class="form-control form-control-sm fw-bold border-0 bg-transparent px-1 crit-input" placeholder="Nombre del criterio" value="${crit.name}">
                        <input type="text" id="desc-${crit.id}" class="form-control form-control-sm border-0 bg-transparent px-1 text-muted crit-input mt-1" placeholder="Descripción opcional" value="${crit.description}">
                      </div>
                   </div>
                   <div class="d-flex gap-2 align-items-center">
                      <div class="input-group input-group-sm" style="width: 100px;">
                        <input type="number" id="weight-${crit.id}" class="form-control crit-input text-end" placeholder="0" value="${crit.weight}">
                        <span class="input-group-text bg-white">%</span>
                      </div>
                      <button class="btn btn-sm btn-light text-danger btn-rm-crit" data-area="${area.id}" data-crit="${crit.id}">
                        <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                      </button>
                   </div>
                </div>

                <div class="levels-container mt-3">
                   <div class="row g-2">
                     ${crit.levels.map((lvl, index) => `
                        <div class="col-md-4">
                           <div class="level-card h-100 p-2 border rounded" style="border-top: 3px solid ${lvl.color} !important; background: white;">
                              <div class="d-flex justify-content-between align-items-center mb-2">
                                 <span class="badge" style="background-color: ${lvl.color}15; color: ${lvl.color}; font-size: 0.7rem;">NIVEL ${index + 1} - ${lvl.score}%</span>
                                 <button class="btn btn-sm p-0 text-muted btn-rm-lvl" data-area="${area.id}" data-crit="${crit.id}" data-index="${index}">
                                    <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                                 </button>
                              </div>
                              <input type="text" class="form-control form-control-sm fw-bold border-0 px-1 mb-1 lvl-input" data-area="${area.id}" data-crit="${crit.id}" data-index="${index}" data-field="name" value="${lvl.name}" placeholder="Nombre del Nivel">
                              <textarea class="form-control form-control-sm border-0 px-1 text-muted lvl-input" data-area="${area.id}" data-crit="${crit.id}" data-index="${index}" data-field="description" placeholder="Desempeño esperado..." rows="2">${lvl.description}</textarea>
                              <div class="mt-2 d-flex align-items-center gap-2">
                                 <label class="small text-muted mb-0">Pts %:</label>
                                 <input type="number" class="form-control form-control-sm px-1 lvl-input" style="width: 50px;" data-area="${area.id}" data-crit="${crit.id}" data-index="${index}" data-field="score" value="${lvl.score}">
                                 <input type="color" class="form-control form-control-color form-control-sm p-0 border-0 ms-auto lvl-input" style="width:20px;height:20px;" data-area="${area.id}" data-crit="${crit.id}" data-index="${index}" data-field="color" value="${lvl.color}">
                              </div>
                           </div>
                        </div>
                     `).join('')}
                     <div class="col-md-12 mt-2">
                        <button class="btn btn-sm btn-light w-100 border border-dashed text-primary btn-add-lvl" data-area="${area.id}" data-crit="${crit.id}">
                          + Agregar Nivel
                        </button>
                     </div>
                   </div>
                </div>
            </div>
         </div>
      `;
  }

  _attachRubricHandlers() {
    const saveInputs = () => {
      document.querySelectorAll('.crit-input').forEach(el => {
        const id = el.id.split('-')[1];
        const field = el.id.split('-')[0];
        this.rubricAreas.forEach(a => {
          const c = a.criteria.find(crit => crit.id === id);
          if (c) {
            if (field === 'weight') c.weight = parseFloat(el.value) || 0;
            if (field === 'name') c.name = el.value;
            if (field === 'desc') c.description = el.value;
          }
        });
      });
      document.querySelectorAll('.lvl-input').forEach(el => {
        const aId = el.dataset.area;
        const cId = el.dataset.crit;
        const index = parseInt(el.dataset.index);
        const field = el.dataset.field;
        const a = this.rubricAreas.find(area => area.id === aId);
        if (a) {
          const c = a.criteria.find(crit => crit.id === cId);
          if (c && c.levels[index]) {
            if (field === 'score') c.levels[index].score = parseFloat(el.value) || 0;
            if (field === 'name') c.levels[index].name = el.value;
            if (field === 'description') c.levels[index].description = el.value;
            if (field === 'color') c.levels[index].color = el.value;
          }
        }
      });
    };

    document.getElementById('btn-mode-platform')?.addEventListener('click', () => {
      this.rubricMode = 'platform';
      this._rerenderRubricSection();
    });

    document.getElementById('btn-mode-template')?.addEventListener('click', () => {
      this.rubricMode = 'template';
      this._rerenderRubricSection();
    });

    document.getElementById('btn-download-tpl')?.addEventListener('click', () => {
      this._downloadTemplate();
    });

    document.getElementById('btn-mode-back')?.addEventListener('click', () => {
      this.rubricMode = null;
      this._rerenderRubricSection();
    });

    document.querySelectorAll('.area-toggle-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        saveInputs();
        const a = this.rubricAreas.find(area => area.id === btn.dataset.area);
        if (a) {
          a.isExpanded = !a.isExpanded;
          this._rerenderRubricSection();
        }
      });
    });

    document.querySelectorAll('.btn-add-criteria').forEach(btn => {
      btn.addEventListener('click', () => {
        saveInputs();
        this._addCriteria(btn.dataset.area);
      });
    });

    document.querySelectorAll('.btn-rm-crit').forEach(btn => {
      btn.addEventListener('click', () => {
        saveInputs();
        this._removeCriteria(btn.dataset.area, btn.dataset.crit);
      });
    });

    document.querySelectorAll('.btn-add-lvl').forEach(btn => {
      btn.addEventListener('click', () => {
        saveInputs();
        this._addLevel(btn.dataset.area, btn.dataset.crit);
      });
    });

    document.querySelectorAll('.btn-rm-lvl').forEach(btn => {
      btn.addEventListener('click', () => {
        saveInputs();
        this._removeLevel(btn.dataset.area, btn.dataset.crit, parseInt(btn.dataset.index));
      });
    });

    document.querySelectorAll('.crit-input[id^="weight-"]').forEach(input => {
      input.addEventListener('change', () => {
        saveInputs();
        this._rerenderRubricSection();
      });
    });

    document.querySelectorAll('.lvl-input[data-field="color"]').forEach(input => {
      input.addEventListener('change', () => {
        saveInputs();
        this._rerenderRubricSection();
      });
    });

    document.querySelectorAll('.lvl-input[data-field="score"]').forEach(input => {
      input.addEventListener('change', () => {
        saveInputs();
        this._rerenderRubricSection();
      });
    });
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  async render() {
    const app = document.getElementById("app");
    app.innerHTML = `
      ${this.navbar.render()}
      <div class="container p-0">
        ${this.header.render()}
        <main class="dashboard-main pb-5">
          <div class="ce-page">
            <!-- Event details card -->
            <section class="app-section p-4 p-md-5 mb-4 border-0 shadow-sm" style="border-radius: 12px; background: white;">
              <div class="d-flex justify-content-between align-items-center mb-4">
                <h5 class="fw-bold mb-0">Detalles del Evento</h5>
                <span class="badge bg-light text-dark border px-3 py-2 rounded-pill">Draft Mode</span>
              </div>

              <div class="row g-4">
                <div class="col-12">
                  <label class="form-label fw-semibold text-muted small text-uppercase">Título *</label>
                  <input id="ev-title" type="text" class="form-control form-control-lg app-input" placeholder="Ej: Integrador 2025-1" />
                </div>
                <div class="col-12">
                  <label class="form-label fw-semibold text-muted small text-uppercase">Descripción</label>
                  <textarea id="ev-description" rows="3" class="form-control app-input" placeholder="Describe el evento…"></textarea>
                </div>
                
                <div class="col-12 col-md-4">
                  <label class="form-label fw-semibold text-muted small text-uppercase">Tipo</label>
                  <select id="ev-type" class="form-select app-input">
                    <option value="CAPSTONE">Capstone / Integrador</option>
                    <option value="WORKSHOP">Workshop</option>
                    <option value="EVENT">Evento Social</option>
                  </select>
                </div>
                <div class="col-12 col-md-4">
                  <label class="form-label fw-semibold text-muted small text-uppercase">Ruta</label>
                  <select id="ev-route" class="form-select app-input">
                    <option value="BASIC">Basic</option>
                    <option value="ADVANCED">Advanced</option>
                  </select>
                </div>
                <div class="col-12 col-md-4">
                  <label class="form-label fw-semibold text-muted small text-uppercase">Cohorte</label>
                  <input id="ev-cohort" type="text" class="form-control app-input" placeholder="Ej: 2025-1" />
                </div>
                <div class="col-12 col-md-4">
                  <label class="form-label fw-semibold text-muted small text-uppercase">Fecha inicio *</label>
                  <input id="ev-start-date" type="date" class="form-control app-input" />
                </div>
                <div class="col-12 col-md-4">
                  <label class="form-label fw-semibold text-muted small text-uppercase">Fecha entrega final</label>
                  <input id="ev-end-date" type="date" class="form-control app-input" />
                </div>
                <div class="col-12 col-md-4">
                  <label class="form-label fw-semibold text-muted small text-uppercase">Tamaño máximo de equipo</label>
                  <input id="ev-max-team" type="number" class="form-control app-input" value="5" min="1" max="20" />
                </div>
                <div class="col-12" id="github-org-section">
                  <label class="form-label fw-semibold text-muted small text-uppercase">Organización de GitHub <span class="text-danger">*</span></label>
                  <div id="github-org-picker">
                    <div class="d-flex align-items-center gap-2 text-muted" style="font-size:0.9rem;">
                      <span class="spinner-border spinner-border-sm"></span> Verificando GitHub...
                    </div>
                  </div>
                </div>
                <div class="col-12">
                  ${this._renderClanSection()}
                </div>
              </div>
            </section>

            <!-- Rubrics section UX/UI Redesign -->
            <section class="app-section p-4 p-md-5 mb-4 border-0 shadow-sm" style="border-radius: 12px; background: white;">
              <div id="ce-rubrics-container">
                 ${this._renderRubricState()}
              </div>
            </section>

            <!-- Submit row -->
            <div class="d-flex justify-content-end gap-3 mt-4">
              <button id="ce-back-btn" class="btn btn-light px-4 py-2 bg-white border fw-semibold cursor-pointer" type="button">Cancelar</button>
              <button id="ce-submit-btn" class="btn btn-primary px-5 py-2 fw-semibold cursor-pointer" type="button" style="background:#5548e2;border:none;">
                Crear Evento
              </button>
            </div>
          </div>
        </main>
      </div>
    `;

    this.header.mountBreadcrumb?.();
    this.header.attachEventHandlers?.();
    this.navbar.attachEventHandlers();

    // Setup listeners
    document.getElementById("ce-submit-btn")?.addEventListener("click", () => this._handleSubmit());
    document.getElementById("ce-back-btn")?.addEventListener("click", () => this.router.navigate("events"));
    this._attachClanHandlers();

    // Defer rubric handler binding to ensure DOM is ready
    setTimeout(() => {
      this._attachRubricHandlers();
    }, 0);

    this._loadGithubOrgs();
  }

  // ── GitHub org loader ─────────────────────────────────────────────────────

  async _loadGithubOrgs() {
    const picker = document.getElementById("github-org-picker");
    const submitBtn = document.getElementById("ce-submit-btn");
    if (!picker) return;

    try {
      const data = await getGithubOrgs();
      this.githubConnected = true;
      this.githubUsername = data.username;
      this.githubOrgs = data.orgs ?? [];

      if (this.githubOrgs.length === 0) {
        picker.innerHTML = `
          <div class="alert alert-warning py-2 mb-0" style="font-size:0.88rem;">
            <strong>@${data.username}</strong> no pertenece a ninguna organización de GitHub.
            Los repositorios se crearán en tu cuenta personal.
          </div>
          <input type="hidden" id="ev-github-org" value="" />`;
        return;
      }

      this.selectedGithubOrg = this.githubOrgs[0].login;
      picker.innerHTML = `
        <div class="d-flex align-items-center gap-2 mb-2" style="font-size:0.85rem;color:var(--color-text-muted);">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
          Conectado como <strong>@${data.username}</strong>
        </div>
        <select id="ev-github-org" class="form-select app-input">
          ${this.githubOrgs.map((org) => `<option value="${org.login}">${org.login}</option>`).join("")}
        </select>
        <div class="mt-1" style="font-size:0.8rem;color:var(--color-text-muted);">
          Los repositorios de los equipos se crearán en esta organización.
        </div>`;

      document.getElementById("ev-github-org")?.addEventListener("change", (e) => {
        this.selectedGithubOrg = e.target.value;
      });
    } catch (err) {
      this.githubConnected = false;
      this.githubOrgs = [];
      let authUrl = "#";
      try {
        const urlData = await getGithubAuthUrl();
        authUrl = urlData?.url ?? urlData ?? "#";
      } catch (_) { }

      toast.warning('GitHub required', 'You must connect your GitHub account to create an event.');

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.title = "Conecta GitHub primero";
      }
    }
  }

  // ── Utils ───────────────────────────────────────────────────────────────────

  _setLoading(on) {
    const btn = document.getElementById("ce-submit-btn");
    if (!btn) return;
    btn.disabled = on;
    btn.innerHTML = on
      ? `<span class="spinner-border spinner-border-sm me-2"></span> Creando…`
      : "Crear Evento";
  }

  _clearFeedback() { }
  _showError(msg) { toast.error('Error', msg); }
  _showSuccess(msg) { toast.success('Éxito', msg); }
}
