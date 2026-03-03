import { storage } from './storage.js';

// Simple SuperMemo-2 Algorithm for spaced repetition
export const srs = {
    // grade: 0-5 (0 = completely forgot, 5 = perfect recall)
    calculate(phraseId, grade) {
        let progress = storage.getPhraseProgress(phraseId) || {
            interval: 0,
            repetition: 0,
            efactor: 2.5,
            dueDate: new Date().getTime()
        };

        if (grade >= 3) {
            if (progress.repetition === 0) {
                progress.interval = 1;
            } else if (progress.repetition === 1) {
                progress.interval = 6;
            } else {
                progress.interval = Math.round(progress.interval * progress.efactor);
            }
            progress.repetition += 1;
        } else {
            progress.repetition = 0;
            progress.interval = 1;
        }

        progress.efactor = progress.efactor + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02));
        if (progress.efactor < 1.3) progress.efactor = 1.3;

        // Set next due date
        const nextDate = new Date();
        nextDate.setDate(nextDate.getDate() + progress.interval);
        progress.dueDate = nextDate.getTime();

        storage.updatePhraseProgress(phraseId, progress);
        storage.updateStats(progress.repetition === 1); // If newly learned

        return progress;
    },

    getDuePhrases(allPhrases) {
        const now = new Date().getTime();
        const progressMap = storage.getAllProgress();

        return allPhrases.filter(p => {
            const prog = progressMap[p.id];
            return !prog || prog.dueDate <= now;
        });
    }
};
