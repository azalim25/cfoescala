import { Discipline, Grade, Military } from '../types';

// Peso 1: disciplinas com até 30h-aula. Peso 2: disciplinas com mais de 30h-aula.
export function disciplineWeight(totalHours: number): 1 | 2 {
    return totalHours > 30 ? 2 : 1;
}

export interface MilitaryAverage {
    militaryId: string;
    average: number;
    gradedCount: number;
    totalCount: number;
    pendingDisciplines: Discipline[];
}

/** Média ponderada de um militar, considerando apenas disciplinas já lançadas. */
export function computeMilitaryAverage(
    militaryId: string,
    grades: Grade[],
    disciplines: Discipline[]
): MilitaryAverage {
    let weightedSum = 0;
    let gradedWeight = 0;
    let gradedCount = 0;
    const pendingDisciplines: Discipline[] = [];

    for (const d of disciplines) {
        const weight = disciplineWeight(d.totalHours);
        const grade = grades.find(g => g.militaryId === militaryId && g.disciplineId === d.id);
        if (grade && grade.score !== null && grade.score !== undefined) {
            weightedSum += grade.score * weight;
            gradedWeight += weight;
            gradedCount += 1;
        } else {
            pendingDisciplines.push(d);
        }
    }

    return {
        militaryId,
        average: gradedWeight > 0 ? weightedSum / gradedWeight : 0,
        gradedCount,
        totalCount: disciplines.length,
        pendingDisciplines,
    };
}

export interface RankedMilitary extends MilitaryAverage {
    rank: number;
}

/** Classificação geral: maior média = 1º lugar. Empates dividem a mesma posição. */
export function rankMilitaries(
    militaries: Military[],
    grades: Grade[],
    disciplines: Discipline[]
): RankedMilitary[] {
    const averages = militaries
        .map(m => computeMilitaryAverage(m.id, grades, disciplines))
        .sort((a, b) => b.average - a.average);

    let lastAverage: number | null = null;
    let lastRank = 0;
    return averages.map((entry, index) => {
        if (lastAverage === null || entry.average !== lastAverage) {
            lastRank = index + 1;
            lastAverage = entry.average;
        }
        return { ...entry, rank: lastRank };
    });
}

/** Classificação por qualquer valor numérico (maior = melhor); `null` fica de fora do ranking. */
function rankByValue(entries: { militaryId: string; value: number | null }[]): Map<string, number> {
    const valid = entries
        .filter((e): e is { militaryId: string; value: number } => e.value !== null)
        .sort((a, b) => b.value - a.value);

    const ranks = new Map<string, number>();
    let lastValue: number | null = null;
    let lastRank = 0;
    valid.forEach((entry, index) => {
        if (lastValue === null || entry.value !== lastValue) {
            lastRank = index + 1;
            lastValue = entry.value;
        }
        ranks.set(entry.militaryId, lastRank);
    });
    return ranks;
}

export interface CfoSummary {
    cfo1: { average: number | null; rank: number | null };
    cfo2: MilitaryAverage & { rank: number | null };
    overall: { average: number | null; rank: number | null };
    totalMilitaries: number;
}

/**
 * Resume as 3 classificações de um militar: CFO I (média importada, sem
 * detalhamento por disciplina), CFO II (média ponderada das disciplinas já
 * lançadas) e Geral (média simples entre as duas, quando ambas existirem).
 */
export function computeCfoSummary(
    militaryId: string,
    militaries: Military[],
    grades: Grade[],
    disciplines: Discipline[]
): CfoSummary {
    const cfo2ByMilitary = militaries.map(m => ({ m, summary: computeMilitaryAverage(m.id, grades, disciplines) }));

    const cfo1Ranks = rankByValue(militaries.map(m => ({ militaryId: m.id, value: m.cfo1Average ?? null })));
    const cfo2Ranks = rankByValue(cfo2ByMilitary.map(({ m, summary }) => ({
        militaryId: m.id,
        value: summary.gradedCount > 0 ? summary.average : null,
    })));
    const overallRanks = rankByValue(cfo2ByMilitary.map(({ m, summary }) => {
        const cfo1 = m.cfo1Average ?? null;
        const cfo2 = summary.gradedCount > 0 ? summary.average : null;
        return { militaryId: m.id, value: (cfo1 !== null && cfo2 !== null) ? (cfo1 + cfo2) / 2 : null };
    }));

    const mine = cfo2ByMilitary.find(({ m }) => m.id === militaryId)!;
    const myCfo1 = mine.m.cfo1Average ?? null;
    const myCfo2 = mine.summary.gradedCount > 0 ? mine.summary.average : null;
    const myOverall = (myCfo1 !== null && myCfo2 !== null) ? (myCfo1 + myCfo2) / 2 : null;

    return {
        cfo1: { average: myCfo1, rank: cfo1Ranks.get(militaryId) ?? null },
        cfo2: { ...mine.summary, rank: cfo2Ranks.get(militaryId) ?? null },
        overall: { average: myOverall, rank: overallRanks.get(militaryId) ?? null },
        totalMilitaries: militaries.length,
    };
}
