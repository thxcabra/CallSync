import dns from 'node:dns';

// Workaround for local DNS resolvers that hang on *.supabase.co hostnames.
// dns.setServers() only affects dns.resolve*(), not dns.lookup(), which is what
// fetch/undici (and therefore supabase-js) use. So we point the resolver at public
// DNS and patch dns.lookup to resolve *.supabase.co via resolve4, falling back to
// the system lookup on failure. All other hostnames go through the system lookup.
// Safe to remove if your network resolves Supabase hosts normally.
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
