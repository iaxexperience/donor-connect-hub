import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
const auth = vi.hoisted(()=>({session:{} as object|null,loading:false,role:'admin' as string|null}));
vi.mock('@/contexts/AuthContext',()=>({useAuth:()=>auth}));
afterEach(cleanup);
function open(path:string,role:string|null,session:object|null={}) {
  Object.assign(auth,{role,session,loading:false});
  render(<MemoryRouter initialEntries={[path]}><Routes><Route path="/login" element={<p>Login</p>}/><Route path="/dashboard" element={<ProtectedRoute/>}><Route index element={<p>Dashboard restrito</p>}/><Route path="caixa" element={<p>Área Caixa</p>}/><Route path="telemarketing" element={<p>Área Telemarketing</p>}/><Route path="doacoes-fisicas" element={<p>Doações Físicas</p>}/><Route path="relatorios" element={<p>Relatórios</p>}/></Route></Routes></MemoryRouter>);
}
describe('bloqueio por URL',()=>{
 it('redireciona caixa sem renderizar dashboard',()=>{open('/dashboard','caixa');expect(screen.getByText('Área Caixa')).toBeInTheDocument();expect(screen.queryByText('Dashboard restrito')).not.toBeInTheDocument();});
 it('redireciona telemarketing ao tentar abrir caixa',()=>{open('/dashboard/caixa','operador');expect(screen.getByText('Área Telemarketing')).toBeInTheDocument();});
 it('permite relatório do coordenador',()=>{open('/dashboard/relatorios','coordenador');expect(screen.getByText('Relatórios')).toBeInTheDocument();});
 it('bloqueia dashboard com maiúsculas',()=>{open('/DASHBOARD','coordenador');expect(screen.getByText('Doações Físicas')).toBeInTheDocument();});
 it('permite dashboard do administrador',()=>{open('/dashboard','admin');expect(screen.getByText('Dashboard restrito')).toBeInTheDocument();});
 it('exige autenticação',()=>{open('/dashboard','admin',null);expect(screen.getByText('Login')).toBeInTheDocument();});
});
