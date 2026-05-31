
export enum CollaboratorStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive'
}

export enum WeekStatus {
  OPEN = 'aberta',
  CLOSED = 'fechada',
  IN_CONFERENCE = 'em_conferencia',
  PAID = 'paga'
}

export interface Collaborator {
  id: string;
  nome: string;
  cpf: string;
  banco: string;
  agencia: string;
  conta: string;
  tipo_conta: string;
  status: CollaboratorStatus;
  data_cadastro: string;
}

export interface HarvestLog {
  id: string;
  colaborador_id: string;
  data_colheita: string;
  quantidade_latas: number;
  valor_por_lata: number;
  valor_total_dia: number;
  semana_id: string;
  criado_por_id?: string;
  criado_por_nome?: string;
}

export interface CanPriceConfig {
  id: string;
  valor_lata: number;
  data_inicio_vigencia: string;
}

export interface HarvestWeek {
  id: string; // Typically YYYY-MM-DD of start date
  data_inicio: string; // Friday
  data_fim: string;    // Thursday
  status: WeekStatus;
  data_fechamento?: string;
  data_pagamento?: string;
}

export interface BankSummary {
  id: string;
  semana_id: string;
  banco: string;
  total_depositar: number;
  numero_colaboradores: number;
  data_pagamento?: string;
}

export interface Bank {
  id: string;
  nome: string;
  codigo?: string;
}

export interface FarmSettings {
  id: string;
  nome_fazenda: string;
  proprietario?: string;
  localizacao?: string;
}
