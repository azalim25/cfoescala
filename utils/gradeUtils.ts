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
