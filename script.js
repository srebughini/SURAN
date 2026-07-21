/* ==========================================================================
   SURAN — script.js
   Vanilla JavaScript, nessuna dipendenza esterna.
   Ogni modulo è indipendente e "difensivo": se gli elementi attesi non
   sono presenti nell'HTML, il modulo si disattiva silenziosamente senza
   generare errori — così lo script resta sicuro anche se la pagina
   viene modificata in futuro.
   ========================================================================== */

'use strict';

/* ==========================================================================
   CONFIGURAZIONE
   ========================================================================== */

// URL del servizio che riceve le candidature al Programma Beta.
// PLACEHOLDER: sostituire con l'endpoint reale prima del rilascio in produzione.
const FORM_ENDPOINT = 'https://api.example.com/suran/beta-signup';


document.addEventListener('DOMContentLoaded', () => {
  initHeaderOffset();
  initScrollReveal();
  initMobileMenu();
  initFaqAccordion();
  initButtonMicrointeractions();
  initFormValidation();
});


/* ==========================================================================
   0. UTILITY CONDIVISE
   ========================================================================== */

/**
 * Restituisce true se l'utente ha richiesto animazioni ridotte a livello
 * di sistema operativo/browser. Va sempre rispettato (vedi Design System,
 * sezione Animazioni + Accessibilità).
 */
function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}


/* ==========================================================================
   1. OFFSET HEADER STICKY
   L'header è sticky: senza compensazione, un click su un link ancora
   (es. dal footer o dalla CTA) nasconderebbe il titolo della sezione
   sotto l'header. Impostiamo dinamicamente lo scroll-margin-top di ogni
   sezione in base all'altezza reale dell'header.
   ========================================================================== */

function initHeaderOffset() {
  const header = document.querySelector('.site-header');
  const sections = document.querySelectorAll('main > section[id]');

  if (!header || sections.length === 0) return;

  const applyOffset = () => {
    const headerHeight = header.offsetHeight;
    sections.forEach((section) => {
      section.style.scrollMarginTop = `${headerHeight + 16}px`;
    });
  };

  applyOffset();
  // Ricalcola se l'header cambia altezza (es. rotazione dispositivo)
  window.addEventListener('resize', applyOffset);
}


/* ==========================================================================
   2. ANIMAZIONI ALLO SCROLL (reveal-on-scroll)
   Ogni elemento "rivelabile" parte leggermente traslato e trasparente,
   e si anima alla sua posizione naturale non appena entra in viewport.
   Animazione una sola volta per elemento (mai ri-animare scrollando
   su e giù), coerente con le linee guida del Design System.
   ========================================================================== */

function initScrollReveal() {
  // Selettori degli elementi che devono comparire con un leggero fade + slide
  const revealSelectors = [
    '.hero__title',
    '.hero__subtitle',
    '.hero__cta',
    '.hero__media',
    '.section__title',
    '.section__text',
    '.step',
    '.feature-card',
    '.compare-table',
    '.faq-item',
    '.form',
    '.cta-final__action',
  ];

  const revealEls = document.querySelectorAll(revealSelectors.join(', '));
  if (revealEls.length === 0) return;

  // Se l'utente preferisce animazioni ridotte, mostriamo tutto subito,
  // senza applicare transizioni.
  if (prefersReducedMotion()) {
    revealEls.forEach((el) => {
      el.style.opacity = '1';
      el.style.transform = 'none';
    });
    return;
  }

  // Stato iniziale (impostato via JS per non dover toccare il CSS):
  // leggermente più in basso e trasparente.
  revealEls.forEach((el, index) => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(16px)';
    el.style.transition = 'opacity 500ms ease-out, transform 500ms ease-out';

    // Micro-stagger tra elementi "fratelli" dello stesso contenitore
    // (es. le 3 card di "Come funziona"), max 100ms come da linee guida.
    const staggerDelay = Math.min(index % 6, 5) * 60;
    el.style.transitionDelay = `${staggerDelay}ms`;
  });

  const observer = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.style.opacity = '1';
          entry.target.style.transform = 'translateY(0)';
          // Una sola animazione per elemento: smettiamo di osservarlo
          obs.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.15,
      rootMargin: '0px 0px -40px 0px',
    }
  );

  revealEls.forEach((el) => observer.observe(el));
}


