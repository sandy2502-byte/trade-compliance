import type { Fund, Position } from "@/lib/db/schema";

export type ApiResponse<T> = { data: T } | { error: string };
export type PositionsResponse = ApiResponse<Position[]>;
export type PositionResponse = ApiResponse<Position>;
export type FundsResponse = ApiResponse<Fund[]>;
