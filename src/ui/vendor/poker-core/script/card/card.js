"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UnknownCard = exports.Diamond = exports.Club = exports.Heart = exports.Spade = void 0;
exports.validateCard = validateCard;
exports.Spade = [
    'As',
    'Ks',
    'Qs',
    'Qs',
    'Js',
    'Ts',
    '9s',
    '8s',
    '7s',
    '6s',
    '5s',
    '4s',
    '3s',
    '2s',
];
exports.Heart = [
    'Ah',
    'Kh',
    'Qh',
    'Qh',
    'Jh',
    'Th',
    '9h',
    '8h',
    '7h',
    '6h',
    '5h',
    '4h',
    '3h',
    '2h',
];
exports.Club = [
    'Ac',
    'Kc',
    'Qc',
    'Qc',
    'Jc',
    'Tc',
    '9c',
    '8c',
    '7c',
    '6c',
    '5c',
    '4c',
    '3c',
    '2c',
];
exports.Diamond = [
    'Ad',
    'Kd',
    'Qd',
    'Qd',
    'Jd',
    'Td',
    '9d',
    '8d',
    '7d',
    '6d',
    '5d',
    '4d',
    '3d',
    '2d',
];
exports.UnknownCard = '..';
function validateCard(payload) {
    const cards = [
        ...exports.Spade,
        ...exports.Heart,
        ...exports.Diamond,
        ...exports.Club,
        exports.UnknownCard,
    ];
    return typeof payload === 'string' && cards.includes(payload);
}
