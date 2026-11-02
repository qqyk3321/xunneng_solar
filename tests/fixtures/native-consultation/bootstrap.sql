create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create role authenticator login password 'native-local-only';
grant anon,authenticated,service_role to authenticator;
grant usage on schema public to anon,authenticated,service_role;
