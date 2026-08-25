export declare const Spade: readonly ["As", "Ks", "Qs", "Qs", "Js", "Ts", "9s", "8s", "7s", "6s", "5s", "4s", "3s", "2s"];
export declare const Heart: readonly ["Ah", "Kh", "Qh", "Qh", "Jh", "Th", "9h", "8h", "7h", "6h", "5h", "4h", "3h", "2h"];
export declare const Club: readonly ["Ac", "Kc", "Qc", "Qc", "Jc", "Tc", "9c", "8c", "7c", "6c", "5c", "4c", "3c", "2c"];
export declare const Diamond: readonly ["Ad", "Kd", "Qd", "Qd", "Jd", "Td", "9d", "8d", "7d", "6d", "5d", "4d", "3d", "2d"];
export type Diamond = typeof Diamond;
export declare const UnknownCard: "..";
export type Card = string;
export declare function validateCard(payload: unknown): payload is Card;
//# sourceMappingURL=card.d.ts.map