// ═══════════════════════════════════════════════════════════════
// Kàddu — Edge Function : shield-analyze-dossier
// Objectif : appeler Anthropic côté serveur pour le moteur antifraude
// Déployer : supabase functions deploy shield-analyze-dossier
//
// Secrets requis :
//   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
// Optionnel :
//   supabase secrets set ANTHROPIC_MODEL=claude-sonnet-4-5
// ═══════════════════════════════════════════════════════════════

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type AnalyzeMode = "dossier" | "documents" | "single_document";

type RequestPayload = {
  mode?: AnalyzeMode;
  context?: string;
  systemPrompt?: string;
  maxTokens?: number;
  contentParts?: unknown[]; // pour documents/images déjà encodés en base64 depuis le front
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

function cleanModel(raw: string | undefined | null) {
  return raw?.trim() || "claude-sonnet-4-5";
}

function extractKadduScore(rawText: string) {
  const match = rawText.match(/KADDU_SCORE:(\{[\s\S]*?\})/);
  if (!match) return { scoreData: null, displayText: rawText.trim() };

  try {
    return {
      scoreData: JSON.parse(match[1]),
      displayText: rawText.replace(match[0], "").trim(),
    };
  } catch {
    return { scoreData: null, displayText: rawText.trim() };
  }
}

function buildDefaultSystemPrompt() {
  return `Tu es l'assistant de vérification de la plateforme Kàddu, une agence immobilière premium opérant au Sénégal.

Ton rôle est d'analyser les dossiers locatifs soumis par les candidats et d'identifier toute incohérence, anomalie ou élément qui mérite une attention particulière avant qu'un conseiller Kàddu statue.

Tu n'es pas un juge. Tu es un assistant de préparation : tu aides les conseillers à lire vite, voir clair, et agir avec confiance.

Tu travailles dans un contexte africain (Sénégal, diaspora francophone). Tu connais les réalités locales : structures de revenus informels, documents administratifs sénégalais, pratiques locatives dakaroises, profils diaspora.

PÉRIMÈTRE D'ANALYSE
IDENTITÉ — Cohérence entre les pièces, concordance nom/prénom, validité documents
SOLVABILITÉ — Cohérence revenus/justificatifs, taux d'effort (seuil vigilance : >35%), incohérences fiches de paie/contrats
DOCUMENTS — Lisibilité, complétude, cohérences typographiques, dates cohérentes
PROFIL GLOBAL — Cohérence profil/bien visé, signaux de tension, éléments manquants

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

SCORE KÀDDU
À la toute fin de ta réponse, sur une ligne séparée, retourne uniquement ce bloc JSON :

KADDU_SCORE:{"score":[0-100],"identite":[0-20],"revenus":[0-20],"documents":[0-20],"coherence":[0-20],"risque_fraude":[0-20],"decision":"pre_validation|verification_humaine|attente|refus","label":"Profil rassurant|Profil à vérifier|Profil à risque"}

Critères : identite (concordance/validité pièces), revenus (cohérence/taux effort), documents (qualité/complétude), coherence (cohérence globale), risque_fraude (20=aucun signal, 0=signaux graves). score=somme des 5. decision: pre_validation si ≥80 / verification_humaine si 50-79 / attente si 30-49 / refus si <30.

RÈGLES : Ne jamais accuser, ne jamais écrire "faux" ou "fraudeur", toujours laisser la décision au conseiller. Revenus informels et Wave/OM sont valides. Diaspora avec pièces étrangères = traitement neutre.`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Méthode non autorisée. Utilisez POST." }, 405);
  }

  try {
    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) {
      return jsonResponse({
        error: "ANTHROPIC_API_KEY manquante dans les secrets Supabase.",
      }, 500);
    }

    const body = await req.json().catch(() => null) as RequestPayload | null;
    if (!body) {
      return jsonResponse({ error: "Body JSON invalide." }, 400);
    }

    const mode: AnalyzeMode = body.mode || "dossier";
    const model = cleanModel(Deno.env.get("ANTHROPIC_MODEL"));
    const maxTokens = Math.min(Math.max(Number(body.maxTokens || 1400), 300), 4000);

    let system = body.systemPrompt || buildDefaultSystemPrompt();
    let userContent: unknown;

    if (mode === "dossier") {
      const context = String(body.context || "").trim();
      if (!context) {
        return jsonResponse({ error: "Contexte dossier vide." }, 400);
      }
      userContent = `Analyse ce dossier locataire :\n\n${context}`;
    } else {
      if (!Array.isArray(body.contentParts) || body.contentParts.length === 0) {
        return jsonResponse({ error: "contentParts requis pour l'analyse documentaire." }, 400);
      }
      // Pour Anthropic, messages[].content peut être une liste de blocs texte/image/document.
      userContent = body.contentParts;
      // Pour analyse documents, le prompt peut être transmis comme dernier bloc texte.
      if (!body.systemPrompt) {
        system = "Tu es l'assistant antifraude documentaire de Kàddu. Reste factuel, non accusatoire, et retourne une synthèse exploitable par un conseiller.";
      }
    }

    const anthropicResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        system,
        messages: [{ role: "user", content: userContent }],
      }),
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

    return jsonResponse({
      ok: true,
      mode,
      model,
      rawText,
      displayText,
      scoreData,
      usage: anthropicJson?.usage || null,
    });
  } catch (error) {
    return jsonResponse({
      error: error instanceof Error ? error.message : "Erreur inconnue.",
    }, 500);
  }
});

