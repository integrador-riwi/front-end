import "../assets/styles/dashboard.css";
import { t, onLangChange } from "../utils/i18n.js";
import "../assets/styles/components.css";
import "../assets/styles/eventCreated.css";
import "../assets/styles/rubricBuilder.css";
import Navbar from "../components/navbar/navbar.js";
import Header from "../components/header/header-config.js";
import { getUser } from "../utils/auth.js";
import { apiFetch, getGithubOrgs, getGithubAuthUrl } from "../services/api.js";
import { toast } from "../components/Toast/index.js";
import * as XLSX from "xlsx";

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
  INACTIVE: "#d1d5db",
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
      {
        id: "dev",
        type: "DEVELOPMENT",
        title: AREA_LABELS["DEVELOPMENT"],
        weight: 0,
        criteria: [],
        isExpanded: true,
      },
      {
        id: "soft",
        type: "SOFT_SKILLS",
        title: AREA_LABELS["SOFT_SKILLS"],
        weight: 0,
        criteria: [],
        isExpanded: false,
      },
      {
        id: "eng",
        type: "ENGLISH",
        title: AREA_LABELS["ENGLISH"],
        weight: 0,
        criteria: [],
        isExpanded: false,
      },
    ];
  }

  // ── Event Data ──────────────────────────────────────────────────────────────

  _getEventData() {
    return {
      title: document.getElementById("ev-title")?.value?.trim() ?? "",
      description:
          document.getElementById("ev-description")?.value?.trim() ?? "",
      eventType: document.getElementById("ev-type")?.value ?? "CAPSTONE",
      route: document.getElementById("ev-route")?.value ?? "BASIC",
      githubOrg:
          document.getElementById("ev-github-org")?.value?.trim() ||
          this.selectedGithubOrg ||
          null,
      maxTeamSize: parseInt(
          document.getElementById("ev-max-team")?.value ?? "5",
      ),
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
      summary.textContent = t("createEvent.allClans") ?? "All clans";
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
        ${t("createEvent.allClans")}
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
        <label class="form-label fw-semibold">${t("createEvent.participatingClans")}</label>
        <p class="ce-section-subtitle" style="margin-bottom: 10px;">
          Select the clans that will see this event, or leave it as "${t("createEvent.allClans") ?? "All clans"}".
        </p>
        <div class="ce-clan-picker" id="clan-picker-body">
          ${this._renderClanPickerBody()}
        </div>
        <div class="ce-clan-footer">
          <span>Scope: </span>
          <span id="clan-summary" class="ce-clan-summary ce-clan-summary--all">${t("createEvent.allClans") ?? "All clans"}</span>
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
    if (this.rubricMode !== "platform") return payload;

    for (const area of this.rubricAreas) {
      for (const crit of area.criteria) {
        payload.push({
          area: area.type,
          name: crit.name || t("createEvent.untitledCriteria"),
          description: crit.description || null,
          weight: crit.weight / 100, // convert percentage to 0-1
          grades: crit.levels.map((l) => ({
            score: l.score,
            description: l.description,
            name: l.name,
          })),
        });
      }
    }
    return payload;
  }

  // ── Validation ─────────────────────────────────────────────────────────────

  _validate() {
    const ev = this._getEventData();
    if (!ev.title)
      return t("createEvent.validTitle") ?? "Event title is required.";
    if (!ev.eventDate)
      return t("createEvent.validDate") ?? "Start date is required.";

    if (this.rubricMode === "platform") {
      this._recalculateWeights();
      let totalWeight = this._getTotalWeight();
      for (const a of this.rubricAreas) {
        for (const c of a.criteria) {
          if (!c.name?.trim()) return `A criteria for ${a.title} has no name.`;
          if (!c.description?.trim())
            return `The criteria "${c.name}" requires a description.`;
          if (c.levels.length === 0)
            return `The criteria "${c.name}" has no performance levels.`;

          for (let i = 0; i < c.levels.length; i++) {
            if (!c.levels[i].description?.trim()) {
              return `Level ${i + 1} description is missing for criteria "${c.name}".`;
            }
          }
        }
      }
      if (Math.abs(totalWeight - 100) > 0.1 && totalWeight > 0) {
        return `Total rubric weight is ${totalWeight}%. It must be exactly 100%.`;
      }
      if (totalWeight === 0) {
        return `You must define at least one criteria with weight greater than 0%.`;
      }
    } else if (this.rubricMode === "template" && !this.templateFile) {
      return `Please upload a template file.`;
    }

    return null;
  }

  // ── Submit ─────────────────────────────────────────────────────────────────

  async _handleSubmit() {
    const err = this._validate();
    if (err) {
      toast.error(t("createEvent.validationError"), err);
      return;
    }

    this._setLoading(true);
    try {
      const body = {
        ...this._getEventData(),
        rubrics:
            this.rubricMode === "platform" ? this._buildRubricsPayload() : [],
      };
      await apiFetch("/events", { method: "POST", body });
      toast.success(
          t("createEvent.successTitle") ?? "Event Created!",
          t("createEvent.successMsg") ??
          "The event has been created successfully.",
      );
      setTimeout(() => this.router.navigate("events"), 1600);
    } catch (e) {
      toast.error(
          t("common.errorTitle"),
          e.message ?? t("createEvent.errorCreating"),
      );
    } finally {
      this._setLoading(false);
    }
  }

  _generateId() {
    return Math.random().toString(36).substr(2, 9);
  }

  _rerenderRubricSection() {
    const container = document.getElementById("ce-rubrics-container");
    if (container) {
      container.innerHTML = this._renderRubricState();
      this._attachRubricHandlers();
    }
  }

  // ── Template Download ──────────────────────────────────────────────────────

  _downloadTemplate() {
    const link = document.createElement("a");
    link.href = "/plantilla_rubrica.xlsx";
    link.download = "plantilla_rubrica.xlsx";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success(
        "Descarga iniciada",
        "La plantilla se descargó correctamente.",
    );
  }

  _addCriteria(areaId) {
    const area = this.rubricAreas.find((a) => a.id === areaId);
    if (area) {
      area.criteria.push({
        id: this._generateId(),
        name: "",
        description: "",
        weight: 0,
        isExpanded: true,
        levels: [
          {
            score: 0,
            name: "Insatisfactorio",
            description: "",
            color: "#ff4d4f",
          },
          {
            score: 25,
            name: "Necesitas Mejorar",
            description: "",
            color: "#ff7a45",
          },
          { score: 50, name: "Bueno", description: "", color: "#faad14" },
          {
            score: 75,
            name: "Satisfactorio",
            description: "",
            color: "#7cb305",
          },
          { score: 100, name: "Excelente", description: "", color: "#52c41a" },
        ],
      });
      area.isExpanded = true;
      this._recalculateWeights();
      this._rerenderRubricSection();
    }
  }

  _removeCriteria(areaId, critId) {
    const area = this.rubricAreas.find((a) => a.id === areaId);
    if (area) {
      area.criteria = area.criteria.filter((c) => c.id !== critId);
      this._recalculateWeights();
      this._rerenderRubricSection();
    }
  }

  _addLevel(areaId, critId) {
    const area = this.rubricAreas.find((a) => a.id === areaId);
    if (area) {
      const crit = area.criteria.find((c) => c.id === critId);
      if (crit) {
        crit.levels.push({
          score: 0,
          name: "New Level",
          description: "",
          color: "#1890ff",
        });
        this._rerenderRubricSection();
      }
    }
  }

  _removeLevel(areaId, critId, levelIndex) {
    const area = this.rubricAreas.find((a) => a.id === areaId);
    if (area) {
      const crit = area.criteria.find((c) => c.id === critId);
      if (crit) {
        crit.levels.splice(levelIndex, 1);
        this._rerenderRubricSection();
      }
    }
  }

  _handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        let sheetData = [];

        for (const sn of workbook.SheetNames) {
          const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sn], {
            header: 1,
            defval: "",
          });
          for (let i = 0; i < Math.min(rows.length, 15); i++) {
            const row = rows[i].map((c) =>
                String(c || "")
                    .trim()
                    .toLowerCase(),
            );
            if (row.includes("area") && row.includes("criterio")) {
              this._parseExcelRubric(row, rows.slice(i + 1));
              return;
            }
          }
        }
        toast.error(
            "Format Error",
            "Could not find 'Area' and 'Criterio' columns.",
        );
      } catch (err) {
        toast.error("Import Error", "Failed to process file.");
      }
    };
    reader.readAsArrayBuffer(file);
  }

  _parseExcelRubric(headerRow, rows) {
    const colIdx = (key) => headerRow.indexOf(key.toLowerCase());
    const requiredCols = [
      "area",
      "criterio",
      "descripcion_criterio",
      "peso_criterio",
      "insatisfactorio",
      "necesitas_mejorar",
      "bueno",
      "satisfactorio",
      "excelente",
    ];

    // Check for missing columns
    const missingCols = requiredCols.filter((c) => colIdx(c) === -1);
    if (missingCols.length > 0) {
      toast.error("Format Error", `Missing columns: ${missingCols.join(", ")}`);
      return;
    }

    const idxArea = colIdx("area");
    const idxName = colIdx("criterio");
    const idxDesc = colIdx("descripcion_criterio");
    const idxWeight = colIdx("peso_criterio");
    const idxL1 = colIdx("insatisfactorio");
    const idxL2 = colIdx("necesitas_mejorar");
    const idxL3 = colIdx("bueno");
    const idxL4 = colIdx("satisfactorio");
    const idxL5 = colIdx("excelente");

    let totalWeight = 0;
    const errors = [];
    const newCriteria = [];

    rows.forEach((row, rowIndex) => {
      const areaVal = String(row[idxArea] || "").trim();
      const name = String(row[idxName] || "").trim();
      const desc = String(row[idxDesc] || "").trim();
      const weight = parseFloat(row[idxWeight]) || 0;

      if (!areaVal && !name) return; // Skip empty rows

      const areaType = this._mapArea(areaVal);
      const rowNum = rowIndex + 2; // +1 for header, +1 for 1-based index

      if (!name) errors.push(`Row ${rowNum}: Missing 'Criterio' name.`);
      if (!desc) errors.push(`Row ${rowNum}: Missing 'Descripcion_Criterio'.`);

      const levels = [
        {
          score: 0,
          name: "Insatisfactorio",
          description: String(row[idxL1] || "").trim(),
          color: "#ff4d4f",
        },
        {
          score: 25,
          name: "Necesitas Mejorar",
          description: String(row[idxL2] || "").trim(),
          color: "#ff7a45",
        },
        {
          score: 50,
          name: "Bueno",
          description: String(row[idxL3] || "").trim(),
          color: "#faad14",
        },
        {
          score: 75,
          name: "Satisfactorio",
          description: String(row[idxL4] || "").trim(),
          color: "#7cb305",
        },
        {
          score: 100,
          name: "Excelente",
          description: String(row[idxL5] || "").trim(),
          color: "#52c41a",
        },
      ];

      levels.forEach((lvl) => {
        if (!lvl.description)
          errors.push(
              `Row ${rowNum}: Missing description for level '${lvl.name}'.`,
          );
      });

      totalWeight += weight;
      newCriteria.push({
        areaType,
        data: {
          id: this._generateId(),
          name,
          description: desc,
          weight,
          isExpanded: false,
          levels,
        },
      });
    });

    if (errors.length > 0) {
      toast.error(
          "Validation Failed",
          errors.slice(0, 3).join("<br>") +
          (errors.length > 3
              ? `<br>...and ${errors.length - 3} more errors.`
              : ""),
      );
      return;
    }

    if (Math.abs(totalWeight - 100) > 0.1) {
      toast.error(
          "Weight Error",
          `Total weight in Excel is ${totalWeight}%. It must be exactly 100%.`,
      );
      return;
    }

    // Reset and Populate
    this.rubricAreas.forEach((a) => {
      a.criteria = [];
      a.weight = 0;
    });
    newCriteria.forEach((item) => {
      const area = this.rubricAreas.find((a) => a.type === item.areaType);
      if (area) area.criteria.push(item.data);
    });

    this.rubricMode = "platform";
    this._recalculateWeights();
    this._rerenderRubricSection();
    toast.success(
        "Import Successful",
        `Processed ${newCriteria.length} criteria successfully.`,
    );
  }

  _mapArea(val) {
    const v = val.toUpperCase();
    if (v.includes("DEV") || v.includes("DESARROLLO")) return "DEVELOPMENT";
    if (v.includes("SOFT") || v.includes("HABILIDADES")) return "SOFT_SKILLS";
    if (v.includes("ENGLISH") || v.includes("INGLES")) return "ENGLISH";
    return "DEVELOPMENT";
  }

  _recalculateWeights() {
    this.rubricAreas.forEach((area) => {
      let areaW = 0;
      area.criteria.forEach((crit) => {
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
            <h4 class="fw-bold mb-2">${t("createEvent.createNewRubric")}</h4>
            <p class="text-muted mb-4">Select how you want to build your evaluation framework.</p>
            <div class="d-flex justify-content-center gap-4">
              <div class="rubric-opt-card" id="btn-mode-platform">
                <div class="rubric-opt-icon flex-center bg-primary-soft text-primary mb-3">
                  <svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>
                </div>
                <h5 class="fw-bold mb-2">${t("createEvent.createInPlatform")}</h5>
                <p class="text-muted small mb-0">Build your rubric step by step using our interactive editor.</p>
              </div>
              <div class="rubric-opt-card" id="btn-mode-template">
                <div class="rubric-opt-icon flex-center bg-secondary-soft text-secondary mb-3">
                  <svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                </div>
                <h5 class="fw-bold mb-2">${t("createEvent.uploadExcel")}</h5>
                <p class="text-muted small mb-0">Download our template, complete it and upload it to generate your rubric instantly.</p>
              </div>
            </div>
         </div>
       `;
    }

    if (this.rubricMode === "template") {
      return `
          <div class="rubric-builder fade-in">
            <div class="d-flex justify-content-between align-items-center mb-4">
              <h5 class="fw-bold m-0"><button class="btn btn-sm btn-light me-2" id="btn-mode-back">←</button> ${t("createEvent.useTemplate")}</h5>
            </div>
            <div class="card p-4 shadow-sm text-center bg-light">
              <div class="mb-4">
                <svg width="48" height="48" fill="none" stroke="#6c757d" stroke-width="1.5" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="16" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
              </div>
              <h6 class="fw-bold">Upload your .xlsx file</h6>
              <p class="text-muted small mb-4">Download the template, complete it and drag it here.</p>
              <div class="d-flex justify-content-center gap-3">
                <button class="btn btn-outline-primary" type="button" id="btn-download-tpl">Download Template (.xlsx)</button>
                <label class="btn btn-primary" style="cursor: pointer;">
                  Select File
                  <input type="file" id="excel-upload-input" accept=".xlsx, .xls" style="display: none;">
                </label>
              </div>
            </div>
          </div>
       `;
    }

    // Platform mode
    this._recalculateWeights();
    const totalW = this._getTotalWeight();
    const isWeightOk = Math.abs(totalW - 100) < 0.1;
    const compCriteria = this.rubricAreas.reduce(
        (s, a) => s + a.criteria.length,
        0,
    );

    return `
       <div class="rubric-builder fade-in">
          <div class="d-flex justify-content-between align-items-center mb-4">
            <h5 class="fw-bold m-0"><button class="btn btn-sm btn-light me-2 cursor-pointer" id="btn-mode-back">←</button> ${t("createEvent.modelRubric")}</h5>
            <div class="d-flex align-items-center gap-3">
               <div class="text-end">
                 <div class="text-muted" style="font-size:0.75rem; text-transform:uppercase; font-weight:700;">${t("createEvent.totalWeight")}</div>
                 <div class="fw-bold ${isWeightOk ? "text-success" : "text-primary"}">${totalW}% / 100%</div>
               </div>
               <div class="progress" style="width: 150px; height: 8px; border-radius: 4px;">
                 <div class="progress-bar ${isWeightOk ? "bg-success" : "bg-primary"}" role="progressbar" style="width: ${Math.min(totalW, 100)}%;"></div>
               </div>
            </div>
          </div>

          <div class="row mb-4">
            <div class="col-12">
               <div class="bg-light p-3 rounded d-flex justify-content-between align-items-center border">
                  <div>
                    <span class="text-muted small fw-bold text-uppercase d-block mb-1">${t("createEvent.rubricProgress")}</span>
                    <span class="badge bg-white text-dark border me-2">Areas: 3</span>
                    <span class="badge bg-white text-dark border me-2">Criteria: ${compCriteria}</span>
                  </div>
                  ${
        !isWeightOk
            ? `
                    <div class="text-warning small fw-semibold d-flex align-items-center gap-1">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                      Total weight must be 100%
                    </div>
                  `
            : `
                     <div class="text-success small fw-semibold d-flex align-items-center gap-1">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                      Weight correctly assigned
                    </div>
                  `
    }
               </div>
            </div>
          </div>

          <div class="rubric-areas">
            ${this.rubricAreas.map((area) => this._renderAreaItem(area)).join("")}
          </div>
       </div>
     `;
  }

  _renderAreaItem(area) {
    const hasCrit = area.criteria.length > 0;
    const isActivated = area.weight > 0;
    const badgeColor = isActivated
        ? AREA_COLOR[area.type] || "#6c63ff"
        : AREA_COLOR.INACTIVE;

    return `
        <div class="card shadow-sm mb-3 rubric-area-card ${!isActivated ? "area-inactive" : ""}" style="border-left: 4px solid ${badgeColor}; border-radius: 8px; overflow:hidden;">
           <div class="card-header bg-white border-0 d-flex justify-content-between align-items-center py-3">
              <div class="d-flex align-items-center gap-3 cursor-pointer area-toggle-btn" data-area="${area.id}">
                 <div class="text-muted">
                    <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="${area.isExpanded ? "6 9 12 15 18 9" : "9 18 15 12 9 6"}"/></svg>
                 </div>
                 <div>
                   <h6 class="mb-0 fw-bold" style="${!isActivated ? "color: #8898aa;" : ""}">${area.title} ${!isActivated ? '<span class="ms-2 fw-normal small">(Inactive)</span>' : ""}</h6>
                 </div>
              </div>
              <div class="d-flex align-items-center gap-3">
                 <span class="badge ${isActivated ? "bg-light text-dark" : "bg-transparent text-muted"} border">WEIGHT: ${area.weight}%</span>
              </div>
           </div>
           
           ${
        area.isExpanded
            ? `
             <div class="card-body bg-light border-top">
                ${
                !hasCrit
                    ? `
                   <div class="text-center py-3">
                     <p class="text-muted small mb-0">Start by adding your first evaluation criteria.</p>
                   </div>
                `
                    : `
                   <div class="criteria-list">
                      ${area.criteria.map((crit) => this._renderCriteriaItem(area, crit)).join("")}
                   </div>
                `
            }
                <div class="mt-3">
                  <button class="btn btn-outline-primary btn-sm btn-add-criteria" data-area="${area.id}">
                    <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    New Criteria
                  </button>
                </div>
             </div>
           `
            : ""
    }
        </div>
     `;
  }

  _renderCriteriaItem(area, crit) {
    return `
        <div class="criteria-item p-4 mb-4 border rounded-3 bg-white shadow-sm">
            <div class="d-flex justify-content-between align-items-start mb-4">
                <div class="flex-grow-1 pe-4">
                    <label class="form-label text-muted small fw-bold text-uppercase mb-1" style="font-size: 0.65rem; letter-spacing: 0.05em;">${t("createEvent.critName")} <span class="text-danger">*</span></label>
                    <input type="text" id="name-${crit.id}" class="form-control fw-bold bg-light px-3 py-2 crit-input" style="font-size: 1.1rem; border-radius: 8px; border: 1.5px solid #e2e8f0;" placeholder="${t("createEvent.critName")}" value="${crit.name}">
                    
                    <label class="form-label text-muted small fw-bold text-uppercase mt-3 mb-1" style="font-size: 0.65rem; letter-spacing: 0.05em;">${t("createEvent.critDesc")} <span class="text-danger">*</span></label>
                    <input type="text" id="desc-${crit.id}" class="form-control bg-light px-3 py-2 text-muted crit-input" style="border-radius: 8px; border: 1.5px solid #e2e8f0;" placeholder="${t("createEvent.critDesc")}" value="${crit.description}">
                </div>
                <div class="d-flex flex-column align-items-end gap-2">
                    <label class="form-label text-muted small fw-bold text-uppercase mb-0" style="font-size: 0.65rem; letter-spacing: 0.05em;">${t("createEvent.weight")} <span class="text-danger">*</span></label>
                    <div class="input-group" style="width: 110px;">
                        <input type="number" id="weight-${crit.id}" class="form-control crit-input text-end fw-bold" style="border-radius: 8px 0 0 8px; border: 1.5px solid #e2e8f0; background: #f8fafc;" placeholder="0" value="${crit.weight}">
                        <span class="input-group-text bg-light border" style="border-radius: 0 8px 8px 0; border-color: #e2e8f0; font-weight: 700; color: #64748b;">%</span>
                    </div>
                    <button class="btn btn-sm btn-outline-danger border-0 mt-2 btn-rm-crit" data-area="${area.id}" data-crit="${crit.id}" title="Remove Criteria">
                        <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                        <span class="ms-1 small fw-bold">${t("common.delete") ?? "Delete"}</span>
                    </button>
                </div>
            </div>

            <div class="ce-levels-grid pt-3 border-top">
                ${crit.levels
        .map(
            (lvl, index) => `
                        <div class="level-card h-100 p-3 border rounded-3 bg-light-soft" style="border-top: 4px solid ${lvl.color} !important; transition: all 0.2s ease;">
                            <div class="d-flex justify-content-between align-items-center mb-2">
                                <span class="badge rounded-pill" style="background-color: ${lvl.color}20; color: ${lvl.color}; font-size: 0.65rem; font-weight: 800; letter-spacing: 0.05em; padding: 4px 10px;">
                                    LVL ${index + 1} • ${lvl.score} PTS
                                </span>
                                <input type="color" class="form-control form-control-color p-0 border-0 bg-transparent lvl-input" style="width:20px;height:20px; cursor: pointer;" data-area="${area.id}" data-crit="${crit.id}" data-index="${index}" data-field="color" value="${lvl.color}" title="Customize Color">
                            </div>
                            <input type="text" class="form-control form-control-sm fw-bold bg-white mb-2 lvl-input" style="border-radius: 6px; border: 1.5px solid #e2e8f0; box-shadow: 0 2px 4px rgba(0,0,0,0.02);" data-area="${area.id}" data-crit="${crit.id}" data-index="${index}" data-field="name" value="${lvl.name}" placeholder="${t("createEvent.levelName")}">
                            <label class="text-muted small fw-bold text-uppercase mb-1 mt-2" style="font-size: 0.6rem;">Performance Description <span class="text-danger">*</span></label>
                            <textarea class="form-control form-control-sm bg-white lvl-input" style="border-radius: 6px; border: 1.5px solid #e2e8f0; font-size: 0.8rem; min-height: 80px; resize: none; box-shadow: 0 2px 4px rgba(0,0,0,0.02);" data-area="${area.id}" data-crit="${crit.id}" data-index="${index}" data-field="description" placeholder="${t("createEvent.levelPerf")}" rows="3">${lvl.description}</textarea>
                            <input type="hidden" class="lvl-input" data-area="${area.id}" data-crit="${crit.id}" data-index="${index}" data-field="score" value="${lvl.score}">
                        </div>
                    `,
        )
        .join("")}
            </div>
        </div>
    `;
  }

  _attachRubricHandlers() {
    const saveInputs = () => {
      document.querySelectorAll(".crit-input").forEach((el) => {
        const id = el.id.split("-")[1];
        const field = el.id.split("-")[0];
        this.rubricAreas.forEach((a) => {
          const c = a.criteria.find((crit) => crit.id === id);
          if (c) {
            if (field === "weight") c.weight = parseFloat(el.value) || 0;
            if (field === "name") c.name = el.value;
            if (field === "desc") c.description = el.value;
          }
        });
      });
      document.querySelectorAll(".lvl-input").forEach((el) => {
        const aId = el.dataset.area;
        const cId = el.dataset.crit;
        const index = parseInt(el.dataset.index);
        const field = el.dataset.field;
        const a = this.rubricAreas.find((area) => area.id === aId);
        if (a) {
          const c = a.criteria.find((crit) => crit.id === cId);
          if (c && c.levels[index]) {
            if (field === "score")
              c.levels[index].score = parseFloat(el.value) || 0;
            if (field === "name") c.levels[index].name = el.value;
            if (field === "description") c.levels[index].description = el.value;
            if (field === "color") c.levels[index].color = el.value;
          }
        }
      });
    };

    document
        .getElementById("btn-mode-platform")
        ?.addEventListener("click", () => {
          this.rubricMode = "platform";
          this._rerenderRubricSection();
        });

    document
        .getElementById("btn-mode-template")
        ?.addEventListener("click", () => {
          this.rubricMode = "template";
          this._rerenderRubricSection();
        });

    document
        .getElementById("btn-download-tpl")
        ?.addEventListener("click", () => {
          this._downloadTemplate();
        });

    document.getElementById("btn-mode-back")?.addEventListener("click", () => {
      this.rubricMode = null;
      this._rerenderRubricSection();
    });

    document
        .getElementById("excel-upload-input")
        ?.addEventListener("change", (e) => {
          this._handleFileUpload(e);
        });

    document.querySelectorAll(".area-toggle-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        saveInputs();
        const a = this.rubricAreas.find((area) => area.id === btn.dataset.area);
        if (a) {
          a.isExpanded = !a.isExpanded;
          this._rerenderRubricSection();
        }
      });
    });

    document.querySelectorAll(".btn-add-criteria").forEach((btn) => {
      btn.addEventListener("click", () => {
        saveInputs();
        this._addCriteria(btn.dataset.area);
      });
    });

    document.querySelectorAll(".btn-rm-crit").forEach((btn) => {
      btn.addEventListener("click", () => {
        saveInputs();
        this._removeCriteria(btn.dataset.area, btn.dataset.crit);
      });
    });

    document.querySelectorAll('.crit-input[id^="weight-"]').forEach((input) => {
      input.addEventListener("change", () => {
        saveInputs();
        this._rerenderRubricSection();
      });
    });

    document
        .querySelectorAll('.lvl-input[data-field="color"]')
        .forEach((input) => {
          input.addEventListener("change", () => {
            saveInputs();
            this._rerenderRubricSection();
          });
        });

    document
        .querySelectorAll('.lvl-input[data-field="score"]')
        .forEach((input) => {
          input.addEventListener("change", () => {
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
      <div class="container p-0 mx-0 mw-100">
        ${this.header.render()}
        <main class="dashboard-main pb-5">
          <div class="ce-page">
            <!-- Event details card -->
            <section class="app-section p-4 p-md-5 mb-4 border-0 shadow-sm" style="border-radius: 12px; background: white;">
              <div class="d-flex justify-content-between align-items-center mb-4">
                <h5 class="fw-bold mb-0">${t("createEvent.title")}</h5>
                <span class="badge bg-light text-dark border px-3 py-2 rounded-pill">${t("createEvent.draftMode")}</span>
              </div>

              <div class="row g-4">
                <div class="col-12">
                  <label class="form-label fw-semibold text-muted small text-uppercase">${t("createEvent.eventTitle")} <span class="text-danger">*</span></label>
                  <input id="ev-title" type="text" class="form-control form-control-lg app-input" placeholder="${t("createEvent.placeholderTitle")}" />
                </div>
                <div class="col-12">
                  <label class="form-label fw-semibold text-muted small text-uppercase">${t("createEvent.desc")}</label>
                  <textarea id="ev-description" rows="3" class="form-control app-input" placeholder="${t("createEvent.placeholderDesc")}"></textarea>
                </div>
                
                <div class="col-12 col-md-4">
                  <label class="form-label fw-semibold text-muted small text-uppercase">${t("createEvent.type")}</label>
                  <select id="ev-type" class="form-select app-input">
                    <option value="CAPSTONE">${t("createEvent.capstone")}</option>
                    <option value="WORKSHOP">${t("createEvent.workshop")}</option>
                    <option value="EVENT">${t("createEvent.social") ?? "Social Event"}</option>
                  </select>
                </div>
                <div class="col-12 col-md-4">
                  <label class="form-label fw-semibold text-muted small text-uppercase">${t("createEvent.route")}</label>
                  <select id="ev-route" class="form-select app-input">
                    <option value="BASIC">${t("createEvent.basic")}</option>
                    <option value="ADVANCED">${t("createEvent.advanced")}</option>
                  </select>
                </div>
                <div class="col-12 col-md-4">
                  <label class="form-label fw-semibold text-muted small text-uppercase">${t("createEvent.startDate")} <span class="text-danger">*</span></label>
                  <input id="ev-start-date" type="date" class="form-control app-input" />
                </div>
                <div class="col-12 col-md-4">
                  <label class="form-label fw-semibold text-muted small text-uppercase">${t("createEvent.finalDeliveryDate")}</label>
                  <input id="ev-end-date" type="date" class="form-control app-input" />
                </div>
                <div class="col-12 col-md-4">
                  <label class="form-label fw-semibold text-muted small text-uppercase">${t("createEvent.maxTeamSize")}</label>
                  <input id="ev-max-team" type="number" class="form-control app-input" value="5" min="1" max="20" />
                </div>
                <div class="col-12" id="github-org-section">
                  <label class="form-label fw-semibold text-muted small text-uppercase">${t("createEvent.githubOrganization")} <span class="text-danger">*</span></label>
                  <div id="ce-github-org-picker">
                    <div class="d-flex align-items-center gap-2 text-muted" style="font-size:0.9rem;">
                      <span class="spinner-border spinner-border-sm"></span> ${t("createEvent.verifyingGithub")}
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
              <button id="ce-back-btn" class="btn btn-light px-4 py-2 bg-white border fw-semibold cursor-pointer" type="button">${t("createEvent.cancel")}</button>
              <button id="ce-submit-btn" class="btn btn-primary px-5 py-2 fw-semibold cursor-pointer" type="button" style="background:#5548e2;border:none;">
                ${t("createEvent.createBtn")}
              </button>
            </div>
          </div>
        </main>
      </div>
    `;

    this.header.mountBreadcrumb?.();
    this.header.attachEventHandlers?.();
    this.navbar.attachEventHandlers();
    if (!this._offLangChange) {
      this._offLangChange = onLangChange(() => this.render());
    }

    // Setup listeners
    document
        .getElementById("ce-submit-btn")
        ?.addEventListener("click", () => this._handleSubmit());
    document
        .getElementById("ce-back-btn")
        ?.addEventListener("click", () => this.router.navigate("events"));
    this._attachClanHandlers();

    // Defer rubric handler binding to ensure DOM is ready
    setTimeout(() => {
      this._attachRubricHandlers();
    }, 0);

    this._loadGithubOrgs();
  }

  async _loadGithubOrgs() {
    const picker = document.getElementById("ce-github-org-picker");
    const submitBtn = document.getElementById("ce-submit-btn");
    try {
      const data = await getGithubOrgs();
      this.githubOrgs = data.orgs || [];
      this.githubConnected = true;
      this.githubUsername = data.username;

      if (!picker) return;

      if (this.githubOrgs.length === 0) {
        picker.innerHTML = `<p class="text-danger small">${t("createEvent.noOrgsFound")}</p>`;
        return;
      }

      this.selectedGithubOrg = this.githubOrgs[0].login;
      picker.innerHTML = `
        <div class="d-flex align-items-center gap-2 mb-2" style="font-size:0.85rem;color:var(--color-text-muted);">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
          ${t("createEvent.connectedAs")} <strong>@${data.username}</strong>
        </div>
        <select id="ev-github-org" class="form-select app-input">
          ${this.githubOrgs.map((org) => `<option value="${org.login}">${org.login}</option>`).join("")}
        </select>
        <div class="mt-1" style="font-size:0.8rem;color:var(--color-text-muted);">
          ${t("createEvent.reposWillBeCreated")}
        </div>`;

      document
          .getElementById("ev-github-org")
          ?.addEventListener("change", (e) => {
            this.selectedGithubOrg = e.target.value;
          });
    } catch (err) {
      this.githubConnected = false;
      this.githubOrgs = [];
      let authUrl = "#";
      try {
        const urlData = await getGithubAuthUrl();
        authUrl = urlData?.url ?? urlData ?? "#";
      } catch (_) {}

      toast.warning(
          "GitHub required",
          "You must connect your GitHub account to create an event.",
      );

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.title =
            t("createEvent.connectGithub") ?? "Connect GitHub first";
      }
    }
  }

  _setLoading(on) {
    const btn = document.getElementById("ce-submit-btn");
    if (!btn) return;
    btn.disabled = on;
    btn.innerHTML = on
        ? `<span class="spinner-border spinner-border-sm me-2"></span> ${t("noTeam.creating") ?? "Creating…"}`
        : (t("createEvent.createBtn") ?? "Create Event");
  }

  _clearFeedback() {}
  _showError(msg) {
    toast.error(t("common.errorTitle"), msg);
  }
  _showSuccess(msg) {
    toast.success(t("common.successTitle"), msg);
  }

  destroy() {
    if (this._offLangChange) this._offLangChange();
  }
}
