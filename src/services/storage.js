const STORAGE_KEY = 'real_chinese_progress';

export const storage = {
    load() {
        const data = localStorage.getItem(STORAGE_KEY);
        if (!data) return { phrases: {}, stats: { totalLearned: 0, streak: 0, lastStudyDate: null }, favorites: [], adStudyCount: 0, adFree: false };
        try {
            return JSON.parse(data);
        } catch (e) {
            console.error('Failed to parse local storage data. Resetting to default.', e);
            return { phrases: {}, stats: { totalLearned: 0, streak: 0, lastStudyDate: null }, favorites: [], adStudyCount: 0, adFree: false };
        }
    },

    save(data) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    },

    getPhraseProgress(phraseId) {
        const data = this.load();
        return data.phrases[phraseId] || null;
    },

    updatePhraseProgress(phraseId, srsData) {
        const data = this.load();
        data.phrases[phraseId] = srsData;
        this.save(data);
    },

    updateStats(learnedToday) {
        const data = this.load();
        const today = new Date().toISOString().split('T')[0];

        if (data.stats.lastStudyDate !== today) {
            if (data.stats.lastStudyDate) {
                const lastDate = new Date(data.stats.lastStudyDate);
                const currentDate = new Date(today);
                const diffTime = currentDate - lastDate;
                const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

                if (diffDays === 1) {
                    data.stats.streak += 1;
                } else if (diffDays > 1) {
                    data.stats.streak = 1;
                }
                // If diffDays < 1 (e.g. same day), do nothing to streak
            } else {
                data.stats.streak = 1;
            }
            data.stats.lastStudyDate = today;
        }
        if (learnedToday) {
            data.stats.totalLearned += 1;
        }
        this.save(data);
    },

    incrementAdStudyCount() {
        const data = this.load();
        data.adStudyCount = (data.adStudyCount || 0) + 1;
        this.save(data);
        return data.adStudyCount;
    },

    getAdStudyCount() {
        const data = this.load();
        return data.adStudyCount || 0;
    },

    isAdFree() {
        const data = this.load();
        return !!data.adFree;
    },

    setAdFree(value) {
        const data = this.load();
        data.adFree = value;
        this.save(data);
    },

    // SRS Levels in days
    srsIntervals: [0, 1, 3, 7, 14, 30, 90],

    updateSRS(phraseId, isCorrect) {
        const data = this.load();
        if (!data.phrases[phraseId]) {
            data.phrases[phraseId] = { level: 0, nextReview: new Date().getTime(), history: [] };
        }

        let phraseStat = data.phrases[phraseId];
        let today = new Date();

        if (isCorrect) {
            phraseStat.level = Math.min(this.srsIntervals.length - 1, phraseStat.level + 1);
        } else {
            phraseStat.level = Math.max(0, phraseStat.level - 1);
        }

        const daysToAdd = this.srsIntervals[phraseStat.level] || 0;
        let nextDate = new Date();
        nextDate.setDate(today.getDate() + daysToAdd);
        phraseStat.nextReview = nextDate.getTime();

        phraseStat.history.push({ date: today.getTime(), correct: isCorrect });

        data.phrases[phraseId] = phraseStat;
        this.save(data);
    },

    getDuePhrases() {
        const data = this.load();
        const now = new Date().getTime();
        return Object.keys(data.phrases).filter(id => data.phrases[id].nextReview <= now);
    },

    getLearnedCount() {
        const data = this.load();
        return Object.keys(data.phrases).filter(id => data.phrases[id] && data.phrases[id].level > 0).length;
    },

    getStats() {
        return this.load().stats;
    },

    getAllProgress() {
        return this.load().phrases;
    },

    getFavorites() {
        return this.load().favorites || [];
    },

    toggleFavorite(phraseId) {
        const data = this.load();
        if (!data.favorites) data.favorites = [];
        const index = data.favorites.indexOf(phraseId);
        if (index > -1) {
            data.favorites.splice(index, 1);
        } else {
            data.favorites.push(phraseId);
        }
        this.save(data);
        return index === -1;
    },

    isFavorite(phraseId) {
        const data = this.load();
        return (data.favorites || []).includes(phraseId);
    },

    getAllStudiedIds() {
        const data = this.load();
        return Object.keys(data.phrases);
    },

    getStudiedTodayIds() {
        const data = this.load();
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayMs = todayStart.getTime();

        return Object.keys(data.phrases).filter(id => {
            const history = data.phrases[id].history;
            if (!history || history.length === 0) return false;
            return history.some(h => h.date >= todayMs);
        });
    },

    getIncorrectPhraseIds() {
        const data = this.load();
        return Object.keys(data.phrases).filter(id => {
            const p = data.phrases[id];
            return p && p.level === 0 && p.history && p.history.length > 0;
        });
    },

    markViewed(phraseId) {
        const data = this.load();
        if (!data.phrases[phraseId]) {
            data.phrases[phraseId] = { level: 0, nextReview: new Date().getTime(), history: [] };
        }

        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayMs = todayStart.getTime();

        const hasStudiedToday = data.phrases[phraseId].history.some(h => h.date >= todayMs);

        if (!hasStudiedToday) {
            data.phrases[phraseId].history.push({ date: new Date().getTime(), type: 'view' });
            this.save(data);
            this.updateStats(true); // Increment total learned and adjust streak
        }
    },

    getReviewedCount() {
        const data = this.load();
        return Object.keys(data.phrases).filter(id => {
            const history = data.phrases[id].history;
            return history && history.length > 1; // More than 1 interaction = reviewed
        }).length;
    }
};
