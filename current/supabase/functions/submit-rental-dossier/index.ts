// ═══════════════════════════════════════════════════════════════
// Kàddu — Edge Function : submit-rental-dossier
// Objectif : transformer un brouillon locataire "dossiers"
//            en candidature officielle "rental_dossiers"
// Déployer : supabase functions deploy submit-rental-dossier
//
// Sécurité :
// - Le HTML du tunnel n'écrit PAS directement dans rental_dossiers.
// - Cette fonction vérifie le JWT du locataire.
// - L'insert admin se fait côté serveur avec SUPABASE_SERVICE_ROLE_KEY.
// ═══════════════════════════════════════════════════════════════

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type AnyObject = Record<string, unknown>;

function jsonResponse(body: AnyObject, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "application/json",
    },
  });
}

function asString(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function asNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function asIsoDateOrNull(value: unknown): string | null {
  const s = asString(value);
  // PostgreSQL DATE attend YYYY-MM-DD.
  // Les valeurs métier du tunnel comme "semaine", "mois", "plus-mois", "6mois"
  // ne doivent jamais être insérées dans une colonne DATE.
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
}

function firstLocataire(locataires: unknown): AnyObject {
  return Array.isArray(locataires) &&
    locataires.length > 0 &&
    typeof locataires[0] === "object" &&
    locataires[0] !== null
    ? locataires[0] as AnyObject
    : {};
}

function computeOccupants(projet: AnyObject, locataires: unknown): number | null {
  const counts = (projet?.counts || {}) as AnyObject;
  const adultes = asNumber(counts.adultes) || 0;
  const enfants = asNumber(counts.enfants) || 0;
  const coloc = asNumber(counts.coloc) || 0;

  if (adultes || enfants || coloc) return adultes + enfants + coloc;
  if (Array.isArray(locataires) && locataires.length > 0) return locataires.length;

  return null;
}

function computeRiskLevel(score: number | null): string {
  if (score === null) return "non_calcule";
  if (score >= 80) return "faible";
  if (score >= 55) return "moyen";
  return "eleve";
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return jsonResponse({ success: false, error: "Méthode non autorisée." }, 405);
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Variables d'environnement Supabase manquantes.");
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      throw new Error("Session locataire absente ou invalide.");
    }

    const jwt = authHeader.replace("Bearer ", "").trim();

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { data: userData, error: userError } =
      await supabaseAdmin.auth.getUser(jwt);

    if (userError || !userData.user) {
      throw new Error("Utilisateur non authentifié.");
    }

    const user = userData.user;
    const body = await req.json();

    const dossierId = asString(body.dossier_id);
    const bienId = asString(body.bien_id);
    const locataires = body.locataires;
    const garants = Array.isArray(body.garants) ? body.garants : [];
    const docsFournis = Array.isArray(body.docs_fournis) ? body.docs_fournis : [];
    const projet = (body.projet || {}) as AnyObject;
    const loc0 = firstLocataire(locataires);

    const nomComplet = `${asString(loc0.prenom)} ${asString(loc0.nom)}`.trim();
    const email = asString(loc0.email).toLowerCase();
    const telephone = asString(loc0.tel || loc0.phone_e164 || loc0.phone_local);
    const score = asNumber(body.score);
    const riskLevel = asString(body.risk_level) || computeRiskLevel(score);
    const now = new Date().toISOString();

    if (!nomComplet) throw new Error("Nom du locataire principal manquant.");
    if (!email) throw new Error("Email du locataire principal manquant.");

    const snapshot = {
      source: "tunnel_locataire",
      dossier_id: dossierId || null,
      bien_id: bienId || null,
      locataire_id: user.id,
      projet,
      locataires: Array.isArray(locataires) ? locataires : [],
      garants,
      docs_fournis: docsFournis,
      no_garant: Boolean(body.no_garant),
      risk_level: riskLevel,
      submitted_at: now,
    };

    // 1) Mise à jour du brouillon / Passeport Locatif dans "dossiers".
    let finalDossierId = dossierId || null;

    const draftPayload = {
      locataire_id: user.id,
      bien_id: bienId || null,
      statut: "en_attente",
      message: JSON.stringify({
        ...projet,
        locataires: Array.isArray(locataires) ? locataires : [],
        garants,
        no_garant: Boolean(body.no_garant),
        submitted_at: now,
      }),
      docs_fournis: docsFournis,
      updated_at: now,
    };

    if (finalDossierId) {
      const { error: updateDraftError } = await supabaseAdmin
        .from("dossiers")
        .update(draftPayload)
        .eq("id", finalDossierId)
        .eq("locataire_id", user.id);

      if (updateDraftError) throw updateDraftError;
    } else {
      const { data: createdDraft, error: createDraftError } = await supabaseAdmin
        .from("dossiers")
        .insert(draftPayload)
        .select("id")
        .single();

      if (createDraftError) throw createDraftError;
      finalDossierId = createdDraft?.id ?? null;
    }

    // 2) Création de la candidature officielle dans "rental_dossiers".
    //
    // IMPORTANT :
    // - projet.emmenagement peut valoir "mois", "semaine", "plus-mois".
    // - projet.duree peut valoir "6mois", "6-12mois", etc.
    // Ces valeurs restent dans payload, mais ne sont PAS envoyées dans des colonnes DATE.
    const rentalPayload = {
      bien: bienId || asString(projet.bien) || "Candidature spontanée",
      nom: nomComplet,
      telephone,
      numero_whatsapp: telephone,
      email,

      date_naissance: asIsoDateOrNull(loc0.ddn),
      nationalite: asString(loc0.nationalite) || null,

      // Ne jamais mettre "mois" ici.
      date_entree: asIsoDateOrNull(
        projet.date_entree || projet.date_entree_souhaitee || projet.emmenagement_date
      ),

      // Sécurité : la durée métier reste dans payload.projet.duree.
      // On évite ainsi toute erreur si la colonne "duree" est typée date côté Supabase.
      duree: null,

      situation: asString(loc0.situation) || null,
      revenu_mensuel: asNumber(loc0.revenu),
      date_debut_emploi: asIsoDateOrNull(loc0.date_poste || loc0.date_debut_emploi),

      garant: garants.length > 0 ? "oui" : "non",
      identite_garant: garants.length > 0
        ? garants.map((g: unknown) => {
            const gg = (g || {}) as AnyObject;
            return `${asString(gg.prenom)} ${asString(gg.nom)}`.trim();
          }).filter(Boolean).join(", ")
        : null,

      employeur: asString(loc0.societe) || null,
      pays_residence: asString(loc0.pays_residence) || null,
      logement_actuel: asString(projet.ville_precedente) || null,
      raison_depart: asString(projet.raison_depart) || null,
      nb_occupants: computeOccupants(projet, locataires),

      id_type: asString(loc0.id_type) || null,
      id_number: asString(loc0.id_numero) || null,
      bailleur_nom: asString(projet.bailleur_precedent) || null,

      transmission: "tunnel_locataire",
      commentaire: "Candidature créée automatiquement depuis le tunnel locataire Kàddu.",

      score,
      ratio: null,
      flags: JSON.stringify([
        `risk_level:${riskLevel}`,
        `documents:${docsFournis.length}`,
        garants.length ? "garant:oui" : "garant:non",
      ]),
      reasons: JSON.stringify({
        risk_level: riskLevel,
        score,
        documents_count: docsFournis.length,
        has_garant: garants.length > 0,
      }),

      otp_verified: false,

      payload: JSON.stringify({
        ...snapshot,
        dossier_id: finalDossierId,
      }),

      status: "nouveau",
      status_metier: "a_traiter",
      final_status: "en_attente",
      updated_at: now,
    };

    const { data: rental, error: rentalError } = await supabaseAdmin
      .from("rental_dossiers")
      .insert(rentalPayload)
      .select("id")
      .single();

    if (rentalError) throw rentalError;

    // 3) Journalisation optionnelle.
    try {
      await supabaseAdmin.from("dossier_events").insert({
        dossier_id: finalDossierId,
        event_type: "submitted",
        actor_id: user.id,
        payload: {
          rental_dossier_id: rental?.id,
          source: "submit-rental-dossier",
        },
        created_at: now,
      });
    } catch (_ignored) {
      // Table optionnelle : on n'interrompt pas le dépôt.
    }

    return jsonResponse({
      success: true,
      dossier_id: finalDossierId,
      rental_dossier_id: rental?.id,
    });
  } catch (error) {
    console.error("[submit-rental-dossier]", error);

    return jsonResponse({
      success: false,
      error: error instanceof Error
        ? error.message
        : "Erreur inconnue lors de la soumission.",
    }, 400);
  }
});
