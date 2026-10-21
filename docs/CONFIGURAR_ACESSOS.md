# Configurar login e acessos

## Preparar o Supabase

1. No SQL Editor do projeto, rode as migrações `0001_schema_inicial.sql`, `0002_rotinas_varios_dias.sql` e `0003_admin_colaboradores.sql`, nessa ordem.
2. Em **Authentication → Settings**, desative o cadastro público de usuários. As contas da equipe devem ser criadas pelo administrador.
3. Crie a primeira conta em **Authentication → Users → Add user**, usando o e-mail do administrador e uma senha inicial. Confirme o e-mail nessa tela.
4. No SQL Editor, promova essa conta a administradora. Substitua o endereço pelo e-mail usado no passo anterior:

   ```sql
   update public.profiles p
   set role = 'admin', active = true
   from auth.users u
   where u.id = p.id
     and lower(u.email) = lower('admin@empresa.com');
   ```

   Confira que uma linha foi atualizada. Essa é uma etapa única de configuração; depois dela, os demais cadastros são feitos em **Configurações → Equipe**.

5. Publique a função segura que cria contas no Auth:

   ```bash
   supabase functions deploy gerenciar-colaboradores --project-ref SEU_PROJECT_REF
   ```

   O comando usa a URL e as chaves do projeto configurado na CLI. A chave `service_role` fica no ambiente da função e nunca deve ser colocada no frontend ou em `.env.local`.

6. Configure `.env.local` com a URL e a chave publishable/anon do projeto, conforme `.env.example`, e reinicie o Vite.

## Fluxo da equipe

- O administrador cadastra nome, e-mail e senha inicial em **Configurações → Equipe**. A conta recebe o papel de colaborador e pode entrar imediatamente.
- O colaborador pode atualizar o nome exibido e trocar a própria senha em **Configurações**.
- Um administrador pode promover outro colaborador, desativar ou reativar uma conta. Uma conta desativada não consegue entrar nem acessar os dados protegidos pelo RLS.
- A tela não envia e-mail de convite. O administrador compartilha a senha inicial diretamente com o colaborador.
- O sistema impede que uma pessoa altere o próprio papel ou desative a própria conta e mantém ao menos um administrador ativo.

No modo local, Configurações permite criar usuários fictícios e alternar entre eles para experimentar a interface. Essas contas existem apenas no navegador e não são credenciais de login do Supabase.
