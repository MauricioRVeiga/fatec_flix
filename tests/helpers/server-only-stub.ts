// Stub de "server-only" para os testes (Vitest roda em Node puro, sem
// a condition "react-server" que o bundler do Next define — o pacote
// real lança erro incondicionalmente fora desse contexto, ver
// lib/supabase/admin.ts e scripts/sync-channels.ts para o mesmo
// problema resolvido de outra forma). Aliasado só para este pacote em
// vitest.config.ts — não mexe na resolução de mais nada (React/Next
// têm exports próprios sob a condition "react-server" que não
// queremos afetar globalmente).
export {};
