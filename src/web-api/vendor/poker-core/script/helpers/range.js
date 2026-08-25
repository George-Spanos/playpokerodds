"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.range = range;
function range(start, end) {
    start = Math.floor(start);
    end = Math.floor(end);
    const diff = end - start;
    if (diff === 0) {
        return [start];
    }
    const keys = Array(Math.abs(diff) + 1).keys();
    return Array.from(keys).map(x => {
        const increment = end > start ? x : -x;
        return start + increment;
    });
}