/* ==========================================================================
   3. MENU MOBILE
   Predisposto in modo difensivo: si attiva solo se nell'HTML sono presenti
   sia il pulsante #mobile-menu-toggle sia il pannello #mobile-menu.

   FIX CRITICO (accessibilità): il pannello è un overlay a schermo intero,
   quindi mentre è aperto va impedito che Tab/screen reader raggiungano
   contenuti nascosti dietro di esso. Questa versione implementa:
     - un vero focus trap (Tab e Shift+Tab restano confinati nel pannello)
     - "inert" su <main> e <footer> mentre il pannello è aperto, così anche
       la navigazione a cursore virtuale degli screen reader li ignora
     - il focus si sposta nel pannello all'apertura e torna al pulsante
       che l'ha aperto alla chiusura
   ========================================================================== */

function initMobileMenu() {
  const toggle = document.getElementById('mobile-menu-toggle');
  const menu = document.getElementById('mobile-menu');
  const closeBtn = document.getElementById('mobile-menu-close');

  if (!toggle || !menu) return;

  // Elementi che restano "vivi" (non inert) fuori dal pannello mentre è aperto:
  // vengono esclusi dalla navigazione da tastiera/screen reader per tutta la
  // durata dell'apertura del menu.
  const inertTargets = document.querySelectorAll('main, footer');

  let lastFocusedElement = null;

  const isMenuOpen = () => menu.classList.contains('is-open');

  // Elementi effettivamente raggiungibili con Tab dentro il pannello,
  // ricalcolati ad ogni apertura/uso (non cambiano a runtime in questo
  // caso, ma è più sicuro non assumerlo).
  const getFocusableInMenu = () =>
    Array.from(menu.querySelectorAll('a, button')).filter(
      (el) => !el.hasAttribute('disabled')
    );

  const openMenu = () => {
    lastFocusedElement = document.activeElement;

    menu.classList.add('is-open');
    toggle.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden'; // blocca lo scroll del body dietro al menu

    // "inert" rimuove main/footer sia dal Tab-order sia dalla lettura
    // degli screen reader, finché il menu resta aperto.
    inertTargets.forEach((el) => el.setAttribute('inert', ''));

    // Sposta il focus dentro il pannello (sul pulsante di chiusura se presente)
    const focusable = getFocusableInMenu();
    if (closeBtn) {
      closeBtn.focus();
    } else if (focusable.length > 0) {
      focusable[0].focus();
    }
  };

  const closeMenu = () => {
    menu.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';

    inertTargets.forEach((el) => el.removeAttribute('inert'));

    // Ripristina il focus su chi aveva aperto il menu (tipicamente l'hamburger)
    (lastFocusedElement || toggle).focus();
  };

  toggle.addEventListener('click', () => {
    isMenuOpen() ? closeMenu() : openMenu();
  });

  if (closeBtn) {
    closeBtn.addEventListener('click', closeMenu);
  }

  // Chiude il menu cliccando su un link al suo interno (navigazione ad ancora)
  menu.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', closeMenu);
  });

  document.addEventListener('keydown', (event) => {
    if (!isMenuOpen()) return;

    if (event.key === 'Escape') {
      closeMenu();
      return;
    }

    // Focus trap: Tab e Shift+Tab restano confinati tra il primo e
    // l'ultimo elemento raggiungibile dentro il pannello.
    if (event.key === 'Tab') {
      const focusable = getFocusableInMenu();
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  });

  // Chiude il menu cliccando fuori dall'area del menu/toggle
  // (difensivo: con l'overlay a schermo intero questo caso è raro,
  // ma resta corretto se in futuro il pannello non coprisse più tutto).
  document.addEventListener('click', (event) => {
    if (isMenuOpen() && !menu.contains(event.target) && !toggle.contains(event.target)) {
      closeMenu();
    }
  });
}


/* ==========================================================================
   4. FAQ ACCORDION
   Potenzia i <details>/<summary> nativi già presenti in index.html con:
     - comportamento "accordion" (un solo elemento aperto alla volta)
     - apertura/chiusura animata (altezza fluida), invece dello scatto
       istantaneo di default del browser
   Se JavaScript non è disponibile, i <details> restano comunque
   utilizzabili nativamente: questo è un potenziamento progressivo,
   non una dipendenza.
   ========================================================================== */

