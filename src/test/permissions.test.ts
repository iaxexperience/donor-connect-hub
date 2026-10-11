import { describe, expect, it } from 'vitest';
import { canAccessPage, homeForRole, type AppRole } from '@/lib/permissions';

const roles: AppRole[] = ['admin','gestor','operador','visualizador','caixa','motoboy','coordenador'];
const pages = ['','doadores','doadores/novo','doadores/editar/123','kanbam','campanhas','telemarketing','followups','usuarios','setores','relatorios','configuracoes','integracoes','whatsapp','asaas','bb','api-aberta','api-documentacao','caixa','doacoes-fisicas','transferencia-doacoes','rotas','minhas-captacoes','doacoes-recebidas'].map(p=>`/dashboard${p?'/'+p:''}`);

describe('permissões dos menus e páginas', () => {
  it.each(roles)('Dashboard exclusivo do administrador: %s', role => {
    for(const path of ['/dashboard','/dashboard/','/DASHBOARD']) expect(canAccessPage(role,path)).toBe(role==='admin');
  });
  it('caixa tem apenas sua área, inclusive por URL direta', () => {
    const allowed='/dashboard/caixa';
    for(const page of pages) expect(canAccessPage('caixa',page),page).toBe(page===allowed);
    expect(canAccessPage('caixa',allowed.toUpperCase()+'/')).toBe(true);
    expect(canAccessPage('caixa',allowed+'/nao-autorizado')).toBe(false);
    expect(homeForRole('caixa')).toBe(allowed);
  });
  it('operador tem telemarketing e suas próprias captações, mais nada', () => {
    const allowed=['/dashboard/telemarketing','/dashboard/minhas-captacoes'];
    for(const page of pages) expect(canAccessPage('operador',page),page).toBe(allowed.includes(page));
    expect(canAccessPage('operador','/DASHBOARD/TELEMARKETING/')).toBe(true);
    expect(canAccessPage('operador','/dashboard/telemarketing/nao-autorizado')).toBe(false);
    expect(homeForRole('operador')).toBe('/dashboard/telemarketing');
  });
  it('coordenador tem Relatórios, sem Dashboard', () => {
    expect(canAccessPage('coordenador','/dashboard/relatorios')).toBe(true);
    expect(canAccessPage('coordenador','/dashboard')).toBe(false);
  });
  it('coordenador gerencia coleta (rotas e atribuições), demais papéis não', () => {
    expect(canAccessPage('coordenador','/dashboard/rotas')).toBe(true);
    expect(canAccessPage('coordenador','/dashboard/atribuicoes')).toBe(true);
    for (const role of ['gestor','operador','visualizador','caixa'] as AppRole[]) {
      expect(canAccessPage(role,'/dashboard/rotas'),role).toBe(false);
      expect(canAccessPage(role,'/dashboard/atribuicoes'),role).toBe(false);
    }
    expect(canAccessPage('motoboy','/dashboard/rotas')).toBe(true);
    expect(canAccessPage('motoboy','/dashboard/atribuicoes')).toBe(false);
  });
  it('mensageiro e coordenador vêem doações recebidas, demais papéis não', () => {
    expect(canAccessPage('motoboy','/dashboard/doacoes-recebidas')).toBe(true);
    expect(canAccessPage('coordenador','/dashboard/doacoes-recebidas')).toBe(true);
    for (const role of ['gestor','operador','visualizador','caixa'] as AppRole[]) {
      expect(canAccessPage(role,'/dashboard/doacoes-recebidas'),role).toBe(false);
    }
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
