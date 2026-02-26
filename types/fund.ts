export interface Fund {
  id: string;
  code: string;
  name: string;
  type: string;
  company: string;
  netValue: number;
  totalAssets: number;
  dayGrowth: number;
  weekGrowth: number;
  monthGrowth: number;
  yearGrowth: number;
  managementFee: number;
  custodianFee: number;
  establishmentDate: string;
  status: 'active' | 'suspended';
}

export interface FundCompareItem {
  fund: Fund;
  selected: boolean;
}

export interface FundHistory {
  date: string;
  netValue: number;
  dayGrowth: number;
  cumulativeGrowth?: number;
}

export interface FundSearchFilters {
  company?: string;
  type?: string;
  minAssets?: number;
  maxAssets?: number;
  sortBy?: 'dayGrowth' | 'weekGrowth' | 'monthGrowth' | 'yearGrowth' | 'assets';
  order?: 'asc' | 'desc';
}
