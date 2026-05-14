// ═══════════════════════════════════════════════════════════════
// Kàddu — Edge Function : shield-analyze-dossier v2 structurée
// Objectif : appeler Anthropic côté serveur + extraire/stocker OCR structuré
// Déployer : supabase functions deploy shield-analyze-dossier
//
// Secrets requis :
//   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
// Optionnel :
//   supabase secrets set ANTHROPIC_MODEL=claude-sonnet-4-5
//   supabase secrets set SUPABASE_SERVICE_ROLE_KEY=eyJ...
// ═══════════════════════════════════════════════════════════════

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type AnalyzeMode = "dossier" | "documents" | "single_document";

type DocumentMeta = {
  key?: string | null;
  name?: string | null;
  url?: string | null;
  path?: string | null;
  type?: string | null;
  typeLabel?: string | null;
};

type DeclaredData = Record<string, unknown>;

type RequestPayload = {
  mode?: AnalyzeMode;
  context?: string;
  systemPrompt?: string;
  maxTokens?: number;
  contentParts?: unknown[];
  dossierId?: string | null;
  locataireId?: string | null;
  locataireEmail?: string | null;
  documentMeta?: DocumentMeta | null;
  documentsMeta?: DocumentMeta[] | null;
  declaredData?: DeclaredData | null;
  saveExtraction?: boolean;
};

type CrossCheck = {
  control_code: string;
  label: string;
  declared_value?: unknown;
  extracted_value?: unknown;
  result: "ok" | "warning" | "ko" | "unknown";
  severity: "low" | "medium" | "high";
  score_impact: number;
  explanation: string;
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json; charset=utf-8" },
  });
}

function cleanModel(raw: string | undefined | null) {
  return raw?.trim() || "claude-sonnet-4-5";
}

function extractTaggedJson(rawText: string, tag: string): { data: unknown | null; text: string } {
  const marker = `${tag}:`;
  const idx = rawText.indexOf(marker);
  if (idx < 0) return { data: null, text: rawText.trim() };

  const after = rawText.slice(idx + marker.length).trim();
  const firstChar = after[0];
  if (!["{", "["].includes(firstChar)) return { data: null, text: rawText.trim() };

  const open = firstChar;
  const close = open === "{" ? "}" : "]";
  let depth = 0;
  let inString = false;
  let escaped = false;
  let end = -1;

  for (let i = 0; i < after.length; i++) {
    const ch = after[i];
    if (escaped) { escaped = false; continue; }
    if (ch === "\\") { escaped = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === open) depth++;
    if (ch === close) depth--;
    if (depth === 0) { end = i + 1; break; }
  }

  if (end < 0) return { data: null, text: rawText.trim() };
  const jsonText = after.slice(0, end);
  try {
    return { data: JSON.parse(jsonText), text: rawText.replace(marker + jsonText, "").trim() };
  } catch {
    return { data: null, text: rawText.trim() };
  }
}

function extractKadduScore(rawText: string) {
  const parsed = extractTaggedJson(rawText, "KADDU_SCORE");
  return { scoreData: parsed.data, displayText: parsed.text };
}

function asString(v: unknown): string {
  return String(v ?? "").trim();
}

