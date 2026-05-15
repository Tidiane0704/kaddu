import { RISK_THRESHOLDS } from '../config/thresholds.js';

export function decisionFromScore(score) {
  if (score >= RISK_THRESHOLDS.PREVALIDATION_SCORE) return 'pre_validation';
  if (score >= RISK_THRESHOLDS.HUMAN_REVIEW_SCORE) return 'verification_humaine';
  if (score >= RISK_THRESHOLDS.WAITING_SCORE) return 'attente';
  return 'refus';
}
