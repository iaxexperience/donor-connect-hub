export type AppRole = 'admin' | 'gestor' | 'operador' | 'visualizador' | 'caixa' | 'motoboy' | 'coordenador';

const roles: readonly string[] = ['admin', 'gestor', 'operador', 'visualizador', 'caixa', 'motoboy', 'coordenador'];

/** Shared by navigation and the route guard. React Router matches paths case-insensitively. */
export function canAccessPage(role: AppRole | null, path: string): boolean {
  const page = path.replace(/\/+$/, '').toLowerCase();
  if (!role || !roles.includes(role)) return false;
  if (role === 'admin') return true;
  if (page === '/dashboard') return false;
  if (page === '/dashboard/coordenacao') return role === 'coordenador';
  if (page === '/dashboard/metas') return ['operador', 'motoboy', 'coordenador'].includes(role);
  if (role === 'caixa') return page === '/dashboard/caixa';
  // Operador usa o WhatsApp compartilhado, vendo só as conversas da própria carteira
  // ou encaminhadas pela coordenação (regra garantida no banco, ver
  // 20261123_whatsapp_por_carteira.sql). Na tela ele só vê a aba Chat.
  if (role === 'operador') return ['/dashboard/telemarketing', '/dashboard/minhas-captacoes', '/dashboard/whatsapp'].includes(page);
  if (role === 'motoboy') return ['/dashboard/caixa', '/dashboard/rotas', '/dashboard/doacoes-recebidas'].includes(page);
  if (page === '/dashboard/usuarios') return role === 'coordenador';
  if (page === '/dashboard/rotas') return role === 'coordenador';
  if (page === '/dashboard/atribuicoes') return role === 'coordenador';
  if (page === '/dashboard/doacoes-recebidas') return role === 'coordenador';
  if (page === '/dashboard/distribuicao-carteiras') return role === 'coordenador';
  if (page === '/dashboard/relatorios') return role === 'gestor' || role === 'coordenador';
  if (page === '/dashboard/configuracoes') return role === 'gestor' || role === 'coordenador';
  if (['/dashboard/whatsapp', '/dashboard/asaas', '/dashboard/bb', '/dashboard/api-aberta', '/dashboard/api-documentacao', '/dashboard/integracoes'].includes(page)) {
    return role === 'gestor' || role === 'coordenador';
  }
  return ['/dashboard/doadores', '/dashboard/doadores/novo', '/dashboard/kanbam', '/dashboard/campanhas', '/dashboard/followups', '/dashboard/setores', '/dashboard/caixa', '/dashboard/doacoes-fisicas', '/dashboard/transferencia-doacoes', '/dashboard/telemarketing'].includes(page)
    || /^\/dashboard\/doadores\/editar\/[^/]+$/.test(page);
}

export function homeForRole(role: AppRole | null): string {
  if (role === 'admin') return '/dashboard';
  if (role === 'caixa' || role === 'motoboy') return '/dashboard/caixa';
  if (role === 'operador') return '/dashboard/telemarketing';
  if (role === 'coordenador') return '/dashboard/coordenacao';
  return '/dashboard/doacoes-fisicas';
}