function initFaqAccordion() {
  const faqItems = document.querySelectorAll('.faq-item');
  if (faqItems.length === 0) return;

  const reduceMotion = prefersReducedMotion();

  faqItems.forEach((item) => {
    const summary = item.querySelector('summary');
    const answer = item.querySelector('.faq-item__answer');
    if (!summary || !answer) return;

    // Stato iniziale: tutti chiusi (a meno che l'HTML non preveda
    // già l'attributo "open" su un elemento specifico)
    if (!item.hasAttribute('open')) {
      answer.style.maxHeight = '0px';
      answer.style.overflow = 'hidden';
    }
    answer.style.transition = reduceMotion ? 'none' : 'max-height 300ms ease-out';

    summary.addEventListener('click', (event) => {
      // Gestiamo l'apertura manualmente per poterla animare
      event.preventDefault();
      const isOpen = item.hasAttribute('open');

      if (isOpen) {
        closeFaqItem(item, answer);
      } else {
        // Comportamento accordion: chiude tutti gli altri elementi aperti
        faqItems.forEach((otherItem) => {
          if (otherItem !== item && otherItem.hasAttribute('open')) {
            const otherAnswer = otherItem.querySelector('.faq-item__answer');
            if (otherAnswer) closeFaqItem(otherItem, otherAnswer);
          }
        });
        openFaqItem(item, answer);
      }
    });
  });

  function openFaqItem(item, answer) {
    item.setAttribute('open', '');
    // scrollHeight = altezza reale del contenuto, usata come target dell'animazione
    answer.style.maxHeight = `${answer.scrollHeight}px`;
  }

  function closeFaqItem(item, answer) {
    // Impostiamo prima l'altezza corrente esplicita, poi la portiamo a 0:
    // necessario perché "auto" non è animabile in CSS.
    answer.style.maxHeight = `${answer.scrollHeight}px`;
    requestAnimationFrame(() => {
      answer.style.maxHeight = '0px';
    });
    // Rimuoviamo l'attributo "open" solo a transizione conclusa,
    // per non tagliare bruscamente il testo durante l'animazione.
    const onTransitionEnd = () => {
      item.removeAttribute('open');
      answer.removeEventListener('transitionend', onTransitionEnd);
    };
    if (reduceMotion) {
      item.removeAttribute('open');
    } else {
      answer.addEventListener('transitionend', onTransitionEnd);
    }
  }
}


/* ==========================================================================
   5. MICROINTERAZIONI SUI PULSANTI
   Due effetti discreti, coerenti con il tono "calmo" del brand:
     - leggero "press" (scale) al click, oltre all'hover già gestito in CSS
     - un piccolo effetto ripple dal punto esatto del click, molto
       sottile, mai vistoso
   ========================================================================== */

function initButtonMicrointeractions() {
  const buttons = document.querySelectorAll('.btn');
  if (buttons.length === 0) return;

  const reduceMotion = prefersReducedMotion();

  buttons.forEach((btn) => {
    // Effetto "press": leggero rimpicciolimento mentre il pulsante è premuto
    btn.addEventListener('pointerdown', () => {
      btn.style.transform = 'scale(0.97)';
    });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach((evt) => {
      btn.addEventListener(evt, () => {
        btn.style.transform = '';
      });
    });

    if (reduceMotion) return; // niente ripple se l'utente preferisce meno movimento

    // Effetto ripple: un cerchio che si espande dal punto di click e svanisce
    btn.addEventListener('click', (event) => {
      createRipple(btn, event);
    });
  });

  function createRipple(button, event) {
    const rect = button.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * 1.6;
    const x = event.clientX - rect.left - size / 2;
    const y = event.clientY - rect.top - size / 2;

    const ripple = document.createElement('span');
    ripple.setAttribute('aria-hidden', 'true');

    // Stile del ripple applicato interamente via JS: sottile, coerente
    // con la palette (bianco semi-trasparente sopra il colore accento).
    Object.assign(ripple.style, {
      position: 'absolute',
      left: `${x}px`,
      top: `${y}px`,
      width: `${size}px`,
      height: `${size}px`,
      borderRadius: '50%',
      background: 'rgba(255, 255, 255, 0.35)',
      pointerEvents: 'none',
      transform: 'scale(0)',
      opacity: '1',
      transition: 'transform 500ms ease-out, opacity 500ms ease-out',
    });

    // Il pulsante deve essere positioned e con overflow nascosto
    // per contenere il ripple senza alterarne la forma arrotondata.
    const originalPosition = button.style.position;
    const originalOverflow = button.style.overflow;
    button.style.position = button.style.position || 'relative';
    button.style.overflow = 'hidden';

    button.appendChild(ripple);

    // Avvia l'animazione al frame successivo (necessario per far
    // partire la transizione da scale(0))
    requestAnimationFrame(() => {
      ripple.style.transform = 'scale(1)';
      ripple.style.opacity = '0';
    });

    // Ripulisce il DOM e ripristina gli stili originali del pulsante
    window.setTimeout(() => {
      ripple.remove();
      button.style.position = originalPosition;
      button.style.overflow = originalOverflow;
    }, 550);
  }
}


