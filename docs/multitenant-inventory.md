# Inventario Multitenant oPrice/RM

## Estado Atual

- Frontend: React/Vite em `App.tsx`, com CRM, propostas, configuracoes, pricing e editores por tipo.
- Persistencia real: Supabase esta ligado principalmente a auth, `profiles` e bucket `logos`.
- Persistencia local/mock: clientes, contatos, tarefas, propostas e configuracoes comerciais ainda nascem no estado React/localStorage.
- Dominio Lubrim: dados mockados, pricing de servicos complexos, EPIs, seguranca, suporte, CAPEX e identidade visual original.

## Entidades Que Agora Recebem Tenant

- `Client.tenantId`
- `Contact.tenantId`
- `CRMTask.tenantId`
- `ProposalData.tenantId`
- configuracao comercial por tenant em `oprice-tenant-configs`

## Separacao Inicial

- Lubrim: tenant inicial com `SERVICES_COMPLEX` e `PRODUCT_SALES`.
- Software SaaS: tenant com catalogo simples de assinatura e setup.
- Sensores & Monitoramento: tenant com sensores, instalacao e mensalidade de monitoramento.

## Proximos Passos Tecnicos

- Trocar estado/mock por repositorios Supabase tenant-scoped.
- Aplicar a migration `supabase/migrations/20260513110000_multitenant_foundation.sql` em ambiente controlado.
- Migrar dados existentes para `clients`, `contacts`, `crm_tasks`, `proposals` e `tenant_settings`.
- Atualizar upload de logos para paths por tenant.
- Criar telas especificas para precificacao SaaS e IoT quando os campos comerciais forem fechados.
