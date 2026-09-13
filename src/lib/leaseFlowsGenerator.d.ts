import type { Dayjs } from 'dayjs';

export type FlowDirection = 'in' | 'out';

export interface GeneratedFlow {
  direction: FlowDirection;
  amountExpected: number;
  dueDate: Date | string | Dayjs;
  tags?: string[];
}

export interface BuildLeaseFlowsOptions {
  prorataFirstMonth?: boolean;
  prorataLastMonth?: boolean;
}

export function buildLeaseFlows(lease: any, opts?: BuildLeaseFlowsOptions): GeneratedFlow[];

export function makeFlowKey(date: Date | string | Dayjs, tag: string): string;
declare module './leaseFlowsGenerator' {
  import dayjs from 'dayjs';

  export type FlowDirection = 'in' | 'out';

  export interface GeneratedFlow {
    direction: FlowDirection;
    amountExpected: number;
    dueDate: Date | string | dayjs.Dayjs;
    tags?: string[];
  }

  export interface BuildLeaseFlowsOptions {
    prorataFirstMonth?: boolean;
    prorataLastMonth?: boolean;
  }

  export function buildLeaseFlows(lease: any, opts?: BuildLeaseFlowsOptions): GeneratedFlow[];

  export function makeFlowKey(date: Date | string | dayjs.Dayjs, tag: string): string;

  export {};
}
import dayjs from 'dayjs';

export type FlowDirection = 'in' | 'out';

export interface GeneratedFlow {
  direction: FlowDirection;
  amountExpected: number;
  dueDate: Date | string | dayjs.Dayjs;
  tags?: string[];
}

export interface BuildLeaseFlowsOptions {
  prorataFirstMonth?: boolean;
  prorataLastMonth?: boolean;
}

export function buildLeaseFlows(lease: any, opts?: BuildLeaseFlowsOptions): GeneratedFlow[];

export function makeFlowKey(date: Date | string | dayjs.Dayjs, tag: string): string;

export {};
