import dns from 'node:dns';

// Veja memory/project_dns_supabase_workaround.md.
// DNS local do usuário não resolve hostnames de projetos Supabase. Forçar resolver público.
dns.setServers(['1.1.1.1', '8.8.8.8']);

const originalLookup = dns.lookup;

// @ts-expect-error monkey-patch da assinatura de dns.lookup
dns.lookup = function patchedLookup(hostname: string, options: any, callback: any) {
  const cb = typeof options === 'function' ? options : callback;
  const opts = typeof options === 'function' ? {} : (options || {});
  if (hostname.endsWith('.supabase.co')) {
    dns.resolve4(hostname, (err, addresses) => {
      if (err || !addresses?.length) return originalLookup(hostname, opts, cb);
      if (opts.all) cb(null, addresses.map((address) => ({ address, family: 4 })));
      else cb(null, addresses[0], 4);
    });
    return;
  }
  originalLookup(hostname, opts, cb);
};
