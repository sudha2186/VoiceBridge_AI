import { supabase } from './supabaseClient';

export interface EligibilityRuleRecord {
  id: string;
  scheme_id: string;
  criteria_type: string;
  operator: string;
  value: string;
  is_mandatory: boolean;
  created_at?: string | null;
}

export interface SchemeEligibility {
  income_max?: number;
  income_min?: number;
  age_min?: number;
  age_max?: number;
  gender?: string;
  categories?: string[];
  states?: string[];
  occupations?: string[];
  disability_status?: string;
  special?: string;
  rawRules?: EligibilityRuleRecord[];
}

export interface Scheme {
  id: string;
  name: string;
  title: string;
  description: string | null;
  benefits: string | null;
  ministry: string | null;
  scheme_type: string | null;
  category: string | null;
  state_applicable: string | null;
  application_mode: string | null;
  official_url: string | null;
  official_link: string | null;
  eligibility_criteria: SchemeEligibility | null;
  required_documents: string[] | null;
  how_to_apply?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

interface RawSchemeRow {
  id: string;
  name: string;
  description: string | null;
  benefits: string | null;
  ministry: string | null;
  scheme_type: string | null;
  state_applicable: string | null;
  application_mode: string | null;
  official_url: string | null;
  created_at: string | null;
  updated_at: string | null;
}

function buildEligibilityCriteria(rules: EligibilityRuleRecord[], stateApplicable: string | null): SchemeEligibility {
  const criteria: SchemeEligibility = {
    rawRules: rules,
  };

  if (stateApplicable && stateApplicable.toLowerCase() !== 'all states') {
    criteria.states = [stateApplicable];
  }

  for (const rule of rules) {
    const val = rule.value?.trim();
    if (!val) continue;

    switch (rule.criteria_type) {
      case 'annual_income': {
        const num = parseFloat(val);
        if (!isNaN(num)) {
          if (rule.operator === '<=' || rule.operator === '<') {
            criteria.income_max = num;
          } else if (rule.operator === '>=' || rule.operator === '>') {
            criteria.income_min = num;
          }
        }
        break;
      }
      case 'age': {
        const num = parseInt(val, 10);
        if (!isNaN(num)) {
          if (rule.operator === '>=' || rule.operator === '>') {
            criteria.age_min = num;
          } else if (rule.operator === '<=' || rule.operator === '<') {
            criteria.age_max = num;
          }
        }
        break;
      }
      case 'occupation': {
        if (!criteria.occupations) criteria.occupations = [];
        criteria.occupations.push(val);
        break;
      }
      case 'gender': {
        criteria.gender = val;
        break;
      }
      case 'category': {
        if (!criteria.categories) criteria.categories = [];
        criteria.categories.push(val);
        break;
      }
      case 'disability_status': {
        criteria.disability_status = val;
        break;
      }
      default:
        break;
    }
  }

  return criteria;
}

function mapSchemeRow(row: RawSchemeRow, rules: EligibilityRuleRecord[] = []): Scheme {
  const title = row.name;
  const category = row.scheme_type || 'General Welfare';
  const official_link = row.official_url;
  const eligibility_criteria = buildEligibilityCriteria(rules, row.state_applicable);

  return {
    id: row.id,
    name: row.name,
    title,
    description: row.description,
    benefits: row.benefits,
    ministry: row.ministry,
    scheme_type: row.scheme_type,
    category,
    state_applicable: row.state_applicable,
    application_mode: row.application_mode,
    official_url: row.official_url,
    official_link,
    eligibility_criteria,
    required_documents: ['Aadhaar Card', 'Income Certificate', 'Bank Account Passbook'],
    how_to_apply: row.application_mode ? `Application mode: ${row.application_mode}. Visit official portal.` : null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

/**
 * Fetch all schemes from the active `Schemes` table and correlate with `Eligibility_rules`.
 */
export async function getSchemes(): Promise<Scheme[]> {
  // 1. Fetch all schemes from live Schemes table
  const { data: rawSchemes, error: schemeErr } = await supabase
    .from('Schemes')
    .select('*')
    .order('name', { ascending: true });

  if (schemeErr) {
    console.error('Error fetching Schemes from Supabase:', schemeErr);
    throw schemeErr;
  }

  // 2. Fetch all eligibility rules
  const { data: rawRules, error: ruleErr } = await supabase
    .from('Eligibility_rules')
    .select('*');

  if (ruleErr) {
    console.warn('Warning: Could not fetch Eligibility_rules:', ruleErr);
  }

  const rulesMap = new Map<string, EligibilityRuleRecord[]>();
  if (rawRules) {
    for (const rule of rawRules as EligibilityRuleRecord[]) {
      const existing = rulesMap.get(rule.scheme_id) || [];
      existing.push(rule);
      rulesMap.set(rule.scheme_id, existing);
    }
  }

  return ((rawSchemes ?? []) as RawSchemeRow[]).map((row) =>
    mapSchemeRow(row, rulesMap.get(row.id) || [])
  );
}

/**
 * Fetch a single scheme by ID from `Schemes` and correlate with its eligibility rules.
 */
export async function getSchemeById(id: string): Promise<Scheme | null> {
  const { data: rawScheme, error: schemeErr } = await supabase
    .from('Schemes')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (schemeErr) {
    console.error(`Error fetching scheme with id ${id}:`, schemeErr);
    throw schemeErr;
  }

  if (!rawScheme) return null;

  const { data: rawRules } = await supabase
    .from('Eligibility_rules')
    .select('*')
    .eq('scheme_id', id);

  return mapSchemeRow(rawScheme as RawSchemeRow, (rawRules ?? []) as EligibilityRuleRecord[]);
}
