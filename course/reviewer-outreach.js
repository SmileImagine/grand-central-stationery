(() => {
  'use strict';
  const style = document.createElement('style');
  style.textContent = '.outreach{font-size:13px;margin-top:8px;border-top:1px solid var(--line);padding-top:6px}.outreach>summary{cursor:pointer;color:var(--accent);font-weight:650}.outreach-note{color:var(--muted);margin:5px 0}.outreach-contact{border:1px solid var(--line);border-radius:6px;padding:8px;margin:8px 0}.outreach-contact h4{margin:0 0 3px;font-size:14px}.outreach-contact p{margin:4px 0}.outreach-links{display:flex;gap:8px;flex-wrap:wrap}.outreach-draft{width:100%;min-height:180px;margin-top:6px;padding:7px;border:1px solid var(--line);border-radius:4px;background:var(--bg);color:var(--ink);font:12px/1.35 ui-monospace,SFMono-Regular,Consolas,monospace;resize:vertical}.outreach-copy{margin-top:5px;border:1px solid var(--line);border-radius:5px;padding:4px 8px;background:var(--card);color:var(--ink);cursor:pointer}.outreach-badge{font-size:12px;border:1px solid var(--line);border-radius:999px;padding:1px 8px;color:var(--muted)}';
  document.head.appendChild(style);

  const el = (tag, text, cls) => { const node = document.createElement(tag); if (text != null) node.textContent = text; if (cls) node.className = cls; return node; };
  const link = (label, href) => { const a = el('a', label); a.href = href; a.target = href.startsWith('mailto:') ? '_self' : '_blank'; if (a.target === '_blank') a.rel = 'noopener'; return a; };
  const copy = async (text, button) => {
    try {
      if (navigator.clipboard) await navigator.clipboard.writeText(text);
      else { const area = el('textarea'); area.value = text; document.body.appendChild(area); area.select(); document.execCommand('copy'); area.remove(); }
      const old = button.textContent; button.textContent = 'Copied'; setTimeout(() => { button.textContent = old; }, 1200);
    } catch (e) { button.textContent = 'Copy failed'; }
  };

  function contactBlock(contact) {
    const section = el('section', null, 'outreach-contact');
    section.appendChild(el('h4', contact.name));
    section.appendChild(el('p', contact.role));
    if (contact.why) { const p = el('p'); p.append(el('b', 'Why this contact: '), document.createTextNode(contact.why)); section.appendChild(p); }
    if (contact.authority) { const p = el('p'); p.append(el('b', 'Authority limit: '), document.createTextNode(contact.authority)); section.appendChild(p); }
    if (contact.status) { const p = el('p'); p.append(el('b', 'Status: '), document.createTextNode(contact.status)); section.appendChild(p); }
    const links = el('p', null, 'outreach-links');
    if (contact.email) links.appendChild(link('Email', `mailto:${contact.email}${contact.draft && contact.draft.subject ? `?subject=${encodeURIComponent(contact.draft.subject)}` : ''}`));
    if (contact.contactUrl) links.appendChild(link('Official contact/profile ↗', contact.contactUrl));
    for (const evidence of contact.evidence || []) links.appendChild(link(`${evidence.label} ↗`, evidence.url));
    if (links.childNodes.length) section.appendChild(links);
    if (contact.draft) {
      const details = el('details'); details.appendChild(el('summary', `Draft email · ${contact.draft.subject}`));
      const area = el('textarea', null, 'outreach-draft'); area.readOnly = true; area.value = contact.draft.body; details.appendChild(area);
      const button = el('button', 'Copy draft', 'outreach-copy'); button.type = 'button'; button.addEventListener('click', () => copy(contact.draft.body, button)); details.appendChild(button);
      section.appendChild(details);
    }
    return section;
  }

  async function attach(queue) {
    let response;
    try { response = await fetch('/api/reviewer-outreach', { cache: 'no-store' }); } catch (e) { return; }
    if (!response.ok) return;
    const data = await response.json();
    if (!data.available || !data.records) return;
    const header = document.querySelector('header');
    if (header && !header.querySelector('.outreach-badge')) header.appendChild(el('span', 'Local reviewer outreach loaded', 'outreach-badge'));
    for (const [key, record] of Object.entries(data.records)) {
      const [recordQueue, id] = key.split('/');
      if (recordQueue !== queue) continue;
      const card = document.querySelector(`.card[data-tune-id="${CSS.escape(id)}"]`);
      if (!card) continue;
      const details = el('details', null, 'outreach');
      details.appendChild(el('summary', `Local reviewer outreach · ${(record.contacts || []).length} contact${(record.contacts || []).length === 1 ? '' : 's'}`));
      details.appendChild(el('p', record.summary || data.notice || 'Local-only reviewer research and drafts.', 'outreach-note'));
      for (const contact of record.contacts || []) details.appendChild(contactBlock(contact));
      const last = card.querySelector(':scope > p:last-child');
      card.insertBefore(details, last || null);
    }
  }

  window.GCSOutreach = { attach };
})();
