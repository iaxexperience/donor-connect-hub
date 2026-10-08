import { describe, expect, it } from 'vitest';
import { canAccessPage, homeForRole, type AppRole } from '@/lib/permissions';

const roles: AppRole[] = ['admin','gestor','operador','visualizador','caixa','motoboy','coordenador'];
const pages = ['','doadores','doadores/novo','doadores/editar/123','kanbam','campanhas','telemarketing','followups','usuarios','setores','relatorios','configuracoes','integracoes','whatsapp','asaas','bb','api-aberta','api-documentacao','caixa','doacoes-fisicas','transferencia-doacoes','rotas'].map(p=>`/dashboard${p?'/'+p:''}`);

describe('permissões dos menus e páginas', () => {
  it.each(roles)('Dashboard exclusivo do administrador: %s', role => {
    for(const path of ['/dashboard','/dashboard/','/DASHBOARD']) expect(canAccessPage(role,path)).toBe(role==='admin');
  });
  it.each(['caixa','operador'] as AppRole[])('%s tem apenas sua área, inclusive por URL direta', role => {
    const allowed=role==='caixa'?'/dashboard/caixa':'/dashboard/telemarketing';
    for(const page of pages) expect(canAccessPage(role,page),page).toBe(page===allowed);
    expect(canAccessPage(role,allowed.toUpperCase()+'/')).toBe(true);
    expect(canAccessPage(role,allowed+'/nao-autorizado')).toBe(false);
    expect(homeForRole(role)).toBe(allowed);
  });
  it('coordenador tem Relatórios, sem Dashboard', () => {
    expect(canAccessPage('coordenador','/dashboard/relatorios')).toBe(true);
    expect(canAccessPage('coordenador','/dashboard')).toBe(false);
  });
  it('administrador mantém todas as áreas', () => {
    for(const page of pages) expect(canAccessPage('admin',page)).toBe(true);
  });
  it.each(roles)('destino inicial permitido para %s', role => expect(canAccessPage(role,homeForRole(role))).toBe(true));
  it('nega perfil ausente ou desconhecido', () => {
    expect(canAccessPage(null,'/dashboard')).toBe(false);
    expect(canAccessPage('inexistente' as AppRole,'/dashboard/doadores')).toBe(false);
  });
});
