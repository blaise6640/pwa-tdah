import { collection, deleteDoc, getDocs, addDoc, setDoc, doc, Timestamp } from 'firebase/firestore';
import dayjs from 'dayjs';
import isLeapYear from 'dayjs/plugin/isLeapYear';
dayjs.extend(isLeapYear);
import { db } from '../firebase';
import { createFlowDocIdShort } from './flowIds';
import { Expense } from './expenses';
import { EXPENSE_FREQUENCIES, EXPENSE_SMOOTHING, ExpenseSmoothing } from '../settings/expenses';
import { normalizeFrequency as normalizeFrequencyUtil } from '../utils/frequency';

export interface ScheduledFlow {
  amountExpected: number;
  dueDate: Date;
  status: 'scheduled';
  direction: 'out';
  parentType: 'expense';
  parentId: string;
  orgId: string;
  propertyId: string;
  id: string;
  // Optional user-facing fields
  label?: string;
  tags?: string[];
  currency?: string;
}

/**
 * Génère les flux prévisionnels pour une dépense.
 * Supprime les anciens flux "scheduled" puis crée les nouveaux.
 */
export async function generateExpenseFlows(
  orgId: string,
  propertyId: string,
  expenseId: string,
  expense: Expense,
  options?: { startMonth?: number; startYear?: number }
): Promise<ScheduledFlow[]> {
  const flowsCol = collection(db, 'orgs', orgId, 'properties', propertyId, 'expenses', expenseId, 'scheduledFlows');

  // 1. Supprimer les anciens flux "scheduled"
  const snap = await getDocs(flowsCol);
  const deletions: Promise<void>[] = [];
  snap.forEach((doc) => {
    const data = doc.data();
    if (data.status === 'scheduled') {
      deletions.push(deleteDoc(doc.ref));
    }
  });
  await Promise.all(deletions);

  // 2. Générer les nouveaux flux
  const flows: ScheduledFlow[] = [];
    const freq = expense.frequency;
    // Defensive normalization: prefer the raw value when available (some docs may have been normalized incorrectly)
    const freqSource = (expense as any).frequencyRaw ?? freq;
    const freqNorm = normalizeFrequencyUtil(freqSource) ?? freq;
  // Prefer an explicit finalized amount (expense.amount) when present (e.g. after quick-pay),
  // otherwise fall back to amountEstimated used at creation time.
  const total = (typeof (expense as any).amount === 'number') ? (expense as any).amount : (expense.amountEstimated ?? 0);
  // baseDate = début d'année + startMonth
  // Priorité pour déterminer startMonth/startYear :
  // 1) options.startMonth / options.startYear
  // 2) expense.startMonth / expense.startYear (valeurs stockées)
  // 3) fallback : mois/année courants
  const now = dayjs();
  const startMonth = (typeof options?.startMonth !== 'undefined') ? options!.startMonth : (typeof (expense as any)?.startMonth !== 'undefined' ? (expense as any).startMonth : now.month());
  const startYear = (typeof options?.startYear !== 'undefined') ? options!.startYear : (typeof (expense as any)?.startYear !== 'undefined' ? (expense as any).startYear : now.year());
  const baseDate = dayjs().startOf('year').year(Number(startYear)).add(Number(startMonth), 'month');

  // --- PRIORITÉ : CAPEX ---
  if (expense.isCapex === true && typeof expense.amortizationPeriodMonths === 'number' && expense.amortizationPeriodMonths > 0) {
    const n = expense.amortizationPeriodMonths;
    const perMonth = Math.round((total / n) * 100) / 100;
    let totalAllocated = 0;
    for (let i = 0; i < n; i++) {
      let amount = perMonth;
      // Correction du dernier mois pour garantir la somme totale
      if (i === n - 1) {
        amount = Math.round((total - totalAllocated) * 100) / 100;
      }
      flows.push({
        amountExpected: amount,
        dueDate: baseDate.add(i, 'month').startOf('month').toDate(),
        status: 'scheduled',
        direction: 'out',
        parentType: 'expense',
        parentId: expenseId,
        orgId,
        propertyId,
        id: '', // sera défini plus bas
        // tags will be set on payload building; keep empty here to allow per-flow overrides later
        tags: [],
      });
      totalAllocated += amount;
    }
  } else if (freq === 'one-off') {
    flows.push({
      amountExpected: total,
      dueDate: baseDate.startOf('month').toDate(),
      status: 'scheduled',
      direction: 'out',
      parentType: 'expense',
      parentId: expenseId,
      orgId,
      propertyId,
      id: '', // sera défini plus bas
      tags: [],
    });
  } else if (expense.smoothing === 'monthly') {
    // Lissage mensuel: toujours générer 12 flux.
    // Le montant saisi est un montant par période:
    // - monthly: 1 mois par période => par mois = total
    // - quarterly: 3 mois par période => par mois = total/3 pour les mois du trimestre
    // - semiannual: 6 mois par période => par mois = total/6 pour les mois du semestre
    // - yearly: 12 mois par période => par mois = total/12
    const monthsPerPeriod = (freqNorm === 'monthly') ? 1 : (freqNorm === 'quarterly') ? 3 : (freqNorm === 'semiannual') ? 6 : 12;
    const isRegularizationA = expense && expense.isRegularizable === true && (expense as any).defaultRegularizationMode === 'retroactive';
    // Pour Type A: ne générer que les flux de la période courante (3 ou 6 mois), pas 12
    const monthsLoop = isRegularizationA ? monthsPerPeriod : 12;
    const perMonthBase = total / monthsPerPeriod;
    let totalAllocated = 0;
    for (let i = 0; i < monthsLoop; i++) {
      let amount = Math.round(perMonthBase * 100) / 100;
      // Corriger le dernier mois pour que la somme des 12 = périodesParAn * total
      const periodsPerYear = (freqNorm === 'monthly') ? 12 : (freqNorm === 'quarterly') ? 4 : (freqNorm === 'semiannual') ? 2 : 1;
      const targetTotal = Math.round(((isRegularizationA ? 1 : periodsPerYear) * total) * 100) / 100;
      const isLast = i === (monthsLoop - 1);
      if (isLast) {
        amount = Math.round((targetTotal - totalAllocated) * 100) / 100;
      }
      flows.push({
        amountExpected: amount,
        dueDate: baseDate.add(i, 'month').startOf('month').toDate(),
        status: 'scheduled',
        direction: 'out',
        parentType: 'expense',
        parentId: expenseId,
        orgId,
        propertyId,
        id: '',
        tags: [],
      });
      totalAllocated = Math.round((totalAllocated + amount) * 100) / 100;
    }
  } else if (expense.smoothing === 'monthly_prorata') {
    // Lissage mensuel au prorata des jours: toujours 12 flux.
    // Répartir le montant par période sur les mois de la période selon le nombre de jours.
    const periodsPerYear = (freqNorm === 'monthly') ? 12 : (freqNorm === 'quarterly') ? 4 : (freqNorm === 'semiannual') ? 2 : 1;
    const monthsPerPeriod = (freqNorm === 'monthly') ? 1 : (freqNorm === 'quarterly') ? 3 : (freqNorm === 'semiannual') ? 6 : 12;
    const isRegularizationA = expense && expense.isRegularizable === true && (expense as any).defaultRegularizationMode === 'retroactive';
    const monthsLoop = isRegularizationA ? monthsPerPeriod : 12;

    let totalAllocated = 0;
    for (let i = 0; i < monthsLoop; i++) {
      const monthDate = baseDate.add(i, 'month');
      // Déterminer l'index du mois dans sa période (0..monthsPerPeriod-1)
      const monthOffset = i % monthsPerPeriod;
      // Calculer le nombre total de jours dans la période courante
      let daysTotalPeriod = 0;
      for (let k = 0; k < monthsPerPeriod; k++) {
        const d = baseDate.add(i - monthOffset + k, 'month');
        daysTotalPeriod += d.daysInMonth();
      }
      const daysInMonth = monthDate.daysInMonth();
      // Montant pour ce mois = (total par période) * (jours du mois / jours totaux de la période)
      let amount = daysTotalPeriod > 0 ? (total * daysInMonth) / daysTotalPeriod : 0;
      amount = Math.round(amount * 100) / 100;
      // Corriger le dernier mois de l'année pour assurer la somme = périodesParAn * total
      const targetTotal = Math.round(((isRegularizationA ? 1 : periodsPerYear) * total) * 100) / 100;
      const isLast = i === (monthsLoop - 1);
      if (isLast) {
        amount = Math.round((targetTotal - totalAllocated) * 100) / 100;
      }
      flows.push({
        amountExpected: amount,
        dueDate: monthDate.startOf('month').toDate(),
        status: 'scheduled',
        direction: 'out',
        parentType: 'expense',
        parentId: expenseId,
        orgId,
        propertyId,
        id: '',
        tags: [],
      });
      totalAllocated = Math.round((totalAllocated + amount) * 100) / 100;
    }
  } else if (freq === 'yearly') {
    const smoothing: ExpenseSmoothing = (expense.smoothing && EXPENSE_SMOOTHING.includes(expense.smoothing)) ? expense.smoothing : 'none';
    if (smoothing === 'none') {
      flows.push({
        amountExpected: total,
        dueDate: baseDate.startOf('month').toDate(),
        status: 'scheduled',
        direction: 'out',
        parentType: 'expense',
        parentId: expenseId,
        orgId,
        propertyId,
        id: '',
      });
    }
  } else if (freq === 'monthly') {
    // 12 flux à partir du mois de départ
    for (let i = 0; i < 12; i++) {
      flows.push({
        amountExpected: Math.round(total * 100) / 100,
        dueDate: baseDate.add(i, 'month').startOf('month').toDate(),
        status: 'scheduled',
        direction: 'out',
        parentType: 'expense',
        parentId: expenseId,
        orgId,
        propertyId,
        id: '', // sera défini plus bas
        tags: [],
      });
    }
  } else if (freqNorm === 'quarterly') {
    // Sans lissage: 4 flux trimestriels du montant indiqué (montant par période)
    for (let i = 0; i < 4; i++) {
      flows.push({
        amountExpected: Math.round(total * 100) / 100,
        dueDate: baseDate.add(i * 3, 'month').startOf('month').toDate(),
        status: 'scheduled',
        direction: 'out',
        parentType: 'expense',
        parentId: expenseId,
        orgId,
        propertyId,
        id: '',
        tags: [],
      });
    }
  } else if (freqNorm === 'semiannual') {
    // Sans lissage: 2 flux semestriels du montant indiqué (montant par période)
    for (let i = 0; i < 2; i++) {
      flows.push({
        amountExpected: Math.round(total * 100) / 100,
        dueDate: baseDate.add(i * 6, 'month').startOf('month').toDate(),
        status: 'scheduled',
        direction: 'out',
        parentType: 'expense',
        parentId: expenseId,
        orgId,
        propertyId,
        id: '',
        tags: [],
      });
    }
  }
  // Log de contrôle pour les tests
  const totalFlows = flows.length;
  const sumFlows = flows.reduce((acc, f) => acc + f.amountExpected, 0);
  console.log(`[generateExpenseFlows] Flows créés: ${totalFlows}, total: ${sumFlows}`);

  // 3. Enregistrer dans Firestore
  // Ajout de l'id Firestore à chaque flow (pour usage front)
  await Promise.all(
      flows.map((flow) => {
      let d: Date;
      if (flow.dueDate instanceof Date) {
        d = flow.dueDate;
      } else if (typeof flow.dueDate === 'object' && flow.dueDate && typeof (flow.dueDate as any).toDate === 'function') {
        d = (flow.dueDate as any).toDate();
      } else {
        d = new Date(flow.dueDate);
      }
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
  // deterministic logical id per expense per month
  const logicalId = `flow_${y}-${m}`;
  const customId = createFlowDocIdShort(logicalId);
  const ref = doc(flowsCol, customId);
  // ensure returned flow contains the id
  flow.id = customId;
      // build a payload that always contains the pivot fields and common metadata
      // Build tags: prefer flow.tags, otherwise expense.category; always concat 'projection' when
      // the expense is a retroactive regularization (régularisation A).
      const isRegularizationA = expense && expense.isRegularizable === true && (expense as any).defaultRegularizationMode === 'retroactive';

      // Start from explicit flow.tags or fallback to expense category
      const baseTags: string[] = (flow.tags && flow.tags.length)
        ? [...flow.tags]
        : (expense && (expense as any).category ? [(expense as any).category] : []);

      const finalTags = isRegularizationA ? baseTags.concat(['projection']) : baseTags;

      const payload: any = {
        amountExpected: flow.amountExpected,
        dueDate: Timestamp.fromDate(d),
        status: flow.status ?? 'scheduled',
        direction: flow.direction ?? 'out',
        parentType: 'expense',
        parentId: expenseId,
        orgId,
        propertyId,
  id: customId,
  logicalId,
        // prefer flow-level label/tags, otherwise fallback to expense
        label: flow.label ?? expense.label ?? 'Flux expense',
        tags: finalTags,
        currency: flow.currency ?? 'EUR',
      };

      return setDoc(ref, payload);
    })
  );

  return flows;
}