function normalizeText(v: unknown): string {
  return asString(v)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function amountNumber(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  const cleaned = asString(v).replace(/[^0-9.,-]/g, "").replace(/,/g, ".");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function closeEnoughName(a: unknown, b: unknown) {
  const na = normalizeText(a);
  const nb = normalizeText(b);
  if (!na || !nb) return false;
  return na === nb || na.includes(nb) || nb.includes(na);
}

function buildCrossChecks(declared: DeclaredData | null | undefined, extraction: Record<string, unknown> | null): CrossCheck[] {
  const checks: CrossCheck[] = [];
  if (!extraction) return checks;
  const d = declared || {};

  const declaredName = [d.nom, d.prenom].filter(Boolean).join(" ") || d.full_name || d.nom_complet;
  const extractedName = [extraction.nom, extraction.prenom].filter(Boolean).join(" ") || extraction.nom_salarie || extraction.titulaire;
  if (declaredName || extractedName) {
    const ok = closeEnoughName(declaredName, extractedName);
    checks.push({
      control_code: "identity_name_match",
      label: "Nom déclaré vs document",
      declared_value: declaredName || null,
      extracted_value: extractedName || null,
      result: ok ? "ok" : "warning",
      severity: ok ? "low" : "medium",
      score_impact: ok ? 0 : -12,
      explanation: ok ? "Le nom paraît cohérent." : "Le nom extrait ne correspond pas clairement au nom déclaré.",
    });
  }

  const declaredBirth = d.date_naissance || d.ddn;
  const extractedBirth = extraction.date_naissance;
  if (declaredBirth || extractedBirth) {
    const ok = normalizeText(declaredBirth) === normalizeText(extractedBirth);
    checks.push({
      control_code: "birthdate_match",
      label: "Date de naissance déclarée vs document",
      declared_value: declaredBirth || null,
      extracted_value: extractedBirth || null,
      result: ok ? "ok" : (declaredBirth && extractedBirth ? "warning" : "unknown"),
      severity: ok ? "low" : "medium",
      score_impact: ok ? 0 : -8,
      explanation: ok ? "La date de naissance concorde." : "Date de naissance absente ou différente entre déclaration et document.",
    });
  }

  const declaredEmployer = d.employeur || d.societe || d.employer;
  const extractedEmployer = extraction.employeur || extraction.emetteur;
  if (declaredEmployer || extractedEmployer) {
    const ok = closeEnoughName(declaredEmployer, extractedEmployer);
    checks.push({
      control_code: "employer_match",
      label: "Employeur déclaré vs justificatif",
      declared_value: declaredEmployer || null,
      extracted_value: extractedEmployer || null,
      result: ok ? "ok" : "warning",
      severity: ok ? "low" : "medium",
      score_impact: ok ? 0 : -10,
      explanation: ok ? "L'employeur est cohérent." : "L'employeur extrait n'est pas clairement aligné avec la déclaration.",
    });
  }

  const declaredIncome = amountNumber(d.revenu_mensuel ?? d.revenu ?? d.income);
  const extractedIncome = amountNumber(extraction.salaire_net ?? extraction.salaire_contractuel ?? extraction.montant ?? extraction.solde_moyen_estime);
  if (declaredIncome || extractedIncome) {
    let result: CrossCheck["result"] = "unknown";
    let severity: CrossCheck["severity"] = "medium";
    let impact = -6;
    let explanation = "Revenu déclaré ou extrait incomplet.";
    if (declaredIncome && extractedIncome) {
      const gap = Math.abs(declaredIncome - extractedIncome) / Math.max(declaredIncome, 1);
      result = gap <= 0.15 ? "ok" : gap <= 0.35 ? "warning" : "ko";
      severity = result === "ok" ? "low" : result === "warning" ? "medium" : "high";
      impact = result === "ok" ? 0 : result === "warning" ? -10 : -20;
      explanation = result === "ok" ? "L'écart revenu est acceptable." : `Écart revenu estimé à ${Math.round(gap * 100)}%.`;
    }
    checks.push({
      control_code: "income_match",
      label: "Revenu déclaré vs justificatif",
      declared_value: declaredIncome,
      extracted_value: extractedIncome,
      result,
      severity,
      score_impact: impact,
      explanation,
    });
  }

  const expiry = asString(extraction.date_expiration);
  if (expiry) {
    const date = new Date(expiry);
    const expired = !Number.isNaN(date.getTime()) && date.getTime() < Date.now();
    checks.push({
      control_code: "document_expiry",
      label: "Validité du document",
      declared_value: null,
      extracted_value: expiry,
      result: expired ? "ko" : "ok",
      severity: expired ? "high" : "low",
      score_impact: expired ? -20 : 0,
      explanation: expired ? "Le document semble expiré." : "La date d'expiration semble valide.",
    });
  }

  const anomalies = Array.isArray(extraction.anomalies) ? extraction.anomalies.filter(Boolean) : [];
  if (anomalies.length) {
    checks.push({
      control_code: "document_anomalies",
      label: "Anomalies documentaires",
      declared_value: null,
      extracted_value: anomalies,
      result: anomalies.length >= 3 ? "ko" : "warning",
      severity: anomalies.length >= 3 ? "high" : "medium",
      score_impact: anomalies.length >= 3 ? -18 : -8,
      explanation: `${anomalies.length} anomalie(s) détectée(s) par l'analyse documentaire.`,
    });
  }

  return checks;
}

async function restInsert(table: string, payload: unknown) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) return { skipped: true, reason: "SUPABASE_SERVICE_ROLE_KEY absent" };

  const res = await fetch(`${supabaseUrl.replace(/\/$/, "")}/rest/v1/${table}`, {
    method: "POST",
    headers: {
      "apikey": serviceKey,
      "Authorization": `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
      "Prefer": "return=representation",
    },
    body: JSON.stringify(payload),
  });

  const text = await res.text();
  let data: unknown = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) throw new Error(`Insert ${table} impossible: ${text}`);
  return { skipped: false, data };
}

async function persistExtraction(args: {
  dossierId?: string | null;
  locataireId?: string | null;
  locataireEmail?: string | null;
  documentMeta?: DocumentMeta | null;
  extraction: Record<string, unknown>;
  rawText: string;
  checks: CrossCheck[];
}) {
  if (!args.dossierId || !args.extraction) return { skipped: true, reason: "dossierId/extraction manquant" };

  const meta = args.documentMeta || {};
  const anomalies = Array.isArray(args.extraction.anomalies) ? args.extraction.anomalies : [];
  const payload = {
    rental_dossier_id: args.dossierId,
    locataire_id: args.locataireId || null,
    locataire_email: args.locataireEmail || null,
    document_key: meta.key || null,
    document_name: meta.name || null,
    document_url: meta.url || null,
    storage_path: meta.path || null,
    type_declared: meta.type || meta.typeLabel || null,
    type_detected: args.extraction.type_document || null,
    extraction: args.extraction,
    anomalies,
    lisibilite: args.extraction.lisibilite || args.extraction.qualite || null,
    confidence_score: amountNumber(args.extraction.confidence ?? args.extraction.confiance) || null,
    raw_summary: args.rawText.slice(0, 5000),
    engine_version: "kaddu-shield-v2-structured",
  };

  const inserted = await restInsert("dossier_document_extractions", payload);
  let extractionId: string | null = null;
  const rows = Array.isArray(inserted.data) ? inserted.data as Record<string, unknown>[] : [];
  if (rows[0]?.id) extractionId = String(rows[0].id);

  if (args.checks.length) {
    const checkRows = args.checks.map((c) => ({
      rental_dossier_id: args.dossierId,
      extraction_id: extractionId,
      control_code: c.control_code,
      label: c.label,
      declared_value: c.declared_value ?? null,
      extracted_value: c.extracted_value ?? null,
      result: c.result,
      severity: c.severity,
      score_impact: c.score_impact,
      explanation: c.explanation,
    }));
    await restInsert("dossier_document_crosschecks", checkRows);
  }

  return { skipped: false, extractionId, checksInserted: args.checks.length };
}

function buildDefaultSystemPrompt() {
  return `Tu es l'assistant de vérification de la plateforme Kàddu, une agence immobilière premium opérant au Sénégal.

Tu aides les conseillers à lire vite, voir clair, et agir avec confiance. Tu restes factuel, non accusatoire, et tu ne remplaces jamais la décision humaine.

FORMAT DE RÉPONSE
## SYNTHÈSE DU DOSSIER
[2-3 phrases neutres et factuelles]

## POINTS DE COHÉRENCE
✓ [élément] — [observation]

## POINTS D'ATTENTION
⚠ [élément] — [observation non accusatoire]

## RECOMMANDATION
[Dossier prêt à instruire / Demander : liste / Appeler pour clarifier : point / Mettre en attente]

## NIVEAU DE VIGILANCE
[Faible / Modéré / Élevé] — [justification courte]

À la toute fin, retourne uniquement ce bloc JSON :
KADDU_SCORE:{"score":[0-100],"identite":[0-20],"revenus":[0-20],"documents":[0-20],"coherence":[0-20],"risque_fraude":[0-20],"decision":"pre_validation|verification_humaine|attente|refus","label":"Profil rassurant|Profil à vérifier|Profil à risque"}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });
  if (req.method !== "POST") return jsonResponse({ error: "Méthode non autorisée. Utilisez POST." }, 405);

  try {
    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) return jsonResponse({ error: "ANTHROPIC_API_KEY manquante dans les secrets Supabase." }, 500);

    const body = await req.json().catch(() => null) as RequestPayload | null;
    if (!body) return jsonResponse({ error: "Body JSON invalide." }, 400);

    const mode: AnalyzeMode = body.mode || "dossier";
    const model = cleanModel(Deno.env.get("ANTHROPIC_MODEL"));
    const maxTokens = Math.min(Math.max(Number(body.maxTokens || 1400), 300), 5000);

    let system = body.systemPrompt || buildDefaultSystemPrompt();
    let userContent: unknown;

    if (mode === "dossier") {
      const context = String(body.context || "").trim();
      if (!context) return jsonResponse({ error: "Contexte dossier vide." }, 400);
      userContent = `Analyse ce dossier locataire :\n\n${context}`;
    } else {
      if (!Array.isArray(body.contentParts) || body.contentParts.length === 0) {
        return jsonResponse({ error: "contentParts requis pour l'analyse documentaire." }, 400);
      }
      userContent = body.contentParts;
      if (!body.systemPrompt) {
        system = "Tu es l'assistant antifraude documentaire de Kàddu. Tu extrais les données en JSON structuré, tu restes factuel et non accusatoire.";
      }
    }

    const anthropicResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({ model, max_tokens: maxTokens, system, messages: [{ role: "user", content: userContent }] }),
    });

    const anthropicJson = await anthropicResponse.json().catch(() => null);
    if (!anthropicResponse.ok) {
      return jsonResponse({
        error: anthropicJson?.error?.message || `Erreur Anthropic ${anthropicResponse.status}`,
        details: anthropicJson,
      }, anthropicResponse.status);
    }

    const rawText = Array.isArray(anthropicJson?.content)
      ? anthropicJson.content.map((c: { text?: string }) => c.text || "").join("")
      : "";

    const { scoreData, displayText } = extractKadduScore(rawText);
    const docParsed = extractTaggedJson(rawText, "KADDU_DOC");
    const docsParsed = extractTaggedJson(rawText, "KADDU_DOCS");
    const checksParsed = extractTaggedJson(rawText, "KADDU_CHECKS");

    let docData = docParsed.data as Record<string, unknown> | null;
    const docsData = Array.isArray(docsParsed.data) ? docsParsed.data as Record<string, unknown>[] : null;
    let checks: CrossCheck[] = [];

    if (Array.isArray(checksParsed.data)) {
      checks = checksParsed.data as CrossCheck[];
    }
    if (docData && checks.length === 0) checks = buildCrossChecks(body.declaredData, docData);

    let persistResult: unknown = null;
    if (body.saveExtraction && mode === "single_document" && docData) {
      persistResult = await persistExtraction({
        dossierId: body.dossierId,
        locataireId: body.locataireId,
        locataireEmail: body.locataireEmail,
        documentMeta: body.documentMeta,
        extraction: docData,
        rawText: docParsed.text || rawText,
        checks,
      }).catch((e) => ({ error: e instanceof Error ? e.message : String(e) }));
    }

    return jsonResponse({
      ok: true,
      mode,
      model,
      rawText,
      displayText,
      scoreData,
      docData,
      docsData,
      checks,
      persistResult,
      usage: anthropicJson?.usage || null,
    });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : "Erreur inconnue." }, 500);
  }
});