/* ==========================================================================
   6. VALIDAZIONE FORM + SCHERMATA DI CONFERMA
   Validazione client-side leggera, con messaggi d'errore inline e
   accessibili (aria-invalid, aria-describedby). Al successo, il form
   viene sostituito da una schermata di conferma discreta.
   ========================================================================== */

function initFormValidation() {
  const form = document.getElementById('form-candidatura');
  if (!form) return;

  const fields = {
    nome: {
      el: form.querySelector('#nome'),
      required: true,
      validate: (value) => value.trim().length >= 2,
      message: 'Inserisci il tuo nome (almeno 2 caratteri).',
    },
    email: {
      el: form.querySelector('#email'),
      required: true,
      // Pattern semplice, sufficiente per una validazione client-side onesta
      validate: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()),
      message: 'Inserisci un indirizzo email valido.',
    },
    modello: {
      el: form.querySelector('#modello'),
      required: false,
    },
    inutilizzo: {
      el: form.querySelector('#inutilizzo'),
      required: false,
    },
    motivazione: {
      el: form.querySelector('#motivazione'),
      required: false,
    },
  };

  const feedbackEl = document.getElementById('form-feedback');
  const submitBtn = form.querySelector('button[type="submit"]');

  // Crea (una sola volta) un elemento di errore sotto ogni campo obbligatorio
  Object.entries(fields).forEach(([name, field]) => {
    if (!field.el || !field.required) return;

    const errorEl = document.createElement('p');
    errorEl.className = 'form__error';
    errorEl.id = `${name}-error`;
    errorEl.style.color = 'var(--color-error, #B5533C)';
    errorEl.style.fontSize = '0.8125rem';
    errorEl.style.marginTop = '0.4rem';
    errorEl.setAttribute('role', 'alert');
    errorEl.hidden = true;

    field.el.insertAdjacentElement('afterend', errorEl);
    field.errorEl = errorEl;
    field.el.setAttribute('aria-describedby', errorEl.id);

    // Validazione "live" discreta: rimuove l'errore non appena l'utente corregge
    field.el.addEventListener('input', () => {
      if (field.el.getAttribute('aria-invalid') === 'true' && field.validate(field.el.value)) {
        setFieldValid(field);
      }
    });
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    let firstInvalidField = null;

    Object.values(fields).forEach((field) => {
      if (!field.el || !field.required) return;

      const isValid = field.validate(field.el.value);
      if (isValid) {
        setFieldValid(field);
      } else {
        setFieldInvalid(field);
        if (!firstInvalidField) firstInvalidField = field.el;
      }
    });

    if (firstInvalidField) {
      // Porta l'attenzione (visiva e per screen reader) sul primo campo non valido
      firstInvalidField.focus();
      if (feedbackEl) {
        feedbackEl.textContent = 'Controlla i campi evidenziati e riprova.';
        feedbackEl.style.color = 'var(--color-error, #B5533C)';
      }
      return;
    }

    submitForm(form, fields, feedbackEl, submitBtn);
  });

  function setFieldInvalid(field) {
    field.el.setAttribute('aria-invalid', 'true');
    field.el.style.borderColor = 'var(--color-error, #B5533C)';
    if (field.errorEl) {
      field.errorEl.textContent = field.message;
      field.errorEl.hidden = false;
    }
  }

  function setFieldValid(field) {
    field.el.setAttribute('aria-invalid', 'false');
    field.el.style.borderColor = '';
    if (field.errorEl) {
      field.errorEl.hidden = true;
    }
  }
}

