/* ===== תנועת הרכב — לוגיקת האתר ===== */
(function () {
  const $ = (s, el = document) => el.querySelector(s);
  const sub = s => String(s).replace(/_(\w+)/g, '<sub>$1</sub>');
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const fmt = (v, d = 0) => Number(v).toLocaleString('en-US', { maximumFractionDigits: d, minimumFractionDigits: d });
  const KEYS = ['א', 'ב', 'ג', 'ד'];

  /* ---------- שמירת התקדמות ---------- */
  const STORE = 'vehicle-motion-progress-v1';
  const store = (() => {
    let d;
    try { d = JSON.parse(localStorage.getItem(STORE)) || {}; } catch (e) { d = {}; }
    d.sections = d.sections || {}; d.quizzes = d.quizzes || {}; d.exams = d.exams || [];
    return {
      d,
      save() { try { localStorage.setItem(STORE, JSON.stringify(d)); } catch (e) { } }
    };
  })();

  /* ---------- ניווט ---------- */
  const views = { learn: $('#view-learn'), sim: $('#view-sim'), exam: $('#view-exam') };
  function setTab(name) {
    Object.entries(views).forEach(([k, el]) => el.classList.toggle('active', k === name));
    document.querySelectorAll('[data-tab]').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
  }
  function go(hash) { if (location.hash === hash) route(); else location.hash = hash; }
  function route() {
    const parts = (location.hash || '#learn').slice(1).split('/');
    const [p, a, b] = parts;
    if (p === 'sim') { setTab('sim'); initSim(); }
    else if (p === 'exam') { setTab('exam'); renderExamIntro(); }
    else if (p === 'ch') { setTab('learn'); renderChapter(a, b); }
    else if (p === 'quiz') { setTab('learn'); renderChapterQuiz(a); }
    else { setTab('learn'); renderHome(); }
    window.scrollTo(0, 0);
  }
  document.querySelectorAll('[data-tab]').forEach(b => b.addEventListener('click', () => go('#' + b.dataset.tab)));
  $('#brand').addEventListener('click', () => go('#learn'));
  window.addEventListener('hashchange', route);

  /* ---------- דף פתיחה ---------- */
  function chapterProgress(ch) {
    const seen = ch.sections.filter(s => store.d.sections[s.id]).length;
    const q = store.d.quizzes[ch.id];
    return { seen, total: ch.sections.length, quiz: q };
  }
  function renderHome() {
    const el = views.learn;
    const cards = CHAPTERS.map(ch => {
      const p = chapterProgress(ch);
      const pct = Math.round((p.seen / p.total) * 100);
      const qb = p.quiz ? `<span class="badge ${p.quiz.best >= 7 ? 'ok' : ''}">מבדק: ${fmt(p.quiz.best, 1).replace('.0', '')}/10</span>` : `<span class="badge">מבדק: טרם</span>`;
      return `<button class="ch-card" data-ch="${ch.id}">
        <div class="ch-top"><div class="ch-num">${ch.num}</div><div><h3>${ch.title}</h3><small style="color:var(--muted)">${ch.lessons}</small></div></div>
        <p>${ch.short}</p>
        <div class="progress" aria-label="התקדמות ${pct}%"><i style="width:${pct}%"></i></div>
        <div class="ch-meta"><span>${p.seen}/${p.total} נושאים</span>${qb}</div>
      </button>`;
    }).join('');
    el.innerHTML = `
      <section class="hero">
        <div>
          <span class="eyebrow">AUTOTECH · VEHICLE DYNAMICS</span>
          <h1>תנועת הרכב</h1>
          <p>אילו כוחות פועלים על רכב שעומד במקום? למה קשה יותר לנסוע בעלייה ובמהירות גבוהה? ביחידה הזו נבין את זה בעזרת איורים, סרטונים, דוגמאות פתורות וסימולטור.</p>
          <div class="hero-actions">
            <button class="btn amber" data-go="#ch/ch1">מתחילים ללמוד ${ICONS.next}</button>
            <button class="btn ghost" data-go="#sim">לסימולטור</button>
          </div>
        </div>
        <div class="hero-art">${scene({ alpha: 4, show: { G: true, R: true, Fa: true, Fr: true, Fs: true, wind: true }, v: { Fa: 1100, Fr: 500, Fs: 1300 }, speed: 70, horizon: false })}</div>
      </section>

      <div class="section-title"><h2>איך לומדים כאן</h2></div>
      <div class="how">
        <div class="card">${ICONS.watch}<div><h4>צופים ומבינים</h4><p>כל נושא מתחיל באיור, אנימציה או סרטון קצר.</p></div></div>
        <div class="card">${ICONS.read}<div><h4>קוראים מעט, מתרגלים הרבה</h4><p>הסבר קצר בנקודות, נוסחה אחת ודוגמה פתורה צעד אחר צעד.</p></div></div>
        <div class="card">${ICONS.check}<div><h4>בודקים את עצמכם</h4><p>מבדק של 10 שאלות אחרי כל פרק, עם משוב מיידי והזדמנות נוספת.</p></div></div>
      </div>

      <div class="section-title"><h2>פרקי היחידה</h2><span>5 פרקים · כ־10 שיעורים</span></div>
      <div class="chapters">${cards}</div>

      <div class="section-title"><h2>מערך השיעורים</h2></div>
      <div class="card table-wrap"><table class="plan">
        <thead><tr><th>שיעור</th><th>נושא</th><th>באתר</th></tr></thead>
        <tbody>${LESSON_PLAN.map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td></tr>`).join('')}</tbody>
      </table></div>`;
    el.querySelectorAll('[data-ch]').forEach(b => b.addEventListener('click', () => go('#ch/' + b.dataset.ch)));
    bindGo(el);
  }
  function bindGo(el) { el.querySelectorAll('[data-go]').forEach(b => b.addEventListener('click', () => go(b.dataset.go))); }

  /* ---------- פרק ---------- */
  function tocHTML(ch, activeId) {
    const q = store.d.quizzes[ch.id];
    return `<aside class="toc"><div class="card">
      <h4>פרק ${ch.num} · ${ch.title}</h4>
      ${ch.sections.map(s => `<button data-go="#ch/${ch.id}/${s.id}" class="${s.id === activeId ? 'active' : ''} ${store.d.sections[s.id] ? 'done' : ''}"><span class="tn">${s.id}</span>${s.title}</button>`).join('')}
      <button class="quiz-link ${activeId === 'quiz' ? 'active' : ''}" data-go="#quiz/${ch.id}"><span class="tn">✎</span>מבדק – 10 שאלות${q ? ` (${fmt(q.best, 1).replace('.0', '')})` : ''}</button>
    </div></aside>`;
  }
  function renderChapter(chId, secId) {
    const ch = CHAPTERS.find(c => c.id === chId) || CHAPTERS[0];
    const idx = Math.max(0, ch.sections.findIndex(s => s.id === secId));
    const sec = ch.sections[idx];
    store.d.sections[sec.id] = true; store.save();
    const prev = idx > 0 ? `#ch/${ch.id}/${ch.sections[idx - 1].id}` : null;
    const next = idx < ch.sections.length - 1 ? `#ch/${ch.id}/${ch.sections[idx + 1].id}` : `#quiz/${ch.id}`;
    views.learn.innerHTML = `
      <button class="back" data-go="#learn">${ICONS.back} כל הפרקים</button>
      <div class="chapter-layout">
        ${tocHTML(ch, sec.id)}
        <article>
          <div class="lesson-head"><span class="eyebrow">CHAPTER ${ch.num} · ${sec.id}</span><h2>${sec.title}</h2></div>
          ${sec.blocks.map(renderBlock).join('')}
          <div class="lesson-nav">
            ${prev ? `<button class="btn ghost" data-go="${prev}">${ICONS.back} הקודם</button>` : '<span></span>'}
            <button class="btn ${idx === ch.sections.length - 1 ? 'amber' : ''}" data-go="${next}">${idx === ch.sections.length - 1 ? 'למבדק הפרק' : 'הבא'} ${ICONS.next}</button>
          </div>
        </article>
      </div>`;
    bindGo(views.learn);
    bindBlocks(views.learn);
  }

  function renderBlock(b) {
    switch (b.t) {
      case 'p': return `<div class="block"><p>${b.html}</p></div>`;
      case 'points': return `<div class="block"><ul class="points">${b.items.map(i => `<li><div>${i}</div></li>`).join('')}</ul></div>`;
      case 'fig': return `<figure class="figure block">${fixSvgText(b.svg())}${b.cap ? `<figcaption>${sub(b.cap)}</figcaption>` : ''}</figure>`;
      case 'grid': return `<div class="grid-2 block">${b.blocks.map(x => renderBlock(x).replace('class="block"', 'class=""').replace(' block"', '"')).join('')}</div>`;
      case 'tip': return `<div class="tip block">${ICONS.tip}<div>${b.html}</div></div>`;
      case 'formula': return `<div class="formula block"><div class="f-title">${b.title}</div><div class="f-main">${b.main.split(/\s{3,}/).map(x => `<span>${x}</span>`).join('')}</div>
        ${b.vars ? `<div class="legend-vars">${b.vars.map(v => `<div><code>${sub(v[0])}</code><span>${v[1]}</span></div>`).join('')}</div>` : ''}</div>`;
      case 'table': return `<div class="block table-wrap"><table class="data-table"><thead><tr>${b.head.map(h => `<th>${sub(h)}</th>`).join('')}</tr></thead>
        <tbody>${b.rows.map(r => `<tr>${r.map((c, i) => `<td class="${i ? 'num' : ''}">${c}</td>`).join('')}</tr>`).join('')}</tbody></table>
        ${b.cap ? `<div style="font-size:13.5px;color:var(--muted);margin-top:6px">${b.cap}</div>` : ''}</div>`;
      case 'video': if (b.yt) return `<div class="media block"><div class="media-head">${ICONS.film}${b.title}</div>
        <div class="video-box"><iframe src="https://www.youtube-nocookie.com/embed/${b.yt}?rel=0" title="${b.title}" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen loading="lazy"></iframe></div>
        <a class="yt-link" target="_blank" rel="noopener" href="https://youtu.be/${b.yt}">${ICONS.play} הסרטון לא נטען? צפו בו ישירות ביוטיוב</a></div>`;
        return `<div class="media block"><div class="media-head">${ICONS.film}${b.title}</div>
        <div class="video-box"><video controls preload="metadata" playsinline src="${encodeURI(b.src)}"></video></div>
        <div class="video-missing" style="display:none;font-size:14px;color:var(--bad)">הסרטון לא נמצא. ודאו שהקובץ <span class="num">${b.src}</span> נמצא באותה תיקייה כמו index.html.</div></div>`;
      case 'anim': {
        const yt = b.yt ? `<div class="video-box"><iframe src="https://www.youtube-nocookie.com/embed/${b.yt}" title="${b.title}" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture" allowfullscreen loading="lazy"></iframe></div>`
          : `<div class="anim-box">${fixSvgText(b.svg())}</div>`;
        const link = b.search ? `<a class="yt-link" target="_blank" rel="noopener" href="https://www.youtube.com/results?search_query=${encodeURIComponent(b.search)}">${ICONS.play} סרטונים נוספים בנושא ביוטיוב</a>` : '';
        return `<div class="media block"><div class="media-head">${ICONS.film}${b.title}</div>${yt}${link}</div>`;
      }
      case 'example': return `<div class="example block" data-example>
        <div class="example-head"><span class="tag">דוגמה פתורה</span>${b.title}</div>
        <div class="example-body">
          <div style="font-size:14px;color:var(--muted)">נתונים:</div>
          <div class="given">${b.given.map(g => `<span>${sub(g)}</span>`).join('')}</div>
          ${b.fig ? `<figure class="figure" style="margin-bottom:12px">${fixSvgText(b.fig())}</figure>` : ''}
          <p><b>שאלה:</b> ${b.ask}</p>
          <ol class="steps">
            ${b.steps.map(s => `<li><div>${s.txt}<span class="calc">${sub(s.calc)}</span></div></li>`).join('')}
            <li class="answer"><div><b>${b.answer.txt}</b><span class="calc"><b>${sub(b.answer.calc)}</b></span></div></li>
          </ol>
          <div class="example-actions">
            <button class="btn" data-step>הצג את השלב הבא</button>
            <button class="btn ghost" data-all>הצג פתרון מלא</button>
          </div>
        </div></div>`;
    }
    return '';
  }
  function bindBlocks(el) {
    el.querySelectorAll('[data-example]').forEach(ex => {
      const items = [...ex.querySelectorAll('.steps li')];
      const stepBtn = ex.querySelector('[data-step]'), allBtn = ex.querySelector('[data-all]');
      const update = () => {
        const n = items.filter(i => i.classList.contains('show')).length;
        if (n === items.length) { stepBtn.disabled = true; allBtn.disabled = true; stepBtn.textContent = 'הפתרון הושלם ✓'; }
        else stepBtn.textContent = n === 0 ? 'הצג את השלב הראשון' : 'הצג את השלב הבא';
      };
      stepBtn.addEventListener('click', () => { const nx = items.find(i => !i.classList.contains('show')); if (nx) nx.classList.add('show'); update(); });
      allBtn.addEventListener('click', () => { items.forEach(i => i.classList.add('show')); update(); });
      update();
    });
    el.querySelectorAll('video').forEach(v => v.addEventListener('error', () => {
      const m = v.closest('.media').querySelector('.video-missing'); if (m) m.style.display = 'block';
    }));
  }

  /* ---------- מנוע השאלות ---------- */
  function gaugeSVG(pct) {
    const r = 70, c = 2 * Math.PI * r, col = pct >= 80 ? '#2E7D4F' : pct >= 55 ? '#C7861F' : '#B8443A';
    return `<svg viewBox="0 0 170 170"><circle cx="85" cy="85" r="${r}" fill="none" stroke="#E9E4DA" stroke-width="14"/>
      <circle cx="85" cy="85" r="${r}" fill="none" stroke="${col}" stroke-width="14" stroke-linecap="round" stroke-dasharray="${c * pct / 100} ${c}" transform="rotate(-90 85 85)"/></svg>`;
  }

  /* opts: { mode:'practice'|'exam', title, onFinish(results), container } */
  function runQuiz(questions, opts) {
    const exam = opts.mode === 'exam';
    const maxTries = exam ? 1 : 2;
    const st = { i: 0, tries: 0, res: questions.map(() => null), orders: questions.map(q => q.o ? shuffle(q.o.map((_, k) => k)) : null), t0: Date.now() };
    const el = opts.container;
    let timer;
    if (exam) timer = setInterval(() => { const t = $('.timer', el); if (t) t.textContent = clock(); }, 1000);
    function clock() { const s = Math.floor((Date.now() - st.t0) / 1000); return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; }

    function dots() {
      return `<div class="dots">${questions.map((_, k) => {
        const r = st.res[k]; const c = k === st.i && r == null ? 'cur' : r == null ? '' : r === 1 ? 'ok' : r > 0 ? 'half' : 'bad';
        return `<i class="${c}"></i>`;
      }).join('')}</div>`;
    }
    function show() {
      const q = questions[st.i];
      st.tries = 0;
      const body = q.type === 'num'
        ? `<div class="num-answer"><input type="text" inputmode="decimal" autocomplete="off" placeholder="הקלידו מספר" aria-label="תשובה"><span class="unit">${q.unit}</span><button class="btn" data-check>בדיקה</button></div>`
        : `<div class="opts">${st.orders[st.i].map((k, n) => `<button class="opt" data-k="${k}"><span class="key">${KEYS[n]}</span><span>${sub(q.o[k])}</span></button>`).join('')}</div>`;
      el.innerHTML = `<div class="quiz">
        <div class="quiz-top"><div><b>${opts.title}</b></div>${exam ? `<span class="timer">${clock()}</span>` : ''}</div>
        <div class="quiz-top">${dots()}</div>
        <div class="card q-card">
          <div class="q-num">שאלה ${st.i + 1} מתוך ${questions.length}</div>
          <div class="q-text">${sub(q.q)}</div>
          ${q.fig ? `<div class="q-fig figure">${q.fig()}</div>` : ''}
          ${body}
          <div class="feedback" aria-live="polite"></div>
          <div class="q-actions"><button class="btn" data-next style="display:none">${st.i === questions.length - 1 ? 'לתוצאות' : 'לשאלה הבאה'} ${ICONS.next}</button></div>
        </div></div>`;
      if (q.type === 'num') {
        const inp = $('input', el);
        const check = () => { const v = parseFloat(inp.value.replace(/,/g, '').trim()); if (isNaN(v)) { inp.focus(); return; } answer(Math.abs(v - q.ans) <= Math.max(Math.abs(q.ans) * (q.tol || 0.02), 1e-9), v); };
        $('[data-check]', el).addEventListener('click', check);
        inp.addEventListener('keydown', e => { if (e.key === 'Enter') check(); });
        inp.focus({ preventScroll: true });
      } else {
        el.querySelectorAll('.opt').forEach(b => b.addEventListener('click', () => answer(+b.dataset.k === q.a, +b.dataset.k, b)));
      }
      $('[data-next]', el).addEventListener('click', () => { st.i++; st.i < questions.length ? show() : finish(); });
    }
    function correctText(q) { return q.type === 'num' ? `${fmt(q.ans, 2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1')} ${q.unit}` : sub(q.o[q.a]); }
    function answer(ok, val, btn) {
      const q = questions[st.i];
      const fb = $('.feedback', el);
      st.tries++;
      const explain = `${q.ex ? sub(q.ex) : ''}${q.calc ? `<span class="calc">${sub(q.calc)}</span>` : ''}`;
      const lock = () => {
        el.querySelectorAll('.opt').forEach(b => { b.disabled = true; if (+b.dataset.k === q.a) b.classList.add('correct'); });
        const inp = $('input', el); if (inp) { inp.disabled = true; }
        const cb = $('[data-check]', el); if (cb) cb.disabled = true;
        $('[data-next]', el).style.display = '';
        $('.dots', el).outerHTML = dots();
      };
      if (ok) {
        st.res[st.i] = st.tries === 1 ? 1 : 0.5;
        if (btn) btn.classList.add('correct');
        if ($('input', el)) $('input', el).style.borderColor = 'var(--ok)';
        fb.className = 'feedback show ok';
        fb.innerHTML = `${ICONS.ok}<div><b>${st.tries === 1 ? 'נכון! כל הכבוד' : 'נכון! הצלחתם בניסיון השני'}</b>התשובה הנכונה: <b style="display:inline">${correctText(q)}</b><br>${explain}</div>`;
        lock();
      } else if (st.tries < maxTries) {
        if (btn) { btn.classList.add('wrong'); btn.disabled = true; }
        if ($('input', el)) { $('input', el).style.borderColor = 'var(--bad)'; $('input', el).select(); }
        fb.className = 'feedback show retry';
        fb.innerHTML = `${ICONS.retry}<div><b>לא בדיוק – נסו שוב</b>${q.hint ? 'רמז: ' + sub(q.hint) : 'קראו שוב את השאלה ובדקו את החישוב.'}</div>`;
      } else {
        st.res[st.i] = 0;
        if (btn) btn.classList.add('wrong');
        if ($('input', el)) $('input', el).style.borderColor = 'var(--bad)';
        fb.className = 'feedback show bad';
        const yours = q.type === 'num' ? `ענית ${fmt(val, 3)} ${q.unit}. ` : '';
        fb.innerHTML = `${ICONS.bad}<div><b>התשובה שגויה</b>${yours}התשובה הנכונה: <b style="display:inline">${correctText(q)}</b><br>${explain}</div>`;
        lock();
      }
    }
    function finish() {
      clearInterval(timer);
      const score = st.res.reduce((a, b) => a + (b || 0), 0);
      const pct = Math.round(score / questions.length * 100);
      const msg = pct >= 90 ? 'מצוין! שולטים בחומר.' : pct >= 70 ? 'יפה מאוד! עוד קצת תרגול וזה מושלם.' : pct >= 55 ? 'לא רע. כדאי לחזור על הדוגמאות הפתורות ולנסות שוב.' : 'כדאי לחזור על הפרק, לעבור על הדוגמאות ולנסות שוב.';
      const extra = opts.onFinish ? opts.onFinish({ score, pct, res: st.res, time: clock() }) : {};
      el.innerHTML = `<div class="quiz"><div class="card result">
        <div class="gauge">${gaugeSVG(pct)}<div class="g-val">${pct}%</div></div>
        <h3>${msg}</h3>
        <p>ציון: <span class="num">${fmt(score, 1).replace('.0', '')} / ${questions.length}</span>${exam ? ` · זמן: <span class="num">${clock()}</span>` : ''}</p>
        ${!exam ? '<p style="font-size:14px">תשובה נכונה בניסיון הראשון = נקודה, בניסיון השני = חצי נקודה.</p>' : ''}
        ${extra.html || ''}
        <div class="btns">${extra.buttons || ''}</div>
        <div class="review">${questions.map((q, k) => {
          const r = st.res[k];
          return `<div><i style="color:${r === 1 ? 'var(--ok)' : r > 0 ? 'var(--amber)' : 'var(--bad)'}">${r === 1 ? '✓' : r > 0 ? '½' : '✗'}</i><span>${k + 1}. ${sub(q.q)} <b style="white-space:nowrap">← ${correctText(q)}</b></span></div>`;
        }).join('')}</div>
      </div></div>`;
      bindGo(el);
      if (extra.bind) extra.bind(el);
    }
    show();
    return { stop() { clearInterval(timer); } };
  }

  /* ---------- מבדק פרק ---------- */
  function renderChapterQuiz(chId) {
    const ch = CHAPTERS.find(c => c.id === chId) || CHAPTERS[0];
    const nextCh = CHAPTERS[CHAPTERS.indexOf(ch) + 1];
    views.learn.innerHTML = `<button class="back" data-go="#ch/${ch.id}">${ICONS.back} חזרה לפרק</button>
      <div class="chapter-layout">${tocHTML(ch, 'quiz')}<div id="quiz-area"></div></div>`;
    bindGo(views.learn);
    runQuiz(ch.quiz, {
      mode: 'practice', title: `מבדק פרק ${ch.num}: ${ch.title}`, container: $('#quiz-area'),
      onFinish({ score }) {
        const prev = store.d.quizzes[ch.id];
        store.d.quizzes[ch.id] = { best: Math.max(score, prev ? prev.best : 0), last: score, date: Date.now() };
        store.save();
        return {
          html: prev && score > prev.best ? '<p><b style="color:var(--ok)">שיא אישי חדש!</b></p>' : '',
          buttons: `<button class="btn ghost" data-go="#quiz/${ch.id}">לנסות שוב</button>` +
            (nextCh ? `<button class="btn" data-go="#ch/${nextCh.id}">לפרק הבא: ${nextCh.title} ${ICONS.next}</button>` : `<button class="btn amber" data-go="#exam">למבחן המסכם ${ICONS.next}</button>`)
        };
      }
    });
  }

  /* ---------- מבחן מסכם ---------- */
  let examRun = null;
  function renderExamIntro() {
    if (examRun) { examRun.stop(); examRun = null; }
    const el = views.exam;
    const hist = store.d.exams.slice().reverse();
    const best = hist.length ? Math.max(...hist.map(h => h.pct)) : null;
    el.innerHTML = `<div class="exam-intro">
      <div class="card">
        <span class="eyebrow">FINAL TEST</span>
        <h2 style="font-size:28px">מבחן מסכם – תנועת הרכב</h2>
        <p>המבחן כולל שאלות מכל חמשת הפרקים: בחירה מתוך ארבע אפשרויות ושאלות חישוב. אחרי כל שאלה תראו מיד אם צדקתם ואת הפתרון המלא.</p>
        <div class="rules">
          <div><b>20</b><span>שאלות</span></div>
          <div><b>1</b><span>ניסיון לכל שאלה</span></div>
          <div><b>~30</b><span>דקות</span></div>
        </div>
        <div class="tip">${ICONS.tip}<div>הכינו מחשבון, דף וכלי כתיבה. זכרו: <span class="num">g = 10 m/s²</span>, <span class="num">ρ = 1.2 kg/m³</span>, ולהמיר קמ"ש ל־<span class="num">m/s</span>.</div></div>
        <div class="field"><label for="stname"><b>שם התלמיד/ה</b> (יופיע בתוצאות)</label><input id="stname" value="${store.d.name || ''}" placeholder="שם מלא"></div>
        <button class="btn amber" id="startExam">התחלת המבחן ${ICONS.next}</button>
      </div>
      ${hist.length ? `<div class="card history"><h3 style="font-size:18px">התוצאות שלי ${best != null ? `<span class="badge ok">הציון הגבוה: ${best}%</span>` : ''}</h3>
        <div class="table-wrap"><table class="data-table"><thead><tr><th>תאריך</th><th>שם</th><th>ציון</th><th>זמן</th></tr></thead>
        <tbody>${hist.map(h => `<tr><td class="num">${new Date(h.date).toLocaleDateString('he-IL')} ${new Date(h.date).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}</td><td>${h.name || '—'}</td><td class="num"><b>${h.pct}%</b></td><td class="num">${h.time}</td></tr>`).join('')}</tbody></table></div></div>` : ''}
    </div>`;
    $('#startExam').addEventListener('click', () => {
      const name = $('#stname').value.trim();
      store.d.name = name; store.save();
      startExam(name);
    });
  }
  function startExam(name) {
    // בחירה מאוזנת: לפחות 2 שאלות מכל נושא, השאר באקראי
    const byT = {};
    FINAL_POOL.forEach(q => (byT[q.topic] = byT[q.topic] || []).push(q));
    let picked = [];
    Object.values(byT).forEach(arr => picked.push(...shuffle(arr).slice(0, 2)));
    const rest = shuffle(FINAL_POOL.filter(q => !picked.includes(q)));
    picked = picked.concat(rest.slice(0, 20 - picked.length));
    picked.sort((a, b) => a.topic - b.topic || Math.random() - .5);
    examRun = runQuiz(picked, {
      mode: 'exam', title: 'מבחן מסכם' + (name ? ' · ' + name : ''), container: views.exam,
      onFinish({ score, pct, res, time }) {
        const topics = {};
        picked.forEach((q, k) => { const t = topics[q.topic] = topics[q.topic] || { s: 0, n: 0 }; t.s += res[k] || 0; t.n++; });
        store.d.exams.push({ date: Date.now(), name, score, pct, time });
        store.save();
        const weak = Object.entries(topics).filter(([, t]) => t.s / t.n < 0.6).map(([k]) => +k);
        const bars = Object.entries(topics).map(([k, t]) => {
          const p = Math.round(t.s / t.n * 100);
          return `<div class="tb"><span>${TOPIC_NAMES[k]}</span><div class="bar"><i class="${p < 60 ? 'low' : ''}" style="width:${Math.max(p, 2)}%"></i></div><span class="pc">${t.s}/${t.n}</span></div>`;
        }).join('');
        return {
          html: `${name ? `<p><b>${name}</b> · ${new Date().toLocaleDateString('he-IL')}</p>` : ''}
            <div class="topic-bars"><b>הצלחה לפי נושא</b>${bars}</div>
            ${weak.length ? `<div class="tip" style="margin-top:16px;text-align:start">${ICONS.tip}<div>מומלץ לחזור על: ${weak.map(t => `<a href="#ch/ch${t}" style="color:var(--teal);font-weight:600">פרק ${t} – ${TOPIC_NAMES[t]}</a>`).join(' · ')}</div></div>` : ''}`,
          buttons: `<button class="btn" data-go="#exam">חזרה לעמוד המבחן</button><button class="btn ghost" id="printRes">הדפסה / שמירה כ־PDF</button>`,
          bind(el) { const p = $('#printRes', el); if (p) p.addEventListener('click', () => window.print()); }
        };
      }
    });
  }

  /* ---------- סימולטור ---------- */
  const SURFACES = [['אספלט חלק', 0.012], ['אספלט רגיל', 0.015], ['בטון', 0.012], ['כביש חצץ', 0.02], ['דרך עפר', 0.05], ['חול', 0.2]];
  const PRESETS = {
    'רכב קטן': { m: 1000, L: 2.4, a: 0.95, cd: 0.32, A: 2.0 },
    'רכב משפחתי': { m: 1400, L: 2.7, a: 1.05, cd: 0.30, A: 2.2 },
    'רכב שטח': { m: 2100, L: 2.85, a: 1.3, cd: 0.40, A: 2.8 },
    'מסחרית': { m: 2800, L: 3.3, a: 1.45, cd: 0.45, A: 3.6 }
  };
  const H_CG = 0.55;
  const sim = { m: 1400, L: 2.7, a: 1.05, s: 0, v: 72, cd: 0.30, A: 2.2, f: 0.015, showStatic: true, showRes: true, showDims: true };
  let simReady = false;

  function initSim() {
    if (simReady) { drawSim(); return; }
    simReady = true;
    const el = views.sim;
    const ctrl = (id, label, unit, min, max, step, val, dec) => `<div class="ctrl"><div class="ctrl-row"><label for="${id}">${label} <small>${unit}</small></label><output id="${id}-o"></output></div>
      <input type="range" id="${id}" min="${min}" max="${max}" step="${step}" value="${val}" data-dec="${dec}"></div>`;
    el.innerHTML = `
      <div class="section-title" style="margin-top:4px"><h2>סימולטור כוחות</h2><span>שנו נתונים וראו מה קורה לכוחות</span></div>
      <div class="sim-layout">
        <div class="card controls">
          <h3>סוג רכב</h3>
          <div class="presets">${Object.keys(PRESETS).map(k => `<button data-preset="${k}">${k}</button>`).join('')}</div>
          <div class="group-label">הרכב</div>
          ${ctrl('m', 'מסה', 'm [kg]', 800, 3500, 50, sim.m, 0)}
          ${ctrl('L', 'בסיס גלגלים', 'L [m]', 2.2, 3.6, 0.05, sim.L, 2)}
          ${ctrl('a', 'מרכז כובד ← סרן קדמי', 'a [m]', 0.5, 2.2, 0.05, sim.a, 2)}
          <div class="group-label">הדרך</div>
          ${ctrl('s', 'שיפוע', 's [%]', -15, 20, 1, sim.s, 0)}
          <div class="ctrl"><div class="ctrl-row"><label for="surf">סוג הדרך</label><output id="surf-o"></output></div>
            <select id="surf">${SURFACES.map((x, i) => `<option value="${i}" ${x[0] === 'אספלט רגיל' ? 'selected' : ''}>${x[0]} (f = ${x[1]})</option>`).join('')}</select></div>
          <div class="group-label">נסיעה ואווירודינמיקה</div>
          ${ctrl('v', 'מהירות', 'v [km/h]', 0, 180, 5, sim.v, 0)}
          ${ctrl('cd', 'מקדם גרר', 'Cd', 0.2, 0.9, 0.01, sim.cd, 2)}
          ${ctrl('A', 'שטח חזית', 'A [m²]', 1.5, 4.5, 0.1, sim.A, 1)}
        </div>
        <div>
          <div class="card stage">
            <div class="stage-top">
              <div class="legend">
                <span><i style="background:${COLORS.G}"></i>משקל G</span>
                <span><i style="background:${COLORS.R}"></i>תגובות R</span>
                <span><i style="background:${COLORS.roll}"></i>גלגול F<sub>r</sub></span>
                <span><i style="background:${COLORS.slope}"></i>שיפוע F<sub>s</sub></span>
                <span><i style="background:${COLORS.air}"></i>אוויר F<sub>a</sub></span>
              </div>
              <div class="toggles">
                <label><input type="checkbox" id="tStatic" checked> עומסים</label>
                <label><input type="checkbox" id="tRes" checked> התנגדויות</label>
                <label><input type="checkbox" id="tDims" checked> מידות</label>
              </div>
            </div>
            <div class="scene-wrap" id="simScene"></div>
            <div class="readouts" id="readouts"></div>
          </div>
          <div class="charts">
            <div class="card chart-card">
              <h4>ממה מורכבת ההתנגדות?</h4>
              <div class="sub">חלקו של כל כוח בהתנגדות הכוללת</div>
              <div class="stackbar" id="stack"></div>
              <div class="share-list" id="shares"></div>
            </div>
            <div class="card chart-card">
              <h4>התנגדות לפי מהירות</h4>
              <div class="sub">אותו רכב ואותה דרך, במהירויות 0–180 קמ"ש. הקו המקווקו = המהירות שבחרתם.</div>
              <div class="linechart" id="lineChart"></div>
            </div>
          </div>
          <div class="card explore">
            <h4 style="font-size:17px">משימות חקר</h4>
            <ol>
              <li>הזיזו את מרכז הכובד (a) קדימה ואחורה. מה קורה ל־R<sub>f</sub> ול־R<sub>r</sub>? מה קורה לסכום שלהם?
                <details><summary>בדיקה</summary>כשמרכז הכובד מתקרב לסרן – העומס עליו גדל והעומס על הסרן השני קטן. הסכום נשאר שווה למשקל (בכביש ישר).</details></li>
              <li>בחרו "רכב משפחתי", כביש ישר. העלו את המהירות מ־50 ל־100 קמ"ש. פי כמה גדלה התנגדות האוויר?
                <details><summary>בדיקה</summary>פי 4 – כי המהירות גדלה פי 2 וההתנגדות תלויה ב־v².</details></li>
              <li>מצאו את המהירות שבה התנגדות האוויר שווה להתנגדות לגלגול (כביש ישר, אספלט רגיל).
                <details><summary>בדיקה</summary>ברכב משפחתי – בערך 50–55 קמ"ש. בגרף: נקודת החיתוך בין הקו הכחול לכתום.</details></li>
              <li>הגדירו שיפוע 10%. איזו התנגדות שולטת עכשיו? ומה קורה לעומס על הסרן האחורי?
                <details><summary>בדיקה</summary>ההתנגדות לשיפוע שולטת. בעלייה חלק מהעומס עובר לסרן האחורי (התחתון).</details></li>
              <li>שנו את סוג הדרך לחול. פי כמה גדלה ההתנגדות לגלגול לעומת אספלט רגיל?
                <details><summary>בדיקה</summary>f עולה מ־0.015 ל־0.2 – פי 13 בערך!</details></li>
              <li>הגדירו ירידה של 8%−. מה מראה הסימולטור לגבי F<sub>s</sub> ולגבי ההספק?
                <details><summary>בדיקה</summary>F<sub>s</sub> שלילי – הוא עוזר לתנועה. במהירות נמוכה ההתנגדות הכוללת שלילית: הרכב צריך לבלום ולא להאיץ.</details></li>
            </ol>
          </div>
        </div>
      </div>`;
    ['m', 'L', 'a', 's', 'v', 'cd', 'A'].forEach(id => $('#' + id).addEventListener('input', e => { sim[id] = parseFloat(e.target.value); clearPreset(); drawSim(); }));
    $('#surf').addEventListener('change', e => { sim.f = SURFACES[+e.target.value][1]; drawSim(); });
    $('#tStatic').addEventListener('change', e => { sim.showStatic = e.target.checked; drawSim(); });
    $('#tRes').addEventListener('change', e => { sim.showRes = e.target.checked; drawSim(); });
    $('#tDims').addEventListener('change', e => { sim.showDims = e.target.checked; drawSim(); });
    el.querySelectorAll('[data-preset]').forEach(b => b.addEventListener('click', () => {
      Object.assign(sim, PRESETS[b.dataset.preset]);
      ['m', 'L', 'a', 'cd', 'A'].forEach(id => $('#' + id).value = sim[id]);
      clearPreset(); b.classList.add('on'); drawSim();
    }));
    el.querySelector('[data-preset="רכב משפחתי"]').classList.add('on');
    drawSim();
  }
  function clearPreset() { views.sim.querySelectorAll('[data-preset]').forEach(b => b.classList.remove('on')); }

  function simCalc(p, vKmh) {
    const G = p.m * 10;
    const al = Math.atan(p.s / 100);
    const v = vKmh / 3.6;
    const b = p.L - p.a;
    const Rf = (G * Math.cos(al) * b - G * Math.sin(al) * H_CG) / p.L;
    const Rr = G * Math.cos(al) - Rf;
    const Fr = p.f * G * Math.cos(al);
    const Fs = G * Math.sin(al);
    const Fa = 0.5 * 1.2 * p.cd * p.A * v * v;
    const tot = Fr + Fs + Fa;
    return { G, al, v, b, Rf, Rr, Fr, Fs, Fa, tot, P: tot * v };
  }

  function drawSim() {
    // הגבלת a לפי L
    const aIn = $('#a');
    aIn.max = (sim.L - 0.5).toFixed(2);
    if (sim.a > sim.L - 0.5) { sim.a = +(sim.L - 0.5).toFixed(2); aIn.value = sim.a; }
    const outs = { m: fmt(sim.m), L: sim.L.toFixed(2), a: `${sim.a.toFixed(2)}  (b=${(sim.L - sim.a).toFixed(2)})`, s: `${sim.s}%`, v: `${sim.v}  (${(sim.v / 3.6).toFixed(1)} m/s)`, cd: sim.cd.toFixed(2), A: sim.A.toFixed(1) };
    Object.entries(outs).forEach(([k, t]) => $('#' + k + '-o').textContent = t);
    $('#surf-o').textContent = 'f = ' + sim.f;

    const c = simCalc(sim, sim.v);
    const deg = c.al * 180 / Math.PI;
    const maxRes = Math.max(800, c.Fr, Math.abs(c.Fs), c.Fa);
    $('#simScene').innerHTML = scene({
      w: 640, h: 380, alpha: deg, aRatio: sim.a / sim.L, speed: sim.v, pivotY: 250,
      show: { G: sim.showStatic, R: sim.showStatic, dims: sim.showDims, Fa: sim.showRes && c.Fa > 1, Fr: sim.showRes, Fs: sim.showRes, wind: sim.v > 0, cg: true },
      v: { G: c.G, Gc: c.G, Rf: c.Rf, Rr: c.Rr, Fa: c.Fa, Fr: c.Fr, Fs: c.Fs },
      gLen: 90, fScale: 150 / maxRes,
      lab: {
        G: `G=${fmt(c.G)} N`, Rf: `R<tspan font-size="11" dy="4">f</tspan><tspan dy="-4">=${fmt(c.Rf)}</tspan>`, Rr: `R<tspan font-size="11" dy="4">r</tspan><tspan dy="-4">=${fmt(c.Rr)}</tspan>`,
        Fa: `${fmt(c.Fa)} N`, Fr: `${fmt(c.Fr)} N`, Fs: `${fmt(Math.abs(c.Fs))} N`,
        L: `L=${sim.L.toFixed(2)} m`, a: `a=${sim.a.toFixed(2)}`, b: `b=${(sim.L - sim.a).toFixed(2)}`
      },
      aria: 'סימולציה של רכב והכוחות הפועלים עליו'
    });

    const pctF = Math.round(c.Rf / (c.Rf + c.Rr) * 100);
    const card = (name, col, val, unit, subt, cls = '') => `<div class="readout ${cls}"><div class="r-name">${col ? `<i style="background:${col}"></i>` : ''}${name}</div><div class="r-val">${val}<small>${unit}</small></div><div class="r-sub">${subt || '&nbsp;'}</div></div>`;
    $('#readouts').innerHTML =
      card('משקל G', COLORS.G, fmt(c.G), 'N', `m·g = ${fmt(sim.m)}·10`) +
      card('סרן קדמי R<sub>f</sub>', COLORS.R, fmt(c.Rf), 'N', `${pctF}%`) +
      card('סרן אחורי R<sub>r</sub>', COLORS.R, fmt(c.Rr), 'N', `${100 - pctF}%`) +
      card('זווית שיפוע', '', deg.toFixed(2), '°', `tan⁻¹(${sim.s}/100)`) +
      card('גלגול F<sub>r</sub>', COLORS.roll, fmt(c.Fr), 'N', `f·G·cosα`) +
      card('שיפוע F<sub>s</sub>', COLORS.slope, fmt(c.Fs), 'N', c.Fs < 0 ? 'ירידה – עוזר לתנועה' : 'G·sinα') +
      card('אוויר F<sub>a</sub>', COLORS.air, fmt(c.Fa), 'N', `½·1.2·Cd·A·v²`) +
      card('התנגדות כוללת', '', fmt(c.tot), 'N', c.P > 0 ? `P = ${(c.P / 1000).toFixed(1)} kW` : 'נדרשת בלימה', 'total');

    // פס מוערם
    const parts = [['גלגול', c.Fr, COLORS.roll], ['שיפוע', c.Fs, COLORS.slope], ['אוויר', c.Fa, COLORS.air]];
    const posSum = parts.reduce((s, p) => s + Math.max(0, p[1]), 0) || 1;
    const dom = parts.reduce((a, b) => (b[1] > a[1] ? b : a));
    $('#stack').innerHTML = parts.filter(p => p[1] > 0).map(p => `<div title="${p[0]}: ${fmt(p[1])} N" style="width:${p[1] / posSum * 100}%;background:${p[2]}"></div>`).join('');
    $('#shares').innerHTML = parts.map(p => `<div class="${p === dom ? 'dom' : ''}"><i style="background:${p[2]}"></i>${p[0]}${p === dom ? ' – שולטת' : ''}<span class="pct">${p[1] < 0 ? `${fmt(p[1])} N (עוזר)` : `${fmt(p[1])} N · ${Math.round(p[1] / posSum * 100)}%`}</span></div>`).join('');

    drawLineChart(c);
  }

  function drawLineChart(cur) {
    const W = 640, H = 300, ml = 62, mr = 64, mt = 14, mb = 40;
    const speeds = []; for (let k = 0; k <= 180; k += 5) speeds.push(k);
    const data = speeds.map(s => ({ s, ...simCalc(sim, s) }));
    const series = [
      { key: 'Fr', name: 'גלגול', col: COLORS.roll, w: 2 },
      { key: 'Fs', name: 'שיפוע', col: COLORS.slope, w: 2 },
      { key: 'Fa', name: 'אוויר', col: COLORS.air, w: 2 },
      { key: 'tot', name: 'סה"כ', col: COLORS.ink, w: 3 }
    ];
    const all = data.flatMap(d => series.map(x => d[x.key]));
    let yMin = Math.min(0, ...all), yMax = Math.max(...all, 100);
    const niceStep = r => { const p = Math.pow(10, Math.floor(Math.log10(r / 5))); const n = r / 5 / p; return (n < 1.5 ? 1 : n < 3.5 ? 2 : n < 7.5 ? 5 : 10) * p; };
    const step = niceStep(yMax - yMin);
    yMin = Math.floor(yMin / step) * step; yMax = Math.ceil(yMax / step) * step;
    const X = s => ml + (s / 180) * (W - ml - mr);
    const Y = v => mt + (1 - (v - yMin) / (yMax - yMin)) * (H - mt - mb);
    let g = `<svg viewBox="0 0 ${W} ${H}" direction="ltr" role="img" aria-label="גרף התנגדות לפי מהירות">`;
    for (let v = yMin; v <= yMax + 1e-6; v += step) {
      g += `<line x1="${ml}" x2="${W - mr}" y1="${Y(v)}" y2="${Y(v)}" stroke="${v === 0 ? '#c3c2b7' : '#e9e6de'}" stroke-width="1"/>`;
      g += `<text x="${ml - 8}" y="${Y(v) + 4}" text-anchor="end" font-size="13" fill="#898781" font-family="IBM Plex Mono,monospace">${fmt(v)}</text>`;
    }
    for (let s = 0; s <= 180; s += 30) g += `<text x="${X(s)}" y="${H - mb + 18}" text-anchor="middle" font-size="13" fill="#898781" font-family="IBM Plex Mono,monospace">${s}</text>`;
    g += `<text x="${(ml + W - mr) / 2}" y="${H - 4}" text-anchor="middle" font-size="13" fill="#52514e" direction="rtl">מהירות [km/h]</text>`;
    g += `<text x="14" y="${(mt + H - mb) / 2}" font-size="13" fill="#52514e" transform="rotate(-90 14 ${(mt + H - mb) / 2})" text-anchor="middle" direction="rtl">כוח [N]</text>`;
    // קו המהירות הנבחרת
    g += `<line x1="${X(sim.v)}" x2="${X(sim.v)}" y1="${mt}" y2="${H - mb}" stroke="#16323A" stroke-dasharray="4 4" stroke-width="1.2"/>`;
    series.forEach(sr => {
      g += `<path d="${data.map((d, k) => `${k ? 'L' : 'M'}${X(d.s).toFixed(1)},${Y(d[sr.key]).toFixed(1)}`).join('')}" fill="none" stroke="${sr.col}" stroke-width="${sr.w}" stroke-linejoin="round" stroke-linecap="round"/>`;
    });
    // תוויות ישירות בקצה הקווים, עם מניעת חפיפה
    const ends = series.map(sr => ({ sr, y: Y(data[data.length - 1][sr.key]) })).sort((a, b) => a.y - b.y);
    for (let k = 1; k < ends.length; k++) if (ends[k].y - ends[k - 1].y < 15) ends[k].y = ends[k - 1].y + 15;
    ends.forEach(e => g += `<text x="${W - mr + 6}" y="${e.y + 4}" font-size="12.5" fill="#1D2A31" font-weight="${e.sr.key === 'tot' ? 700 : 500}"><tspan fill="${e.sr.col}">■</tspan> ${e.sr.name}</text>`);
    // נקודות במהירות הנבחרת
    series.forEach(sr => g += `<circle cx="${X(sim.v)}" cy="${Y(cur[sr.key])}" r="5" fill="${sr.col}" stroke="#fff" stroke-width="2"/>`);
    g += `<g id="hover" style="display:none"><line id="hl" y1="${mt}" y2="${H - mb}" stroke="#898781" stroke-width="1"/>${series.map(sr => `<circle data-k="${sr.key}" r="4.5" fill="${sr.col}" stroke="#fff" stroke-width="2"/>`).join('')}</g>`;
    g += `<rect x="${ml}" y="${mt}" width="${W - ml - mr}" height="${H - mt - mb}" fill="transparent" id="hit"/></svg><div class="tooltip" id="tt"></div>`;
    const box = $('#lineChart');
    box.innerHTML = g;
    const svg = $('svg', box), hit = $('#hit', box), tt = $('#tt', box), hv = $('#hover', box);
    const move = ev => {
      const pt = ev.touches ? ev.touches[0] : ev;
      const r = svg.getBoundingClientRect();
      const sx = (pt.clientX - r.left) / r.width * W;
      const s = Math.max(0, Math.min(180, Math.round(((sx - ml) / (W - ml - mr)) * 180 / 5) * 5));
      const d = simCalc(sim, s);
      hv.style.display = '';
      $('#hl', box).setAttribute('x1', X(s)); $('#hl', box).setAttribute('x2', X(s));
      hv.querySelectorAll('circle').forEach(cn => { cn.setAttribute('cx', X(s)); cn.setAttribute('cy', Y(d[cn.dataset.k])); });
      tt.innerHTML = `<div class="tt-h">${s} km/h</div>` + series.slice().reverse().map(sr => `<div class="row"><span><i style="background:${sr.col}"></i>${sr.name}</span><b>${fmt(d[sr.key])} N</b></div>`).join('');
      tt.style.display = 'block';
      const px = X(s) / W * r.width;
      tt.style.left = (px > r.width / 2 ? px - tt.offsetWidth - 12 : px + 12) + 'px';
      tt.style.top = '10px';
    };
    const leave = () => { hv.style.display = 'none'; tt.style.display = 'none'; };
    hit.addEventListener('mousemove', move); hit.addEventListener('touchmove', move, { passive: true }); hit.addEventListener('touchstart', move, { passive: true });
    hit.addEventListener('mouseleave', leave); hit.addEventListener('touchend', leave);
  }

  /* סימון כמו F_r בתוך משפט עברי: עוטפים את האות והכתב התחתי כדי שלא יתהפכו */
  function fixBidi(root) {
    root.querySelectorAll('sub').forEach(s => {
      if (s.closest('svg,.ltr,.num,.f-main,.calc,code,.given')) return;
      const p = s.previousSibling;
      if (!p || p.nodeType !== 3) return;
      const m = p.data.match(/([A-Za-zΣ]+)$/);
      if (!m) return;
      p.data = p.data.slice(0, -m[1].length);
      const w = document.createElement('span');
      w.className = 'ltr'; w.textContent = m[1];
      s.parentNode.insertBefore(w, s); w.appendChild(s);
    });
  }
  new MutationObserver(muts => muts.forEach(m => m.addedNodes.forEach(n => { if (n.nodeType === 1) fixBidi(n); })))
    .observe(document.querySelector('main'), { childList: true, subtree: true });

  route();
})();
