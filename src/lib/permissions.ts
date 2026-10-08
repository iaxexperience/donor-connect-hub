export type AppRole = 'admin' | 'gestor' | 'operador' | 'visualizador' | 'caixa' | 'motoboy' | 'coordenador';

const roles: readonly string[] = ['admin', 'gestor', 'operador', 'visualizador', 'caixa', 'motoboy', 'coordenador'];

/** Shared by navigation and the route guard. React Router matches paths case-insensitively. */
export function canAccessPage(role: AppRole | null, path: string): boolean {
  const page = path.replace(/\/+$/, '').toLowerCase();
  if (!role || !roles.includes(role)) return false;
  if (role === 'admin') return true;
  if (page === '/dashboard') return false;
  if (role === 'caixa') return page === '/dashboard/caixa';
  if (role === 'operador') return page === '/dashboard/telemarketing';
  if (role === 'motoboy') return ['/dashboard/caixa', '/dashboard/rotas'].includes(page);
  if (page === '/dashboard/usuarios' || page === '/dashboard/rotas') return false;
  if (page === '/dashboard/relatorios') return role === 'gestor' || role === 'coordenador';
  if (page === '/dashboard/configuracoes') return role === 'gestor';
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
  return '/dashboard/doacoes-fisicas';
}