/**
 * Invia la candidatura al backend di raccolta lead.
 *
 * FIX CRITICO: prima di questa versione l'invio era simulato con un
 * setTimeout e nessun dato veniva realmente salvato da nessuna parte.
 *
 * ATTENZIONE: FORM_ENDPOINT è un placeholder — sostituirlo con l'URL
 * reale del servizio scelto (backend proprietario, Airtable, Formspree,
 * Supabase, ecc.) prima del rilascio in produzione.
 */
async function submitForm(form, fields, feedbackEl, submitBtn) {
  const payload = {
    nome: fields.nome.el ? fields.nome.el.value.trim() : '',
    email: fields.email.el ? fields.email.el.value.trim() : '',
    modello: fields.modello.el ? fields.modello.el.value.trim() : '',
    inutilizzo: fields.inutilizzo.el ? fields.inutilizzo.el.value.trim() : '',
    motivazione: fields.motivazione.el ? fields.motivazione.el.value.trim() : '',
  };

  // Stato di caricamento: disabilita il pulsante e comunica l'attesa
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.dataset.originalText = submitBtn.dataset.originalText || submitBtn.textContent;
    submitBtn.textContent = 'Invio in corso…';
  }
  if (feedbackEl) {
    feedbackEl.textContent = '';
    feedbackEl.style.color = '';
  }

  try {
    const response = await fetch(FORM_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Il server ha risposto con stato ${response.status}`);
    }

    showConfirmation(form, payload.nome);
  } catch (error) {
    // Errore di rete o risposta non valida: l'utente resta sul form,
    // con i dati già inseriti intatti, e viene invitato a riprovare.
    console.error('Invio candidatura fallito:', error);

    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = submitBtn.dataset.originalText || 'Invia la candidatura';
    }
    if (feedbackEl) {
      feedbackEl.textContent = 'Non siamo riusciti a inviare la candidatura. Controlla la connessione e riprova.';
      feedbackEl.style.color = 'var(--color-error, #B5533C)';
    }
  }
}

/**
 * Sostituisce il contenuto del form con una schermata di conferma
 * discreta, coerente con il tono di voce SURAN (nessuna esclamazione,
 * nessun coriandolo — solo una conferma chiara e rassicurante).
 *
 * FIX CRITICO (sicurezza): la versione precedente inseriva "nomeValue"
 * (testo digitato dall'utente) dentro innerHTML senza alcun escaping —
 * un nome tipo "<img src=x onerror=...>" veniva eseguito come HTML/JS
 * nella pagina (XSS). Qui i nodi vengono creati con createElement e il
 * testo assegnato via textContent, che non interpreta mai markup.
 */
function showConfirmation(form, nomeValue) {
  const reduceMotion = prefersReducedMotion();

  const confirmation = document.createElement('div');
  confirmation.className = 'form-confirmation';
  confirmation.setAttribute('role', 'status');
  confirmation.setAttribute('aria-live', 'polite');

  const title = document.createElement('h3');
  title.className = 'form-confirmation__title';
  title.textContent = nomeValue ? `Grazie, ${nomeValue}.` : 'Grazie.';

  const text = document.createElement('p');
  text.className = 'form-confirmation__text';
  text.textContent =
    'La tua candidatura al Programma Beta è stata inviata. Ti risponderemo ' +
    'di persona non appena il tuo profilo corrisponde alla prossima ondata.';

  confirmation.append(title, text);

  // Micro-transizione di ingresso, coerente con lo stile delle altre
  // animazioni della pagina (fade + leggero slide, mai bounce)
  if (!reduceMotion) {
    confirmation.style.opacity = '0';
    confirmation.style.transform = 'translateY(8px)';
    confirmation.style.transition = 'opacity 400ms ease-out, transform 400ms ease-out';
  }

  form.replaceWith(confirmation);

  if (!reduceMotion) {
    requestAnimationFrame(() => {
      confirmation.style.opacity = '1';
      confirmation.style.transform = 'translateY(0)';
    });
  }

  // Sposta il focus sulla conferma per chi naviga con screen reader/tastiera
  confirmation.setAttribute('tabindex', '-1');
  confirmation.focus();
}
