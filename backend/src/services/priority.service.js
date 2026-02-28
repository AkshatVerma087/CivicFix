function normalizeSeverity(severity = 'medium') {
    const value = String(severity).trim();
    if (value === 'high') return 'high';
    if (value === 'low') return 'low';
    return 'medium';
}

function severityScore(severity = 'medium') {
    const map = {
        low: 1,
        medium: 2,
        high: 3,
    };

    return map[normalizeSeverity(severity)] || 2;
}

function clampLocationPriority(value) {
    const numberValue = Number(value);
    if (Number.isNaN(numberValue)) return 0;
    if (numberValue < 0) return 0;
    if (numberValue > 10) return 10;
    return numberValue;
}

function calculatePriorityScore({ severity = 'medium', upvotes = 0, locationPriority = 0 }) {
    const severityValue = severityScore(severity);
    const upvotesValue = Math.max(0, Number(upvotes) || 0);
    const locationValue = clampLocationPriority(locationPriority);

    const score = (severityValue * 5) + (upvotesValue * 2) + locationValue;
    return Number(score.toFixed(2));
}

module.exports = {
    normalizeSeverity,
    clampLocationPriority,
    calculatePriorityScore,
};
