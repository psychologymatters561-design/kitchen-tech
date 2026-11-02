// Generic page: boots the shared chrome and wires every <form data-lead> to the leads API.
import { boot, wireForm, waLink } from './core.js';

await boot();

document.querySelectorAll('form[data-lead]').forEach((form) => {
  wireForm(form, {
    endpoint: 'api/leads',
    onSuccess: (out) => {
      form.classList.add('done');
      const a = form.querySelector('[data-success-wa]');
      if (a) a.href = out.whatsapp || waLink('Hi Kitchen Tech, I just sent an enquiry on your website.');
      form.querySelector('.form-success')?.focus?.();
    },
    waFallback: (d) => {
      const lines = [`Hi Kitchen Tech, enquiry from your website (${d.type || 'contact'}):`, `Name: ${d.name || ''}`, `Phone: ${d.phone || ''}`];
      for (const k of ['firm', 'city', 'gstin', 'volume', 'product', 'message']) if (d[k]) lines.push(`${k[0].toUpperCase() + k.slice(1)}: ${d[k]}`);
      return lines.join('\n');
    },
  });
});

// Business page: picking a track pre-selects the form type
document.querySelectorAll('[data-pick-type]').forEach((a) =>
  a.addEventListener('click', () => {
    const sel = document.querySelector('form[data-lead] select[name="type"]');
    if (sel) sel.value = a.dataset.pickType;
  })
);
const hash = location.hash.slice(1);
const sel = document.querySelector('form[data-lead] select[name="type"]');
if (sel && [...sel.options].some((o) => o.value === hash)) sel.value = hash;
